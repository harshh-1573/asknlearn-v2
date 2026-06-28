const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

const resetOtpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const loginAttemptStore = new Map();
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

const crypto = require('crypto');
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const getEmailKey = (email) => String(email || '').trim().toLowerCase();

const cleanupExpiredOtp = (emailKey) => {
    const record = resetOtpStore.get(emailKey);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
        resetOtpStore.delete(emailKey);
        return null;
    }
    return record;
};

const isStrongPassword = (password) => {
    const value = String(password || '').trim();
    if (value.length < 8) return false;
    if (!/[a-z]/.test(value)) return false;
    if (!/[A-Z]/.test(value)) return false;
    if (!/[0-9]/.test(value)) return false;
    if (!/[^A-Za-z0-9]/.test(value)) return false;
    return true;
};

const getAttemptKey = (email, ip) => `${getEmailKey(email)}|${String(ip || '')}`;

const getActiveLoginAttempts = (key) => {
    const record = loginAttemptStore.get(key);
    if (!record) return null;
    if (record.windowStart + LOGIN_WINDOW_MS < Date.now()) {
        loginAttemptStore.delete(key);
        return null;
    }
    return record;
};

// ===============================
// 1. SIGNUP ROUTE
// ===============================
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            error: 'Password must be at least 8 chars and include upper, lower, number, and special character.',
        });
    }

    try {
        const emailLower = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await sequelize.query(
            `SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailLower }, type: QueryTypes.SELECT }
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ✅ FIXED: using password_hash column
        await sequelize.query(
            `INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password)`,
            {
                replacements: {
                    name: name.trim(),
                    email: emailLower,
                    password: hashedPassword
                },
                type: QueryTypes.INSERT
            }
        );

        console.log(`👤 New user registered: ${emailLower}`);
        res.status(201).json({ message: 'User registered successfully! You can now login.' });

    } catch (err) {
        console.error('🔥 Signup Error:', err.message);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});


// ===============================
// 2. LOGIN ROUTE
// ===============================
router.post('/login', async (req, res) => {
    const emailInput = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    const passwordInput = req.body.password ? String(req.body.password) : '';
    const attemptKey = getAttemptKey(emailInput, req.ip);
    const activeAttempt = getActiveLoginAttempts(attemptKey);

    if (!emailInput || !passwordInput) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (activeAttempt && activeAttempt.count >= LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({
            error: 'Too many failed login attempts. Please wait a few minutes and try again.',
        });
    }

    try {
        // ✅ FIXED: using password_hash column
        const users = await sequelize.query(
            `SELECT id, name, email, password_hash, role, streak_count, last_login_date FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailInput }, type: QueryTypes.SELECT }
        );

        const user = users.length ? users[0] : null;

        if (!user) {
            const current = getActiveLoginAttempts(attemptKey);
            if (current) {
                current.count += 1;
                loginAttemptStore.set(attemptKey, current);
            } else {
                loginAttemptStore.set(attemptKey, { count: 1, windowStart: Date.now() });
            }
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const dbPassword = user.password_hash || '';

        // ✅ Clean bcrypt comparison (no old fallback needed)
        const isMatch = await bcrypt.compare(passwordInput, dbPassword)
            || (passwordInput !== passwordInput.trim() && await bcrypt.compare(passwordInput.trim(), dbPassword));

        if (!isMatch) {
            const current = getActiveLoginAttempts(attemptKey);
            if (current) {
                current.count += 1;
                loginAttemptStore.set(attemptKey, current);
            } else {
                loginAttemptStore.set(attemptKey, { count: 1, windowStart: Date.now() });
            }
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        loginAttemptStore.delete(attemptKey);

        // --- STREAK TRACKING LOGIC ---
        let updatedStreak = user.streak_count || 0;
        const todayRaw = new Date();
        const todayStr = todayRaw.toISOString().split('T')[0];

        let lastLoginStr = null;
        if (user.last_login_date) {
             const userLastLoginRaw = new Date(user.last_login_date);
             lastLoginStr = userLastLoginRaw.toISOString().split('T')[0];
        }

        const yesterdayRaw = new Date();
        yesterdayRaw.setDate(yesterdayRaw.getDate() - 1);
        const yesterdayStr = yesterdayRaw.toISOString().split('T')[0];

        if (lastLoginStr !== todayStr) {
            if (lastLoginStr === yesterdayStr) {
                updatedStreak += 1;
            } else {
                updatedStreak = 1;
            }
            await sequelize.query(
                `UPDATE users SET last_login_date = :today, streak_count = :streak WHERE id = :userId`,
                { replacements: { today: todayStr, streak: updatedStreak, userId: user.id }, type: QueryTypes.UPDATE }
            );
        }
        // -----------------------------

        // Generate JWT token
        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server auth secret is not configured.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            username: user.name || 'User',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'student',
                streak_count: updatedStreak
            }
        });

    } catch (err) {
        console.error('🔥 Login Error:', err.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


// ===============================
// 3. RESET PASSWORD ROUTE (Forgot Password)
// ===============================
router.post('/reset-password', async (req, res) => {
    return res.status(403).json({ error: 'Legacy unauthenticated reset is disabled for security. Please use OTP reset.' });
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email and new password are required.' });
    }
    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 chars and include upper, lower, number, and special character.',
        });
    }

    try {
        const emailLower = email.trim().toLowerCase();

        // 1. Check if user exists
        const userCheck = await sequelize.query(
            `SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailLower }, type: QueryTypes.SELECT }
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'User not found with that email.' });
        }

        // 2. Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

        // 3. Update password in DB
        await sequelize.query(
            `UPDATE users SET password_hash = :hash WHERE id = :userId`,
            { replacements: { hash: hashedPassword, userId: userCheck[0].id }, type: QueryTypes.UPDATE }
        );

        return res.status(200).json({ success: true, message: 'Password reset successfully.' });

    } catch (err) {
        console.error('🔥 Reset Password Error:', err.message);
        return res.status(500).json({ error: 'Failed to reset password.' });
    }
});

// ===============================
// 3B. REQUEST RESET OTP ROUTE (Forgot Password with OTP)
// ===============================
router.post('/reset-password-old', async (req, res) => {
    const emailKey = getEmailKey(req.body.email);
    const oldPassword = String(req.body.oldPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!emailKey || !oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Email, old password, and new password are required.' });
    }
    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 chars and include upper, lower, number, and special character.',
        });
    }
    if (oldPassword === newPassword) {
        return res.status(400).json({ error: 'New password must be different from old password.' });
    }

    try {
        const users = await sequelize.query(
            `SELECT id, password_hash FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailKey }, type: QueryTypes.SELECT }
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found with that email.' });
        }

        const user = users[0];
        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password_hash || '')
            || (oldPassword !== oldPassword.trim() && await bcrypt.compare(oldPassword.trim(), user.password_hash || ''));
        if (!isOldPasswordCorrect) {
            return res.status(400).json({ error: 'Old password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await sequelize.query(
            `UPDATE users SET password_hash = :hash WHERE id = :userId`,
            { replacements: { hash: hashedPassword, userId: user.id }, type: QueryTypes.UPDATE }
        );

        return res.status(200).json({ success: true, message: 'Password reset successful using old password.' });
    } catch (err) {
        console.error('🔥 Reset Password Old Error:', err.message);
        return res.status(500).json({ error: 'Failed to reset password using old password.' });
    }
});

// ===============================
// 3B. REQUEST RESET OTP ROUTE (Forgot Password with OTP)
// ===============================
router.post('/request-reset-otp', async (req, res) => {
    const emailKey = getEmailKey(req.body.email);

    if (!emailKey) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const userCheck = await sequelize.query(
            `SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailKey }, type: QueryTypes.SELECT }
        );

        if (userCheck.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'If the email exists, OTP has been sent (dev mode: backend terminal).',
            });
        }

        const existing = cleanupExpiredOtp(emailKey);
        if (existing && existing.expiresAt - Date.now() > 60 * 1000) {
            return res.status(429).json({
                error: 'OTP already sent recently. Please wait before requesting another OTP.',
            });
        }

        const otp = generateOtp();
        const expiresAt = Date.now() + OTP_EXPIRY_MS;

        resetOtpStore.set(emailKey, { otp, expiresAt, attempts: 0 });

        console.log(`\n[RESET OTP] ${emailKey} -> ${otp} (valid for 10 minutes)\n`);

        return res.status(200).json({
            success: true,
            message: 'OTP sent. Check backend terminal for OTP (dev mode).',
        });
    } catch (err) {
        console.error('🔥 Request Reset OTP Error:', err.message);
        return res.status(500).json({ error: 'Failed to generate OTP.' });
    }
});

// ===============================
// 3C. RESET PASSWORD USING OTP ROUTE
// ===============================
router.post('/reset-password-otp', async (req, res) => {
    const emailKey = getEmailKey(req.body.email);
    const otpInput = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '').trim();

    if (!emailKey || !otpInput || !newPassword) {
        return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }
    if (!/^\d{6}$/.test(otpInput)) {
        return res.status(400).json({ error: 'OTP must be exactly 6 digits.' });
    }
    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
            error: 'Password must be at least 8 chars and include upper, lower, number, and special character.',
        });
    }

    try {
        const userCheck = await sequelize.query(
            `SELECT id FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailKey }, type: QueryTypes.SELECT }
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'User not found with that email.' });
        }

        const record = cleanupExpiredOtp(emailKey);
        if (!record) {
            return res.status(400).json({ error: 'OTP expired or not found. Request a new OTP.' });
        }

        if (record.attempts >= 5) {
            resetOtpStore.delete(emailKey);
            return res.status(400).json({ error: 'Too many wrong OTP attempts. Request a new OTP.' });
        }

        if (record.otp !== otpInput) {
            record.attempts += 1;
            resetOtpStore.set(emailKey, record);
            return res.status(400).json({ error: 'Invalid OTP.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await sequelize.query(
            `UPDATE users SET password_hash = :hash WHERE id = :userId`,
            { replacements: { hash: hashedPassword, userId: userCheck[0].id }, type: QueryTypes.UPDATE }
        );

        resetOtpStore.delete(emailKey);

        return res.status(200).json({ success: true, message: 'Password reset successfully using OTP.' });
    } catch (err) {
        console.error('🔥 Reset Password OTP Error:', err.message);
        return res.status(500).json({ error: 'Failed to reset password with OTP.' });
    }
});

// ===============================
// 4. CHANGE PASSWORD ROUTE (Profile Settings)
// ===============================
// A simple middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
    if (!JWT_SECRET) {
        return res.status(500).json({ error: 'Server auth secret is not configured.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
};

router.post('/change-password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both current and new passwords are required.' });
    }
    if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
            error: 'New password must be at least 8 chars and include upper, lower, number, and special character.',
        });
    }

    try {
        // 1. Get user's current password hash
        const userQuery = await sequelize.query(
            `SELECT password_hash FROM users WHERE id = :userId LIMIT 1`,
            { replacements: { userId: req.user.id }, type: QueryTypes.SELECT }
        );

        if (userQuery.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const dbHash = userQuery[0].password_hash;

        // 2. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, dbHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }

        // 3. Hash new password & update
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        await sequelize.query(
            `UPDATE users SET password_hash = :hash WHERE id = :userId`,
            { replacements: { hash: newHash, userId: req.user.id }, type: QueryTypes.UPDATE }
        );

        return res.status(200).json({ success: true, message: 'Password changed successfully.' });

    } catch (err) {
        console.error('🔥 Change Password Error:', err.message);
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

// ===============================
// ADMIN LOGIN ROUTE
// ===============================
router.post('/admin/login', async (req, res) => {
    const emailInput = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
    const passwordInput = req.body.password ? String(req.body.password) : '';
    
    if (!emailInput || !passwordInput) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        let admins = await sequelize.query(
            `SELECT id, username, email, password_hash FROM admins WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailInput }, type: QueryTypes.SELECT }
        );

        let admin = admins.length ? { ...admins[0], source: 'admins' } : null;

        // Backward compatibility: older project versions stored admin users in the users table.
        if (!admin) {
            admins = await sequelize.query(
                `SELECT id, name AS username, email, password_hash, role FROM users WHERE LOWER(email) = :email AND role = 'admin' LIMIT 1`,
                { replacements: { email: emailInput }, type: QueryTypes.SELECT }
            );
            admin = admins.length ? { ...admins[0], source: 'users' } : null;
        }

        if (!admin) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(passwordInput, admin.password_hash)
            || (passwordInput !== passwordInput.trim() && await bcrypt.compare(passwordInput.trim(), admin.password_hash));
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server auth secret is not configured.' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin', source: admin.source },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            message: 'Admin login successful',
            token,
            username: admin.username,
            user: {
                id: admin.id,
                email: admin.email,
                role: 'admin'
            }
        });

    } catch (err) {
        console.error('🔥 Admin Login Error:', err.message);
        return res.status(500).json({ error: 'Server error during admin login.' });
    }
});

module.exports = router;
