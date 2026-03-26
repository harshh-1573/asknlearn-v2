// backend-node/config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,     // quiz_system
    process.env.DB_USER,     // root
    process.env.DB_PASSWORD, // Harsh123@
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false // Disabled SQL logs for cleaner terminal
    }
);

module.exports = sequelize;