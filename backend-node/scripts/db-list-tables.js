const sequelize = require('../config/db.js');

sequelize.query('SHOW TABLES').then(rows => {
    console.log(rows[0].map((row) => Object.values(row)[0]));
    process.exit(0);
});
