const express = require('express');
const router = express.Router();
const QuizModel = require('../models/Quiz');

// Route for CS Quiz Master (OS, DBMS, OOPs)
router.get('/cs/:subject', async (req, res) => {
    const { subject } = req.params; // e.g., "os_questions"
    try {
        const QuestionTable = QuizModel(subject);
        const questions = await QuestionTable.findAll({ limit: 10 });
        res.json(questions);
    } catch (err) {
        res.status(404).json({ error: "Subject table not found." });
    }
});

// Route for AI Generated Quizzes
router.post('/ai/save', async (req, res) => {
    try {
        const AI_Table = QuizModel('ai_generated_quizzes');
        const saved = await AI_Table.create(req.body);
        res.json({ message: "AI Quiz Saved!", data: saved });
    } catch (err) {
        res.status(500).json({ error: "Could not save AI quiz." });
    }
});

module.exports = router;