const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { QueryTypes } = require('sequelize');
const sequelize = require('./config/db');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const logsDir = path.join(__dirname, 'logs');
const errorLogFile = path.join(logsDir, 'server-errors.log');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const AI_CHAT_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    material_id INT NOT NULL,
    role ENUM('user','assistant') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

const writeErrorLog = (label, details) => {
    const line = `[${new Date().toISOString()}] ${label} ${JSON.stringify(details)}\n`;
    try {
        fs.appendFileSync(errorLogFile, line, 'utf8');
    } catch (error) {
        console.error(error);
    }
};

app.use((req, _res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

const ensureAiChatHistoryTable = async () => {
    await sequelize.query(AI_CHAT_HISTORY_TABLE_SQL, { type: QueryTypes.RAW });
};

const parseStoredJson = (value) => {
    let current = value;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            if (typeof current === 'string') {
                const trimmed = current.trim();
                if (!trimmed) return {};
                current = JSON.parse(trimmed);
                continue;
            }
            return current && typeof current === 'object' ? current : {};
        } catch (_error) {
            if (typeof current === 'string') {
                const repaired = current
                    .trim()
                    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
                    .replace(/:\s*'([^']*?)'/g, ': "$1"');
                if (repaired !== current) {
                    current = repaired;
                    continue;
                }
            }
            return {};
        }
    }
    return {};
};

app.use('/api/auth', authRoutes);

app.post('/api/ai/process', upload.single('file'), async (req, res) => {
    const {
        userId,
        subjectId,
        sourceText = '',
        sourceName = '',
        model = 'Gemini',
        language = 'English',
        contentTypes = '["summary","flashcards","mcq"]',
        counts = '{}',
        autoSave = 'false',
    } = req.body;

    const numericUserId = parseInt(userId, 10);
    if (Number.isNaN(numericUserId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }

    const numericSubjectId = subjectId ? parseInt(subjectId, 10) : null;
    const pythonServiceUrl = process.env.AI_PYTHON_URL || 'http://localhost:8000';

    try {
        const payload = new FormData();
        payload.append('model', model);
        payload.append('language', language);
        payload.append('contentTypes', contentTypes);
        payload.append('counts', counts);
        payload.append('sourceText', sourceText);
        payload.append('sourceName', sourceName);

        if (req.file) {
            payload.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype || 'application/octet-stream',
            });
        }

        const aiResponse = await axios.post(`${pythonServiceUrl}/process-file`, payload, {
            headers: payload.getHeaders(),
            timeout: 600000,
        });

        const generatedData = aiResponse.data?.data || {};
        const persistedSourceName = sourceName || req.file?.originalname || 'text-input';
        const persistedFilename = req.file?.originalname || null;
        const extractedContent = aiResponse.data?.source_text || sourceText || null;

        const shouldAutoSave = String(autoSave).toLowerCase() === 'true';
        let materialId = null;
        if (shouldAutoSave) {
            const insertResult = await sequelize.query(
                `INSERT INTO study_materials (user_id, subject_id, filename, content_json, source_name, content)
                 VALUES (:userId, :subjectId, :filename, :contentJson, :sourceName, :content)`,
                {
                    replacements: {
                        userId: numericUserId,
                        subjectId: Number.isNaN(numericSubjectId) ? null : numericSubjectId,
                        filename: persistedFilename,
                        contentJson: JSON.stringify(generatedData),
                        sourceName: persistedSourceName,
                        content: extractedContent,
                    },
                    type: QueryTypes.INSERT,
                }
            );
            materialId = insertResult?.[0] || null;
        }

        return res.json({
            status: 'success',
            data: generatedData,
            sourceName: persistedSourceName,
            materialId,
            sourceText: extractedContent,
            modelUsed: aiResponse.data?.model_used || null,
            saved: shouldAutoSave,
        });
    } catch (error) {
        writeErrorLog('AI_PROCESS_ERROR', { message: error.message, details: error.response?.data });
        return res.status(500).json({
            error: error.response?.data?.detail || error.response?.data?.error || 'AI processing failed',
        });
    }
});

app.post('/api/ai/save-material', async (req, res) => {
    const {
        userId,
        subjectId = null,
        sourceName = 'ai-material',
        filename = null,
        sourceText = '',
        generatedData = {},
    } = req.body || {};

    const numericUserId = parseInt(userId, 10);
    const numericSubjectId = subjectId ? parseInt(subjectId, 10) : null;
    if (Number.isNaN(numericUserId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    if (!generatedData || typeof generatedData !== 'object') {
        return res.status(400).json({ error: 'Invalid generatedData' });
    }

    try {
        const insertResult = await sequelize.query(
            `INSERT INTO study_materials (user_id, subject_id, filename, content_json, source_name, content)
             VALUES (:userId, :subjectId, :filename, :contentJson, :sourceName, :content)`,
            {
                replacements: {
                    userId: numericUserId,
                    subjectId: Number.isNaN(numericSubjectId) ? null : numericSubjectId,
                    filename,
                    contentJson: JSON.stringify(generatedData),
                    sourceName: sourceName || filename || 'ai-material',
                    content: sourceText || null,
                },
                type: QueryTypes.INSERT,
            }
        );

        return res.json({
            status: 'success',
            materialId: insertResult?.[0] || null,
        });
    } catch (error) {
        writeErrorLog('AI_SAVE_MATERIAL_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to save material' });
    }
});

app.get('/api/ai/library/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

    try {
        const rows = await sequelize.query(
            `SELECT id, user_id, subject_id, filename, source_name, content_json, content, created_at
             FROM study_materials
             WHERE user_id = :userId
             ORDER BY created_at DESC
             LIMIT 100`,
            {
                replacements: { userId },
                type: QueryTypes.SELECT,
            }
        );

        const materials = rows.map((row) => {
            const parsed = parseStoredJson(row.content_json);
            return { ...row, content_json: parsed };
        });

        return res.json({ materials });
    } catch (error) {
        writeErrorLog('AI_LIBRARY_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load AI library' });
    }
});

app.get('/api/ai/material/:materialId', async (req, res) => {
    const materialId = parseInt(req.params.materialId, 10);
    const userId = parseInt(req.query.userId, 10);
    if (Number.isNaN(materialId) || Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid materialId or userId' });
    }

    try {
        const rows = await sequelize.query(
            `SELECT id, user_id, subject_id, filename, source_name, content_json, content, created_at
             FROM study_materials
             WHERE id = :materialId AND user_id = :userId
             LIMIT 1`,
            {
                replacements: { materialId, userId },
                type: QueryTypes.SELECT,
            }
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Material not found' });
        }

        const row = rows[0];
        return res.json({
            material: {
                ...row,
                content_json: parseStoredJson(row.content_json),
            },
        });
    } catch (error) {
        writeErrorLog('AI_MATERIAL_FETCH_ERROR', { message: error.message, materialId, userId });
        return res.status(500).json({ error: 'Failed to load saved material' });
    }
});

app.get('/api/ai/dashboard/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

    try {
        const rows = await sequelize.query(
            `SELECT id, source_name, content_json, created_at
             FROM study_materials
             WHERE user_id = :userId
             ORDER BY created_at DESC`,
            {
                replacements: { userId },
                type: QueryTypes.SELECT,
            }
        );

        let totalItems = 0;
        let totalFlashcards = 0;
        let totalMcq = 0;
        let totalWh = 0;
        let totalTrueFalse = 0;
        let totalYesNo = 0;
        let totalFillBlanks = 0;
        let totalMindMaps = 0;
        let totalSummaries = 0;

        const parsedRows = rows.map((row) => {
            const parsed = parseStoredJson(row.content_json);

            const types = Object.keys(parsed);
            if (parsed.summary) totalSummaries += 1;
            if (Array.isArray(parsed.flashcards)) totalFlashcards += parsed.flashcards.length;
            if (Array.isArray(parsed.mcq)) totalMcq += parsed.mcq.length;
            if (Array.isArray(parsed.wh_questions)) totalWh += parsed.wh_questions.length;
            if (Array.isArray(parsed.true_false)) totalTrueFalse += parsed.true_false.length;
            if (Array.isArray(parsed.yes_no)) totalYesNo += parsed.yes_no.length;
            if (Array.isArray(parsed.fill_blanks)) totalFillBlanks += parsed.fill_blanks.length;
            if (parsed.memory_map) totalMindMaps += 1;

            totalItems += types.reduce((acc, key) => {
                const value = parsed[key];
                if (Array.isArray(value)) return acc + value.length;
                if (typeof value === 'string' && value.trim()) return acc + 1;
                return acc;
            }, 0);

            return {
                id: row.id,
                source_name: row.source_name,
                created_at: row.created_at,
                types,
            };
        });

        const history = parsedRows.slice(0, 30);

        return res.json({
            stats: {
                total_materials: rows.length,
                total_generated_items: totalItems,
                total_summaries: totalSummaries,
                total_flashcards: totalFlashcards,
                total_mcq: totalMcq,
                total_wh_questions: totalWh,
                total_true_false: totalTrueFalse,
                total_yes_no: totalYesNo,
                total_fill_blanks: totalFillBlanks,
                total_mind_maps: totalMindMaps,
            },
            history,
        });
    } catch (error) {
        writeErrorLog('AI_DASHBOARD_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load AI dashboard' });
    }
});

app.get('/api/ai/chat-history/:materialId', async (req, res) => {
    const materialId = parseInt(req.params.materialId, 10);
    const userId = parseInt(req.query.userId, 10);

    if (Number.isNaN(materialId) || Number.isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid materialId or userId' });
    }

    try {
        await ensureAiChatHistoryTable();
        const rows = await sequelize.query(
            `SELECT role, message, created_at
             FROM ai_chat_history
             WHERE material_id = :materialId AND user_id = :userId
             ORDER BY created_at ASC, id ASC`,
            {
                replacements: { materialId, userId },
                type: QueryTypes.SELECT,
            }
        );
        return res.json({ history: rows });
    } catch (error) {
        writeErrorLog('AI_CHAT_HISTORY_FETCH_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load chat history' });
    }
});

app.post('/api/ai/chat', async (req, res) => {
    const {
        userId,
        materialId,
        question = '',
        sourceText = '',
        generatedJson = {},
        history = [],
        language = 'English',
    } = req.body || {};

    if (!String(question).trim()) {
        return res.status(400).json({ error: 'Question is required' });
    }
    const numericUserId = parseInt(userId, 10);
    const numericMaterialId = materialId === null || materialId === undefined || materialId === ''
        ? null
        : parseInt(materialId, 10);
    if (Number.isNaN(numericUserId)) {
        return res.status(400).json({ error: 'Invalid userId' });
    }
    if (numericMaterialId !== null && Number.isNaN(numericMaterialId)) {
        return res.status(400).json({ error: 'Invalid materialId' });
    }

    const pythonServiceUrl = process.env.AI_PYTHON_URL || 'http://localhost:8000';

    try {
        if (numericMaterialId !== null) {
            await ensureAiChatHistoryTable();
        }
        const payload = new FormData();
        payload.append('question', String(question));
        payload.append('sourceText', String(sourceText || ''));
        payload.append('generatedJson', JSON.stringify(generatedJson || {}));
        payload.append('history', JSON.stringify(history || []));
        payload.append('language', String(language || 'English'));

        const response = await axios.post(`${pythonServiceUrl}/chat`, payload, {
            headers: payload.getHeaders(),
            timeout: 60000,
        });

        const answer = response.data?.answer || '';
        if (numericMaterialId !== null) {
            const transaction = await sequelize.transaction();
            try {
                await sequelize.query(
                    `INSERT INTO ai_chat_history (user_id, material_id, role, message)
                     VALUES (:userId, :materialId, 'user', :message)`,
                    {
                        replacements: {
                            userId: numericUserId,
                            materialId: numericMaterialId,
                            message: String(question),
                        },
                        type: QueryTypes.INSERT,
                        transaction,
                    }
                );
                await sequelize.query(
                    `INSERT INTO ai_chat_history (user_id, material_id, role, message)
                     VALUES (:userId, :materialId, 'assistant', :message)`,
                    {
                        replacements: {
                            userId: numericUserId,
                            materialId: numericMaterialId,
                            message: String(answer),
                        },
                        type: QueryTypes.INSERT,
                        transaction,
                    }
                );
                await transaction.commit();
            } catch (dbError) {
                await transaction.rollback();
                writeErrorLog('AI_CHAT_HISTORY_SAVE_ERROR', { message: dbError.message });
            }
        }

        return res.json({
            answer,
            modelUsed: response.data?.model_used || null,
        });
    } catch (error) {
        writeErrorLog('AI_CHAT_ERROR', { message: error.message, details: error.response?.data });
        return res.status(500).json({
            error: error.response?.data?.detail || error.response?.data?.error || 'AI chat failed',
        });
    }
});

app.get('/api/subjects', async (_req, res) => {
    try {
        const subjects = await sequelize.query(
            `SELECT
                s.id,
                s.name,
                COUNT(q.id) AS question_count
             FROM subjects s
             LEFT JOIN questions q ON q.subject_id = s.id
             GROUP BY s.id, s.name
             ORDER BY s.name ASC`,
            { type: QueryTypes.SELECT }
        );

        return res.json(subjects);
    } catch (error) {
        writeErrorLog('SUBJECTS_FETCH_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load subjects' });
    }
});

app.get('/api/questions/:subjectId', async (req, res) => {
    try {
        const subjectId = parseInt(req.params.subjectId, 10);
        const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 50));

        if (Number.isNaN(subjectId)) {
            return res.status(400).json({ error: 'Invalid subjectId' });
        }

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
                explanation
             FROM questions
             WHERE subject_id = :subjectId
             ORDER BY RAND()
             LIMIT :limit`,
            {
                replacements: { subjectId, limit },
                type: QueryTypes.SELECT,
            }
        );

        return res.json(questions);
    } catch (error) {
        writeErrorLog('QUESTIONS_FETCH_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load questions' });
    }
});

app.get('/api/cs-quiz/dashboard/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);

        if (Number.isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        const [subjects, statsRow, history, progress] = await Promise.all([
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
                {
                    replacements: { userId },
                    type: QueryTypes.SELECT,
                }
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
                {
                    replacements: { userId },
                    type: QueryTypes.SELECT,
                }
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
                {
                    replacements: { userId },
                    type: QueryTypes.SELECT,
                }
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
        });
    } catch (error) {
        writeErrorLog('DASHBOARD_FETCH_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to load quiz dashboard' });
    }
});

app.post('/api/submit-quiz', async (req, res) => {
    const { userId, subjectId, quizSessionId, results } = req.body;

    if (!results || !results.length) {
        return res.status(400).json({ error: 'No data submitted' });
    }

    const numericUserId = parseInt(userId, 10);
    const numericSubjectId = parseInt(subjectId, 10);

    if (Number.isNaN(numericUserId) || Number.isNaN(numericSubjectId)) {
        return res.status(400).json({ error: 'Invalid userId or subjectId' });
    }

    const transaction = await sequelize.transaction();

    try {
        const users = await sequelize.query(
            `SELECT email FROM users WHERE id = :userId LIMIT 1`,
            {
                replacements: { userId: numericUserId },
                type: QueryTypes.SELECT,
                transaction,
            }
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
            {
                type: QueryTypes.INSERT,
                transaction,
            }
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

        await transaction.commit();
        return res.json({
            message: 'Scorecard saved!',
            score,
            totalQuestions,
        });
    } catch (error) {
        await transaction.rollback();
        writeErrorLog('SUBMIT_ERROR', { message: error.message });
        return res.status(500).json({ error: 'Failed to save results' });
    }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use((err, req, res, _next) => {
    writeErrorLog('EXPRESS_ERROR', { message: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
sequelize.sync().then(() => {
    app.listen(PORT, () => console.log(`Quiz Engine running on port ${PORT}`));
});
