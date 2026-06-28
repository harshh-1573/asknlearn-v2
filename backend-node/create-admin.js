const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'quiz_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

async function run() {
    const username = process.argv[2];
    const email = process.argv[3];
    const password = process.argv[4];

    if (!username || !email || !password) {
        console.log("Usage: node create-admin.js <username> <email> <password>");
        process.exit(1);
    }
    
    try {
        const hash = await bcrypt.hash(password, 10);
        await sequelize.query(
            `CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        );

        await sequelize.query(
            `INSERT INTO admins (username, email, password_hash)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash)`,
            {
            replacements: [username, email, hash]
            }
        );
        console.log(`\nSUCCESS! Admin created:\nEmail: ${email}\nPassword: ${password}\n`);
    } catch (e) {
        console.error("Error creating admin:", e.message);
    }
    process.exit(0);
}

run();
