const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// This model can point to different tables dynamically
const CSQuestion = (tableName) => sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    question: { type: DataTypes.TEXT, allowNull: false },
    option_a: { type: DataTypes.STRING, allowNull: false },
    option_b: { type: DataTypes.STRING, allowNull: false },
    option_c: { type: DataTypes.STRING, allowNull: false },
    option_d: { type: DataTypes.STRING, allowNull: false },
    correct_answer: { type: DataTypes.STRING, allowNull: false }
}, {
    tableName: tableName, // This will be 'os', 'dbms', etc.
    timestamps: false
});

module.exports = CSQuestion;