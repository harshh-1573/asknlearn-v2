const express = require('express');

module.exports = ({
    sequelize,
    QueryTypes,
    axios,
    FormData,
    upload,
    writeErrorLog,
    parseStoredJson,
    ensureAiChatHistoryTable,
}) => {
    const router = express.Router();
    const pythonServiceUrl = process.env.AI_PYTHON_URL || 'http://localhost:8000';

    router.post('/process', upload.single('file'), async (req, res) => {
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

    router.post('/save-material', async (req, res) => {
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

    router.get('/library/:userId', async (req, res) => {
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

            const materials = rows.map((row) => ({ ...row, content_json: parseStoredJson(row.content_json) }));
            return res.json({ materials });
        } catch (error) {
            writeErrorLog('AI_LIBRARY_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load AI library' });
        }
    });

    router.get('/material/:materialId', async (req, res) => {
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

            if (!rows.length) return res.status(404).json({ error: 'Material not found' });

            const row = rows[0];
            return res.json({ material: { ...row, content_json: parseStoredJson(row.content_json) } });
        } catch (error) {
            writeErrorLog('AI_MATERIAL_FETCH_ERROR', { message: error.message, materialId, userId });
            return res.status(500).json({ error: 'Failed to load saved material' });
        }
    });

    router.get('/dashboard/:userId', async (req, res) => {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

        try {
            const rows = await sequelize.query(
                `SELECT id, source_name, content_json, created_at
                 FROM study_materials
                 WHERE user_id = :userId
                 ORDER BY created_at DESC`,
                { replacements: { userId }, type: QueryTypes.SELECT }
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
                history: parsedRows.slice(0, 30),
            });
        } catch (error) {
            writeErrorLog('AI_DASHBOARD_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load AI dashboard' });
        }
    });

    router.get('/chat-history/:materialId', async (req, res) => {
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
                { replacements: { materialId, userId }, type: QueryTypes.SELECT }
            );
            return res.json({ history: rows });
        } catch (error) {
            writeErrorLog('AI_CHAT_HISTORY_FETCH_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to load chat history' });
        }
    });

    router.post('/chat', async (req, res) => {
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

        if (Number.isNaN(numericUserId)) return res.status(400).json({ error: 'Invalid userId' });
        if (numericMaterialId !== null && Number.isNaN(numericMaterialId)) {
            return res.status(400).json({ error: 'Invalid materialId' });
        }

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
            payload.append('socratic_mode', String(req.body.socraticMode || 'false'));

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
                            replacements: { userId: numericUserId, materialId: numericMaterialId, message: String(question) },
                            type: QueryTypes.INSERT,
                            transaction,
                        }
                    );
                    await sequelize.query(
                        `INSERT INTO ai_chat_history (user_id, material_id, role, message)
                         VALUES (:userId, :materialId, 'assistant', :message)`,
                        {
                            replacements: { userId: numericUserId, materialId: numericMaterialId, message: String(answer) },
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
                suggestedFollowups: response.data?.suggested_followups || [],
                modelUsed: response.data?.model_used || null,
            });
        } catch (error) {
            writeErrorLog('AI_CHAT_ERROR', { message: error.message, details: error.response?.data });
            return res.status(500).json({
                error: error.response?.data?.detail || error.response?.data?.error || 'AI chat failed',
            });
        }
    });

    router.post('/workspace-materials', async (req, res) => {
        try {
            const { materialIds } = req.body;
            if (!Array.isArray(materialIds) || !materialIds.length) {
                return res.status(400).json({ error: 'No material IDs provided' });
            }

            const materials = await sequelize.query(
                `SELECT * FROM study_materials WHERE id IN (?)`,
                { replacements: [materialIds], type: QueryTypes.SELECT }
            );

            return res.json({ materials });
        } catch (error) {
            writeErrorLog('FETCH_WORKSPACE_MATERIALS_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to fetch workspace materials' });
        }
    });

    router.post('/free-chat', async (req, res) => {
        const { question = '', language = 'English' } = req.body || {};

        if (!String(question).trim()) {
            return res.status(400).json({ error: 'Question is required' });
        }

        try {
            const payload = new FormData();
            payload.append('question', String(question));
            payload.append('language', String(language));

            const response = await axios.post(`${pythonServiceUrl}/free-chat`, payload, {
                headers: payload.getHeaders(),
                timeout: 90000,
            });

            return res.json({
                answer: response.data?.answer || '',
                modelUsed: response.data?.model_used || null,
            });
        } catch (error) {
            writeErrorLog('AI_FREE_CHAT_ERROR', { message: error.message, details: error.response?.data });
            return res.status(500).json({
                error: error.response?.data?.detail || error.response?.data?.error || 'AI free chat failed',
            });
        }
    });

    router.get('/performance-report/:userId', async (req, res) => {
        try {
            const userId = parseInt(req.params.userId, 10);
            if (Number.isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

            const stats = await sequelize.query(
                `SELECT s.name AS subject_name, ut.total_attempts, ut.total_correct, (ut.total_correct / ut.total_attempts * 100) as avg
                 FROM user_topic_performance ut
                 JOIN subjects s ON ut.subject_id = s.id
                 WHERE ut.user_id = :userId AND ut.total_attempts > 0
                 ORDER BY avg ASC`,
                { replacements: { userId }, type: QueryTypes.SELECT }
            );

            if (!stats.length) {
                return res.json({ report: "You haven't taken enough quizzes yet! Study some more and come back later." });
            }

            const dataStr = stats
                .map((stat) => `${stat.subject_name}: ${Math.round(stat.avg)}% accuracy (${stat.total_correct}/${stat.total_attempts} correct)`)
                .join('\n');

            const prompt = `You are an expert AI CS Tutor. Analyze this student's current quiz performance data:\n\n${dataStr}\n\nProvide a short, highly encouraging, and strictly structured 3-step action plan focusing explicitly on their weakest subjects. Do not use generic advice. Be specific.`;

            const payload = new FormData();
            payload.append('question', prompt);

            const response = await axios.post(`${pythonServiceUrl}/chat`, payload, {
                headers: payload.getHeaders(),
                timeout: 60000,
            });

            return res.json({ report: response.data?.answer || 'AI is currently resting. Try again soon!' });
        } catch (error) {
            writeErrorLog('AI_REPORT_ERROR', { message: error.message });
            return res.status(500).json({ error: 'Failed to generate performance report' });
        }
    });

    return router;
};
