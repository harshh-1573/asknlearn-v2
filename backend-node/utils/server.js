const fs = require('fs');

const AI_CHAT_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    material_id INT NOT NULL,
    role ENUM('user','assistant') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

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

const createWriteErrorLog = (errorLogFile) => (label, details) => {
    const line = `[${new Date().toISOString()}] ${label} ${JSON.stringify(details)}\n`;
    try {
        fs.appendFileSync(errorLogFile, line, 'utf8');
    } catch (error) {
        console.error(error);
    }
};

const createEnsureAiChatHistoryTable = (sequelize, QueryTypes) => async () => {
    await sequelize.query(AI_CHAT_HISTORY_TABLE_SQL, { type: QueryTypes.RAW });
};

module.exports = {
    AI_CHAT_HISTORY_TABLE_SQL,
    parseStoredJson,
    createWriteErrorLog,
    createEnsureAiChatHistoryTable,
};
