const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// This is a "Dynamic Model Factory"
// It lets us use the same structure for 'os', 'dbms', or 'ai_quizzes'
const QuizModel = (tableName) => sequelize.define('Quiz', {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    question: { type: DataTypes.TEXT, allowNull: false },
    option_a: { type: DataTypes.STRING, allowNull: false },
    option_b: { type: DataTypes.STRING, allowNull: false },
    option_c: { type: DataTypes.STRING, allowNull: false },
    option_d: { type: DataTypes.STRING, allowNull: false },
    correct_answer: { type: DataTypes.STRING, allowNull: false },
    // Optional: add userId if you want to track who generated the AI quiz
    user_id: { type: DataTypes.INTEGER, allowNull: true } 
}, {
    tableName: tableName, // Points to your actual MySQL table name
    timestamps: false
});

module.exports = QuizModel;