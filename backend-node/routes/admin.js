const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });
    if (!JWT_SECRET) return res.status(500).json({ error: 'Server auth secret is not configured' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = (sequelize) => {
    // Top-level stats for dashboard cards
    router.get('/stats', authenticateAdmin, async (req, res) => {
        try {
            const usersCountRow = await sequelize.query(`SELECT COUNT(*) as count FROM users`, { type: QueryTypes.SELECT });
            const materialsCountRow = await sequelize.query(`SELECT COUNT(*) as count FROM study_materials`, { type: QueryTypes.SELECT });
            const quizzesCountRow = await sequelize.query(`SELECT COUNT(*) as count FROM user_scores`, { type: QueryTypes.SELECT });

            return res.json({
                totalUsers: usersCountRow[0].count,
                totalMaterials: materialsCountRow[0].count,
                totalQuizzesTaken: quizzesCountRow[0].count
            });
        } catch (error) {
            console.error('Admin Stats Error:', error);
            res.status(500).json({ error: 'Failed to fetch admin stats' });
        }
    });

    // Fetch all users with some basic stats
    router.get('/users', authenticateAdmin, async (req, res) => {
        try {
            const users = await sequelize.query(
                `SELECT id, name, email, xp_points, streak_count, last_login_date 
                 FROM users ORDER BY id DESC LIMIT 100`,
                { type: QueryTypes.SELECT }
            );
            return res.json({ users });
        } catch (error) {
            console.error('Admin Users Error:', error);
            res.status(500).json({ error: 'Failed to fetch users list' });
        }
    });

    // Edit user endpoint
    router.put('/users/:id', authenticateAdmin, async (req, res) => {
        try {
            const { name, xp_points, streak_count } = req.body;
            await sequelize.query(
                `UPDATE users SET name = :name, xp_points = :xp_points, streak_count = :streak_count WHERE id = :id`,
                {
                    replacements: { id: req.params.id, name, xp_points: xp_points || 0, streak_count: streak_count || 0 },
                    type: QueryTypes.UPDATE
                }
            );
            return res.json({ message: 'User updated successfully' });
        } catch (error) {
            console.error('Admin Update Error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    });

    // Delete user endpoint
    router.delete('/users/:id', authenticateAdmin, async (req, res) => {
        try {
            const id = req.params.id;
            // Handle foreign constraints dynamically if CASCADE was missing
            await sequelize.query(`DELETE FROM user_progress WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);
            await sequelize.query(`DELETE FROM user_scores WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);
            await sequelize.query(`DELETE FROM user_topic_performance WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);
            await sequelize.query(`DELETE FROM chat_messages WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);
            await sequelize.query(`DELETE FROM study_materials WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);
            await sequelize.query(`DELETE FROM ai_chat_history WHERE user_id = :id`, { replacements: { id }, type: QueryTypes.DELETE }).catch(()=>null);

            await sequelize.query(`DELETE FROM users WHERE id = :id`, {
                replacements: { id },
                type: QueryTypes.DELETE
            });
            return res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Admin Delete Error:', error);
            res.status(500).json({ error: 'Failed to delete user: ' + error.message });
        }
    });
    // Get User Detailed Activity
    router.get('/users/:id/activity', authenticateAdmin, async (req, res) => {
        try {
            const id = req.params.id;
            // Fetch Performance (Scores)
            const scores = await sequelize.query(
                `SELECT 
                    s.id,
                    s.score AS raw_score,
                    s.total_questions,
                    COALESCE(ROUND((s.score / NULLIF(s.total_questions, 0)) * 100, 1), 0) AS score,
                    s.timestamp AS date_taken,
                    sub.name AS subject_title 
                 FROM user_scores s 
                 LEFT JOIN subjects sub ON s.subject_id = sub.id 
                 WHERE s.user_id = :id 
                 ORDER BY s.timestamp DESC LIMIT 10`,
                { replacements: { id }, type: QueryTypes.SELECT }
            ).catch((err) => {
                console.error("Admin user activity query error:", err);
                return [];
            });

            // Fetch Achievements (Materials)
            const materials = await sequelize.query(
                `SELECT 
                    id,
                    source_name AS title,
                    filename,
                    created_at AS uploaded_at 
                 FROM study_materials 
                 WHERE user_id = :id 
                 ORDER BY created_at DESC LIMIT 10`,
                { replacements: { id }, type: QueryTypes.SELECT }
            ).catch((err) => {
                console.error("Admin user activity materials query error:", err);
                return [];
            });

            return res.json({ scores, materials });
        } catch (error) {
            console.error('Admin Activity Error:', error);
            res.status(500).json({ error: 'Failed to fetch user activity' });
        }
    });

    const validateQuestion = async (q, index = null) => {
        const prefix = index !== null ? `Row ${index + 1}: ` : '';
        const { subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty } = q;

        if (!subject_id) return `${prefix}Subject is required`;
        const subIdParsed = parseInt(subject_id, 10);
        if (isNaN(subIdParsed)) return `${prefix}Subject ID must be a number`;

        const subjectExists = await sequelize.query(
            `SELECT id FROM subjects WHERE id = :subject_id LIMIT 1`,
            { replacements: { subject_id: subIdParsed }, type: QueryTypes.SELECT }
        );
        if (!subjectExists || subjectExists.length === 0) {
            return `${prefix}Subject ID ${subIdParsed} does not exist`;
        }

        if (!question_text || !String(question_text).trim()) return `${prefix}Question text is required`;
        if (!option_a || !String(option_a).trim()) return `${prefix}Option A is required`;
        if (!option_b || !String(option_b).trim()) return `${prefix}Option B is required`;
        if (!option_c || !String(option_c).trim()) return `${prefix}Option C is required`;
        if (!option_d || !String(option_d).trim()) return `${prefix}Option D is required`;

        if (!correct_option) return `${prefix}Correct option is required`;
        const correctOptUpper = String(correct_option).trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(correctOptUpper)) {
            return `${prefix}Correct option must be A, B, C, or D`;
        }

        if (!explanation || !String(explanation).trim()) return `${prefix}Explanation is required`;

        const diffLower = String(difficulty || 'medium').trim().toLowerCase();
        if (!['foundation', 'medium', 'advanced'].includes(diffLower)) {
            return `${prefix}Difficulty must be foundation, medium, or advanced`;
        }

        return null;
    };

    // Add a single question
    router.post('/questions', authenticateAdmin, async (req, res) => {
        const error = await validateQuestion(req.body);
        if (error) {
            return res.status(400).json({ error });
        }

        try {
            const { subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty } = req.body;
            const subIdParsed = parseInt(subject_id, 10);
            const correctOptUpper = String(correct_option).trim().toUpperCase();
            const diffLower = String(difficulty || 'medium').trim().toLowerCase();

            const [insertResult] = await sequelize.query(
                `INSERT INTO questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
                 VALUES (:subject_id, :question_text, :option_a, :option_b, :option_c, :option_d, :correct_option, :explanation, :difficulty)`,
                {
                    replacements: {
                        subject_id: subIdParsed,
                        question_text: String(question_text).trim(),
                        option_a: String(option_a).trim(),
                        option_b: String(option_b).trim(),
                        option_c: String(option_c).trim(),
                        option_d: String(option_d).trim(),
                        correct_option: correctOptUpper,
                        explanation: String(explanation).trim(),
                        difficulty: diffLower
                    },
                    type: QueryTypes.INSERT
                }
            );

            const insertId = insertResult;
            await sequelize.query(
                `UPDATE questions SET question_id = :insertId WHERE id = :insertId`,
                {
                    replacements: { insertId },
                    type: QueryTypes.UPDATE
                }
            );

            return res.json({ message: 'Question added successfully', id: insertId });
        } catch (error) {
            console.error('Single Question Insertion Error:', error);
            res.status(500).json({ error: 'Database error: ' + error.message });
        }
    });

    // Batch insert questions
    router.post('/questions/batch', authenticateAdmin, async (req, res) => {
        const { questions } = req.body;
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'Questions array is required' });
        }

        // Validate all first
        const errors = [];
        for (let i = 0; i < questions.length; i++) {
            const error = await validateQuestion(questions[i], i);
            if (error) {
                errors.push(error);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        const transaction = await sequelize.transaction();
        try {
            for (const q of questions) {
                const subIdParsed = parseInt(q.subject_id, 10);
                const correctOptUpper = String(q.correct_option).trim().toUpperCase();
                const diffLower = String(q.difficulty || 'medium').trim().toLowerCase();

                const [insertResult] = await sequelize.query(
                    `INSERT INTO questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
                     VALUES (:subject_id, :question_text, :option_a, :option_b, :option_c, :option_d, :correct_option, :explanation, :difficulty)`,
                    {
                        replacements: {
                            subject_id: subIdParsed,
                            question_text: String(q.question_text).trim(),
                            option_a: String(q.option_a).trim(),
                            option_b: String(q.option_b).trim(),
                            option_c: String(q.option_c).trim(),
                            option_d: String(q.option_d).trim(),
                            correct_option: correctOptUpper,
                            explanation: String(q.explanation).trim(),
                            difficulty: diffLower
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    }
                );

                const insertId = insertResult;
                await sequelize.query(
                    `UPDATE questions SET question_id = :insertId WHERE id = :insertId`,
                    {
                        replacements: { insertId },
                        type: QueryTypes.UPDATE,
                        transaction
                    }
                );
            }

            await transaction.commit();
            return res.json({ message: `Successfully inserted ${questions.length} questions` });
        } catch (error) {
            await transaction.rollback();
            console.error('Batch Question Insertion Error:', error);
            res.status(500).json({ error: 'Database error: ' + error.message });
        }
    });

    return router;
};
