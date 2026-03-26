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
            `SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = :email LIMIT 1`,
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

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            username: user.name || 'User',
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('🔥 Login Error:', err.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
});


module.exports = router;