const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
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
const createAdminRoutes = require('./routes/admin');
const createChatRoutes = require('./routes/chat');
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
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

const parseAllowedOrigins = () => {
    const configured = String(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (configured.length > 0) {
        return configured;
    }
    return [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
};

const allowedOrigins = parseAllowedOrigins();
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        
        // Parse host to check for Vercel/Netlify subdomains
        try {
            const parsedUrl = new URL(origin);
            const hostname = parsedUrl.hostname;
            if (
                hostname === 'vercel.app' || hostname.endsWith('.vercel.app') ||
                hostname === 'netlify.app' || hostname.endsWith('.netlify.app')
            ) {
                return callback(null, true);
            }
        } catch (e) {
            // Fallback to simple endsWith string checks if URL parsing fails
            if (origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
                return callback(null, true);
            }
        }
        
        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
};

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

app.use(helmet());
app.use(compression());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
app.use('/api/admin', createAdminRoutes(sequelize));
app.use('/api', createSystemRoutes({ appVersion: APP_VERSION, serverStartedAt: SERVER_STARTED_AT }));
app.use('/api/chat', createChatRoutes());

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
                CREATE TABLE IF NOT EXISTS admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `,
            success: 'Admin Access Enabled: admins table verified.',
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
        {
            sql: `
                CREATE TABLE IF NOT EXISTS chat_groups (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `,
            success: 'Community Chat Enabled: chat_groups table verified.',
        },
        {
            sql: `
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    group_id INT NOT NULL,
                    user_id INT NOT NULL,
                    sender_name VARCHAR(255) DEFAULT NULL,
                    sender_role VARCHAR(20) DEFAULT NULL,
                    message TEXT NOT NULL,
                    attachment_name VARCHAR(255) DEFAULT NULL,
                    attachment_url TEXT DEFAULT NULL,
                    attachment_type VARCHAR(255) DEFAULT NULL,
                    attachment_size BIGINT DEFAULT NULL,
                    attachment_path TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE
                )
            `,
            success: 'Community Chat Enabled: chat_messages table verified.',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN sender_name VARCHAR(255) DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN sender_role VARCHAR(20) DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255) DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN attachment_type VARCHAR(255) DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN attachment_size BIGINT DEFAULT NULL;',
        },
        {
            sql: 'ALTER TABLE chat_messages ADD COLUMN attachment_path TEXT DEFAULT NULL;',
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

const emitChatError = (socket, error) => {
    socket.emit('chat_error', { error });
};

const verifySocketToken = (token) => {
    if (!JWT_SECRET || !token) {
        return null;
    }
    try {
        return jwt.verify(String(token), JWT_SECRET);
    } catch (_error) {
        return null;
    }
};

const getSocketSenderMeta = async (decoded, fallbackUsername) => {
    if (!decoded) {
        return null;
    }

    if (decoded.role === 'admin') {
        const admins = await sequelize.query(
            `SELECT id, username FROM admins WHERE id = :id LIMIT 1`,
            { replacements: { id: decoded.id }, type: QueryTypes.SELECT }
        );

        return {
            userId: 0,
            username: admins[0]?.username || fallbackUsername || 'Admin',
            role: 'admin',
            xp_points: 0,
            streak_count: 0,
        };
    }

    const users = await sequelize.query(
        `SELECT id, name, role, xp_points, streak_count FROM users WHERE id = :id LIMIT 1`,
        { replacements: { id: decoded.id }, type: QueryTypes.SELECT }
    );

    if (!users.length) {
        return null;
    }

    return {
        userId: users[0].id,
        username: users[0].name || fallbackUsername || 'Student',
        role: users[0].role || 'student',
        xp_points: users[0].xp_points || 0,
        streak_count: users[0].streak_count || 0,
    };
};

const ensureRoomExists = async (groupId) => {
    const groups = await sequelize.query(
        `SELECT id, name, description, created_at FROM chat_groups WHERE id = :groupId LIMIT 1`,
        { replacements: { groupId }, type: QueryTypes.SELECT }
    );
    return groups[0] || null;
};

const deleteAttachmentFile = (filePathValue) => {
    const safePath = String(filePathValue || '').trim();
    if (!safePath) return;
    fs.promises.unlink(safePath).catch(() => null);
};

io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
        socket.join(String(roomId));
    });

    socket.on('send_message', async (data = {}) => {
        try {
            const decoded = verifySocketToken(data.token);
            if (!decoded) {
                return emitChatError(socket, 'Unauthorized chat action.');
            }

            const message = String(data.message || '').trim();
            const groupId = Number(data.groupId);
            const attachment = data.attachment && typeof data.attachment === 'object' ? data.attachment : null;
            if (!groupId || (!message && !attachment)) {
                return emitChatError(socket, 'Add a message or attachment before sending.');
            }

            const room = await ensureRoomExists(groupId);
            if (!room) {
                return emitChatError(socket, 'Chat room not found.');
            }

            const sender = await getSocketSenderMeta(decoded, data.username);
            if (!sender) {
                return emitChatError(socket, 'Unable to resolve sender profile.');
            }

            const insertResult = await sequelize.query(
                `INSERT INTO chat_messages (
                    group_id, user_id, sender_name, sender_role, message,
                    attachment_name, attachment_url, attachment_type, attachment_size, attachment_path
                 )
                 VALUES (
                    :groupId, :userId, :senderName, :senderRole, :message,
                    :attachmentName, :attachmentUrl, :attachmentType, :attachmentSize, :attachmentPath
                 )`,
                {
                    replacements: {
                        groupId,
                        userId: sender.userId,
                        senderName: sender.username,
                        senderRole: sender.role,
                        message,
                        attachmentName: attachment?.name || null,
                        attachmentUrl: attachment?.url || null,
                        attachmentType: attachment?.type || null,
                        attachmentSize: attachment?.size || null,
                        attachmentPath: attachment?.path || null,
                    },
                    type: QueryTypes.INSERT,
                }
            );

            io.to(String(groupId)).emit('receive_message', {
                id: insertResult[0],
                group_id: groupId,
                user_id: sender.userId,
                username: sender.username,
                message,
                role: sender.role,
                xp_points: sender.xp_points,
                streak_count: sender.streak_count,
                attachment_name: attachment?.name || null,
                attachment_url: attachment?.url || null,
                attachment_type: attachment?.type || null,
                attachment_size: attachment?.size || null,
                created_at: new Date(),
            });
        } catch (err) {
            console.error('Socket message save error:', err);
            emitChatError(socket, 'Failed to send message.');
        }
    });

    socket.on('delete_message', async (data = {}) => {
        try {
            const decoded = verifySocketToken(data.token);
            if (!decoded) {
                return emitChatError(socket, 'Unauthorized chat action.');
            }

            const messageId = Number(data.messageId);
            if (!messageId) {
                return emitChatError(socket, 'Message id is required.');
            }

            const messages = await sequelize.query(
                `SELECT id, group_id, user_id, attachment_path FROM chat_messages WHERE id = :messageId LIMIT 1`,
                { replacements: { messageId }, type: QueryTypes.SELECT }
            );
            const message = messages[0];
            if (!message) {
                return emitChatError(socket, 'Message not found.');
            }

            const canDelete = decoded.role === 'admin' || String(message.user_id) === String(decoded.id);
            if (!canDelete) {
                return emitChatError(socket, 'You can only delete your own messages.');
            }

            await sequelize.query(
                `DELETE FROM chat_messages WHERE id = :messageId`,
                { replacements: { messageId }, type: QueryTypes.DELETE }
            );
            deleteAttachmentFile(message.attachment_path);

            io.to(String(message.group_id)).emit('message_deleted', {
                messageId,
                groupId: message.group_id,
            });
        } catch (err) {
            console.error('Socket delete message error:', err);
            emitChatError(socket, 'Failed to delete message.');
        }
    });

    socket.on('create_room', async (data = {}) => {
        try {
            const decoded = verifySocketToken(data.token);
            if (!decoded || decoded.role !== 'admin') {
                return emitChatError(socket, 'Only admins can create community rooms.');
            }

            const name = String(data.name || '').trim();
            const description = String(data.description || '').trim();
            if (!name) {
                return emitChatError(socket, 'Room name is required.');
            }

            const insertResult = await sequelize.query(
                `INSERT INTO chat_groups (name, description) VALUES (:name, :description)`,
                {
                    replacements: { name, description: description || null },
                    type: QueryTypes.INSERT,
                }
            );

            io.emit('room_created', {
                id: insertResult[0],
                name,
                description,
                created_at: new Date(),
            });
        } catch (err) {
            console.error('Socket create room error:', err);
            emitChatError(socket, 'Failed to create room.');
        }
    });

    socket.on('delete_room', async (data = {}) => {
        try {
            const decoded = verifySocketToken(data.token);
            if (!decoded || decoded.role !== 'admin') {
                return emitChatError(socket, 'Only admins can delete community rooms.');
            }

            const groupId = Number(data.groupId);
            if (!groupId) {
                return emitChatError(socket, 'Room id is required.');
            }

            const room = await ensureRoomExists(groupId);
            if (!room) {
                return emitChatError(socket, 'Room not found.');
            }

            const attachments = await sequelize.query(
                `SELECT attachment_path FROM chat_messages WHERE group_id = :groupId AND attachment_path IS NOT NULL`,
                { replacements: { groupId }, type: QueryTypes.SELECT }
            );

            await sequelize.query(
                `DELETE FROM chat_groups WHERE id = :groupId`,
                { replacements: { groupId }, type: QueryTypes.DELETE }
            );
            attachments.forEach((item) => deleteAttachmentFile(item.attachment_path));

            io.emit('room_deleted', { groupId });
        } catch (err) {
            console.error('Socket delete room error:', err);
            emitChatError(socket, 'Failed to delete room.');
        }
    });
});

let expressServer;

sequelize.sync().then(async () => {
    await runStartupMigrations();
    
    // Seed default chat groups if missing
    try {
        const groups = await sequelize.query('SELECT COUNT(*) as c FROM chat_groups', { type: QueryTypes.SELECT });
        if (groups[0].c === 0) {
            await sequelize.query("INSERT INTO chat_groups (name, description) VALUES ('General Chat', 'Welcome to AskNLearn community'), ('CS Doubts', 'Computer science queries here'), ('Math Corner', 'All things math')");
            console.log('✅ Seeded default chat groups.');
        }
    } catch(e) {}

    expressServer = server.listen(PORT, () => console.log(`Quiz Engine running on port ${PORT}`));
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection in backend-node:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception in backend-node:', error);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down backend-node...');
    if (expressServer) {
        return expressServer.close(() => process.exit(0));
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down backend-node...');
    if (expressServer) {
        return expressServer.close(() => process.exit(0));
    }
    process.exit(0);
});
