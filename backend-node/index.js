const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

const sequelize = require('./config/db');
const authRoutes = require('./routes/auth');
const createAiRoutes = require('./routes/ai');
const createQuizApiRoutes = require('./routes/quiz-api');
const createSystemRoutes = require('./routes/system');
const createUserRoutes = require('./routes/user');
const {
    parseStoredJson,
    createWriteErrorLog,
    createEnsureAiChatHistoryTable,
} = require('./utils/server');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5000;
const APP_VERSION = '2026-03-27-dashboard-profile-v1';
const SERVER_STARTED_AT = new Date().toISOString();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const logsDir = path.join(__dirname, 'logs');
const errorLogFile = path.join(logsDir, 'server-errors.log');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const writeErrorLog = createWriteErrorLog(errorLogFile);
const ensureAiChatHistoryTable = createEnsureAiChatHistoryTable(sequelize, QueryTypes);

app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', createAiRoutes({
    sequelize,
    QueryTypes,
    axios,
    FormData,
    upload,
    writeErrorLog,
    parseStoredJson,
    ensureAiChatHistoryTable,
}));
app.use('/api', createQuizApiRoutes({ sequelize, QueryTypes, writeErrorLog }));
app.use('/api/user', createUserRoutes({ sequelize, QueryTypes, writeErrorLog }));
app.use('/api', createSystemRoutes({ appVersion: APP_VERSION, serverStartedAt: SERVER_STARTED_AT }));

app.use((err, req, res, _next) => {
    writeErrorLog('EXPRESS_ERROR', {
        message: err.message,
        path: req.originalUrl,
        method: req.method,
    });
    return res.status(500).json({ error: 'Internal Server Error' });
});

const runStartupMigrations = async () => {
    const statements = [
        {
            sql: 'ALTER TABLE users ADD COLUMN xp_points INT DEFAULT 0;',
            success: 'Gamification Enabled: xp_points column verified in users table.',
        },
        {
            sql: "ALTER TABLE questions ADD COLUMN difficulty VARCHAR(50) DEFAULT 'medium';",
            success: 'Dynamic Difficulty Enabled: difficulty column verified in questions table.',
        },
        {
            sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;',
        },
        {
            sql: "ALTER TABLE users ADD COLUMN language VARCHAR(50) DEFAULT 'English';",
        },
        {
            sql: 'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL;',
            success: 'Profile Management Enabled: profile columns verified in users table.',
        },
        {
            sql: 'ALTER TABLE users ADD COLUMN streak_count INT DEFAULT 0;',
        },
        {
            sql: 'ALTER TABLE users ADD COLUMN last_login_date DATE DEFAULT NULL;',
        },
        {
            sql: "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'student';",
            success: 'Gamification Enabled: streak_count and role columns verified in users table.',
        },
        {
            sql: `
                CREATE TABLE IF NOT EXISTS user_topic_performance (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    subject_id INT NOT NULL,
                    total_attempts INT DEFAULT 0,
                    total_correct INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY user_subject (user_id, subject_id)
                )
            `,
            success: 'Smart Learning Enabled: user_topic_performance table verified.',
        },
    ];

    for (const statement of statements) {
        try {
            await sequelize.query(statement.sql, { type: QueryTypes.RAW });
            if (statement.success) {
                console.log(`✅ ${statement.success}`);
            }
        } catch (_error) {
            // Ignore duplicate-column/table-exists startup noise.
        }
    }
};

sequelize.sync().then(async () => {
    await runStartupMigrations();
    app.listen(PORT, () => console.log(`Quiz Engine running on port ${PORT}`));
});
