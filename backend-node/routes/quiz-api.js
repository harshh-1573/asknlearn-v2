const express = require('express');

module.exports = ({ sequelize, QueryTypes, writeErrorLog }) => {
    const router = express.Router();

    router.get('/subjects', async (_req, res) => {
        try {
            const subjects = await sequelize.query(
                `SELECT id, name FROM subjects ORDER BY name ASC`,
                { type: QueryTypes.SELECT }
            );
            return res.json(subjects);
        } catch (error) {
            writeErrorLog('SUBJECTS_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load subjects' });
        }
    });

    router.get('/questions/:subjectId', async (req, res) => {
        try {
            const subjectId = parseInt(req.params.subjectId, 10);
            const limit = parseInt(req.query.limit, 10) || 10;
            if (Number.isNaN(subjectId)) return res.status(400).json({ error: 'Invalid subjectId' });

            const questions = await sequelize.query(
                `SELECT
                    COALESCE(question_id, id) AS question_id,
                    subject_id,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    LOWER(correct_option) AS correct_answer,
                    explanation,
                    COALESCE(difficulty, 'medium') AS difficulty
                 FROM questions
                 WHERE subject_id = :subjectId
                 ORDER BY
                    CASE
                       WHEN :bias = 'foundation' AND difficulty = 'foundation' THEN 1
                       WHEN :bias = 'foundation' AND difficulty = 'medium' THEN 2
                       WHEN :bias = 'foundation' AND difficulty = 'advanced' THEN 3
                       ELSE RAND()
                    END ASC, RAND()
                 LIMIT :limit`,
                {
                    replacements: { subjectId, limit, bias: String(req.query.bias || '') },
                    type: QueryTypes.SELECT,
                }
            );

            return res.json(questions);
        } catch (error) {
            writeErrorLog('QUESTIONS_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load questions' });
        }
    });

    router.get('/questions/adaptive/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const weakSubjects = await sequelize.query(
                `SELECT subject_id
                 FROM user_topic_performance
                 WHERE user_id = :userId AND total_attempts > 0
                 ORDER BY (total_correct / total_attempts) ASC
                 LIMIT 3`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );

            let subjectIds = weakSubjects.map((row) => row.subject_id);
            if (subjectIds.length === 0) {
                const allSubjects = await sequelize.query(
                    `SELECT id FROM subjects ORDER BY RAND() LIMIT 3`,
                    { type: QueryTypes.SELECT }
                );
                subjectIds = allSubjects.map((row) => row.id);
            }

            if (subjectIds.length === 0) return res.json([]);

            const questions = await sequelize.query(
                `SELECT
                    COALESCE(question_id, id) AS question_id,
                    subject_id,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    LOWER(correct_option) AS correct_answer,
                    explanation,
                    COALESCE(difficulty, 'medium') AS difficulty
                 FROM questions
                 WHERE subject_id IN (:subjectIds)
                 ORDER BY RAND()
                 LIMIT 15`,
                { replacements: { subjectIds }, type: QueryTypes.SELECT }
            );

            return res.json(questions);
        } catch (error) {
            writeErrorLog('ADAPTIVE_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load adaptive questions' });
        }
    });

    router.get('/cs-quiz/dashboard/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const [subjects, statsRow, history, progress, heatmapRow] = await Promise.all([
                sequelize.query(
                    `SELECT
                        s.id,
                        s.name,
                        COUNT(q.id) AS question_count
                     FROM subjects s
                     LEFT JOIN questions q ON q.subject_id = s.id
                     GROUP BY s.id, s.name
                     ORDER BY s.name ASC`,
                    { type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT
                        COUNT(*) AS total_quizzes,
                        COALESCE(SUM(score), 0) AS total_score,
                        COALESCE(SUM(total_questions), 0) AS total_questions,
                        COALESCE(ROUND((SUM(score) / NULLIF(SUM(total_questions), 0)) * 100, 1), 0) AS average_percentage,
                        COALESCE(MAX(ROUND((score / NULLIF(total_questions, 0)) * 100, 1)), 0) AS best_percentage
                     FROM user_scores
                     WHERE user_id = :userId`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT
                        us.session_id,
                        us.subject_id,
                        s.name AS subject_name,
                        us.score,
                        us.total_questions,
                        ROUND((us.score / NULLIF(us.total_questions, 0)) * 100, 1) AS percentage,
                        us.timestamp
                     FROM user_scores us
                     LEFT JOIN subjects s ON s.id = us.subject_id
                     WHERE us.user_id = :userId
                     ORDER BY us.timestamp DESC
                     LIMIT 20`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT
                        up.subject_id,
                        s.name AS subject_name,
                        up.last_question_id,
                        up.session_id
                     FROM user_progress up
                     LEFT JOIN subjects s ON s.id = up.subject_id
                     WHERE up.user_id = :userId
                     ORDER BY up.subject_id ASC`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
                sequelize.query(
                    `SELECT
                        subject_id,
                        COUNT(*) as total_attempts,
                        COALESCE(ROUND((SUM(score) / NULLIF(SUM(total_questions), 0)) * 100, 1), 0) AS average_percentage,
                        COALESCE(MAX(ROUND((score / NULLIF(total_questions, 0)) * 100, 1)), 0) AS best_percentage
                     FROM user_scores
                     WHERE user_id = :userId
                     GROUP BY subject_id`,
                    { replacements: { userId }, type: QueryTypes.SELECT }
                ),
            ]);

            return res.json({
                subjects,
                stats: statsRow[0] || {
                    total_quizzes: 0,
                    total_score: 0,
                    total_questions: 0,
                    average_percentage: 0,
                    best_percentage: 0,
                },
                history,
                progress,
                heatmap: heatmapRow || [],
            });
        } catch (error) {
            writeErrorLog('DASHBOARD_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load quiz dashboard' });
        }
    });

    router.post('/submit-quiz', async (req, res) => {
        const { userId, subjectId, quizSessionId, results, mode } = req.body;
        if (!results || !results.length) return res.status(400).json({ error: 'No data submitted' });

        const numericUserId = parseInt(userId, 10);
        const numericSubjectId = parseInt(subjectId, 10);
        if (Number.isNaN(numericUserId) || Number.isNaN(numericSubjectId)) {
            return res.status(400).json({ error: 'Invalid userId or subjectId' });
        }

        const transaction = await sequelize.transaction();

        try {
            const users = await sequelize.query(
                `SELECT email FROM users WHERE id = :userId LIMIT 1`,
                { replacements: { userId: numericUserId }, type: QueryTypes.SELECT, transaction }
            );

            const email = users[0]?.email || null;
            const score = results.filter((result) => Boolean(result.is_correct)).length;
            const totalQuestions = results.length;
            const lastQuestionId = results[results.length - 1]?.question_id || null;

            const responseValues = results.map((result) => (
                `(${sequelize.escape(numericUserId)}, ${sequelize.escape(Number(result.question_id) || 0)}, ${sequelize.escape(String(result.selected_option || '').toUpperCase())}, ${sequelize.escape(Boolean(result.is_correct))}, ${sequelize.escape(String(quizSessionId || ''))})`
            )).join(',');

            await sequelize.query(
                `INSERT INTO user_responses (user_id, question_id, selected_option, is_correct, session_id)
                 VALUES ${responseValues}`,
                { type: QueryTypes.INSERT, transaction }
            );

            await sequelize.query(
                `INSERT INTO user_scores (email, user_id, subject_id, score, total_questions, session_id)
                 VALUES (:email, :userId, :subjectId, :score, :totalQuestions, :sessionId)`,
                {
                    replacements: {
                        email,
                        userId: numericUserId,
                        subjectId: numericSubjectId,
                        score,
                        totalQuestions,
                        sessionId: String(quizSessionId || ''),
                    },
                    type: QueryTypes.INSERT,
                    transaction,
                }
            );

            await sequelize.query(
                `DELETE FROM user_progress WHERE user_id = :userId AND subject_id = :subjectId`,
                {
                    replacements: { userId: numericUserId, subjectId: numericSubjectId },
                    type: QueryTypes.DELETE,
                    transaction,
                }
            );

            await sequelize.query(
                `INSERT INTO user_progress (user_id, email, subject_id, last_question_id, session_id)
                 VALUES (:userId, :email, :subjectId, :lastQuestionId, :sessionId)`,
                {
                    replacements: {
                        userId: numericUserId,
                        email,
                        subjectId: numericSubjectId,
                        lastQuestionId,
                        sessionId: String(quizSessionId || ''),
                    },
                    type: QueryTypes.INSERT,
                    transaction,
                }
            );

            const incorrectQuestions = totalQuestions - score;
            const penalty = mode === 'exam' ? incorrectQuestions * 1 : 0;
            const xpEarned = (score * 10) - penalty;

            await sequelize.query(
                `UPDATE users SET xp_points = GREATEST(0, COALESCE(xp_points, 0) + :xpEarned) WHERE id = :userId`,
                { replacements: { xpEarned, userId: numericUserId }, type: QueryTypes.UPDATE, transaction }
            );

            if (numericSubjectId > 0) {
                await sequelize.query(
                    `INSERT INTO user_topic_performance (user_id, subject_id, total_attempts, total_correct)
                     VALUES (:userId, :subjectId, :totalQuestions, :score)
                     ON DUPLICATE KEY UPDATE
                        total_attempts = total_attempts + :totalQuestions,
                        total_correct = total_correct + :score`,
                    {
                        replacements: { userId: numericUserId, subjectId: numericSubjectId, totalQuestions, score },
                        type: QueryTypes.INSERT,
                        transaction,
                    }
                );
            }

            await transaction.commit();
            return res.json({ message: 'Scorecard saved!', score, totalQuestions, xpEarned });
        } catch (error) {
            await transaction.rollback();
            writeErrorLog('SUBMIT_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to save results' });
        }
    });

    return router;
};
