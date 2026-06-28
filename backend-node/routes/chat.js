const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');

const router = express.Router();
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const uploadsDir = path.join(__dirname, '..', 'uploads', 'chat');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const sanitizeFileName = (originalName) => {
    const ext = path.extname(originalName || '');
    const base = path.basename(originalName || 'attachment', ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'attachment';
    return `${Date.now()}-${base}${ext}`;
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, sanitizeFileName(file.originalname)),
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

const authenticateChatUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token.' });
    }
    if (!JWT_SECRET) {
        return res.status(500).json({ error: 'Server auth secret is not configured.' });
    }

    try {
        req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        next();
    } catch (_error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = () => {
    router.get('/groups', authenticateChatUser, async (_req, res) => {
        try {
            const groups = await sequelize.query(
                `SELECT id, name, description, created_at
                 FROM chat_groups
                 ORDER BY created_at ASC, id ASC`,
                { type: QueryTypes.SELECT }
            );
            res.json({ groups });
        } catch (error) {
            console.error('Chat groups error:', error);
            res.status(500).json({ error: 'Failed to fetch groups' });
        }
    });

    router.get('/members', authenticateChatUser, async (_req, res) => {
        try {
            // Get admins
            const admins = await sequelize.query(
                `SELECT id, username AS name, 'admin' AS role, 0 AS xp_points, 0 AS streak_count, NULL AS avatar_url, 'System Administrator' AS bio
                 FROM admins`,
                { type: QueryTypes.SELECT }
            );

            // Get students
            const students = await sequelize.query(
                `SELECT id, name, role, xp_points, streak_count, avatar_url, bio
                 FROM users
                 ORDER BY xp_points DESC`,
                { type: QueryTypes.SELECT }
            );

            // Assign ranks to students
            const rankedStudents = students.map((s, index) => ({
                ...s,
                rank: index + 1
            }));

            // Combine both (admins first, then students)
            const allMembers = [...admins, ...rankedStudents];

            return res.json({ members: allMembers });
        } catch (error) {
            console.error('Chat members error:', error);
            return res.status(500).json({ error: 'Failed to fetch chat members' });
        }
    });

    router.get('/groups/:groupId/messages', authenticateChatUser, async (req, res) => {
        try {
            const messages = await sequelize.query(
                `SELECT
                    m.id,
                    m.group_id,
                    m.user_id,
                    m.message,
                    m.created_at,
                    m.attachment_name,
                    m.attachment_url,
                    m.attachment_type,
                    m.attachment_size,
                    COALESCE(m.sender_name, u.name, 'Admin') AS username,
                    COALESCE(m.sender_role, u.role, 'admin') AS role,
                    COALESCE(u.xp_points, 0) AS xp_points,
                    COALESCE(u.streak_count, 0) AS streak_count
                 FROM chat_messages m
                 LEFT JOIN users u ON m.user_id = u.id
                 WHERE m.group_id = :groupId
                 ORDER BY m.created_at ASC, m.id ASC
                 LIMIT 200`,
                { replacements: { groupId: req.params.groupId }, type: QueryTypes.SELECT }
            );
            res.json({ messages });
        } catch (error) {
            console.error('Chat messages error:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    });

    router.post('/upload', authenticateChatUser, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded.' });
            }

            const publicUrl = `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`;

            return res.json({
                attachment: {
                    name: req.file.originalname,
                    url: publicUrl,
                    type: req.file.mimetype || 'application/octet-stream',
                    size: req.file.size || 0,
                    path: req.file.path,
                },
            });
        } catch (error) {
            console.error('Chat upload error:', error);
            return res.status(500).json({ error: 'Failed to upload attachment.' });
        }
    });

    return router;
};
