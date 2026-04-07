const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db.js');

async function run() {
    const res = await sequelize.query('SHOW CREATE TABLE user_responses');
    fs.writeFileSync(path.join(__dirname, 'responses_dump.txt'), res[0][0]['Create Table']);
    const scores = await sequelize.query('SHOW CREATE TABLE user_scores');
    fs.writeFileSync(path.join(__dirname, 'scores_dump.txt'), scores[0][0]['Create Table']);
    console.log('done');
    process.exit(0);
}
run();
