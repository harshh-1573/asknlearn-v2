const express = require('express');

module.exports = ({ sequelize, QueryTypes, writeErrorLog }) => {
    const router = express.Router();

    router.get('/:userId/xp', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const rows = await sequelize.query(
                `SELECT xp_points FROM users WHERE id = :userId LIMIT 1`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );

            return res.json({ xp_points: rows[0]?.xp_points || 0 });
        } catch (_error) {
            return res.status(500).json({ error: 'Failed to fetch XP' });
        }
    });

    router.post('/:userId/xp', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            const amount = parseInt(req.body.amount, 10) || 10;
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            await sequelize.query(
                `UPDATE users SET xp_points = COALESCE(xp_points, 0) + :amount WHERE id = :userId`,
                { replacements: { userId, amount }, type: QueryTypes.UPDATE }
            );

            const rows = await sequelize.query(
                `SELECT xp_points FROM users WHERE id = :userId LIMIT 1`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );

            return res.json({ xp_points: rows[0]?.xp_points || 0, added: amount });
        } catch (_error) {
            return res.status(500).json({ error: 'Failed to increment XP' });
        }
    });

    router.get('/leaderboard', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit, 10) || 10;
            const users = await sequelize.query(
                `SELECT id, name, xp_points, avatar_url, streak_count FROM users ORDER BY xp_points DESC LIMIT :limit`,
                { replacements: { limit }, type: QueryTypes.SELECT }
            );
            return res.json({ leaderboard: users });
        } catch (error) {
            writeErrorLog('LEADERBOARD_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    });

    router.get('/profile/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const rows = await sequelize.query(
                `SELECT name, email, phone, bio, language, xp_points, streak_count FROM users WHERE id = :userId LIMIT 1`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );

            return res.json({ profile: rows });
        } catch (error) {
            writeErrorLog('PROFILE_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }
    });

    router.put('/profile/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const { name, phone = null, bio = null, language = 'English' } = req.body;
            await sequelize.query(
                `UPDATE users SET name = :name, phone = :phone, bio = :bio, language = :language WHERE id = :userId`,
                { replacements: { userId, name, phone, bio, language }, type: QueryTypes.UPDATE }
            );

            return res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            writeErrorLog('PROFILE_UPDATE_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to update profile' });
        }
    });

    router.get('/dashboard-stats/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const [quizStats, aiStats, heatmap] = await Promise.all([
                sequelize.query(
                    `SELECT
                        COUNT(*) AS total_quizzes,
                        COALESCE(SUM(score), 0) AS total_score,
                        COALESCE(SUM(total_questions), 0) AS total_questions
                     FROM user_scores
                     WHERE user_id = :userId`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT COUNT(*) AS total_materials FROM study_materials WHERE user_id = :userId`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT
                        us.subject_id,
                        s.name as subject_name,
                        COUNT(*) as total_attempts,
                        COALESCE(ROUND((SUM(us.score) / NULLIF(SUM(us.total_questions), 0)) * 100, 1), 0) AS average_percentage
                     FROM user_scores us
                     LEFT JOIN subjects s ON s.id = us.subject_id
                     WHERE us.user_id = :userId
                     GROUP BY us.subject_id, s.name`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
            ]);

            return res.json({
                quiz: quizStats[0] || { total_quizzes: 0, total_score: 0, total_questions: 0 },
                ai: aiStats[0] || { total_materials: 0 },
                heatmap: heatmap || [],
            });
        } catch (error) {
            writeErrorLog('DASHBOARD_STATS_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
        }
    });

    return router;
};
