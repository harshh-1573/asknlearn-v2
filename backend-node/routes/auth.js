const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const jwt = require('jsonwebtoken');


// ===============================
// 1. SIGNUP ROUTE
// ===============================
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
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
    const passwordInput = req.body.password ? String(req.body.password).trim() : '';

    if (!emailInput || !passwordInput) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // ✅ FIXED: using password_hash column
        const users = await sequelize.query(
            `SELECT id, name, email, password_hash, role, streak_count, last_login_date FROM users WHERE LOWER(email) = :email LIMIT 1`,
            { replacements: { email: emailInput }, type: QueryTypes.SELECT }
        );

        const user = users.length ? users[0] : null;

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const dbPassword = user.password_hash || '';

        // ✅ Clean bcrypt comparison (no old fallback needed)
        const isMatch = await bcrypt.compare(passwordInput, dbPassword);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

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
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
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
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email and new password are required.' });
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
// 4. CHANGE PASSWORD ROUTE (Profile Settings)
// ===============================
// A simple middleware to verify JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
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

module.exports = router;