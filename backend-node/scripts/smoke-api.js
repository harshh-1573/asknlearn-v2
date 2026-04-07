const axios = require('axios');

const API = process.env.API_BASE_URL || 'http://localhost:5000';
const userId = process.env.SMOKE_USER_ID || '';

const checks = [
    { label: 'health', url: `${API}/api/health` },
    { label: 'diagnostics', url: `${API}/api/diagnostics` },
];

if (userId) {
    checks.push(
        { label: 'profile', url: `${API}/api/user/profile/${userId}` },
        { label: 'dashboard-stats', url: `${API}/api/user/dashboard-stats/${userId}` },
        { label: 'ai-library', url: `${API}/api/ai/library/${userId}` },
    );
}

async function run() {
    let hasFailure = false;

    for (const check of checks) {
        try {
            const response = await axios.get(check.url, { timeout: 10000 });
            console.log(`PASS ${check.label} -> ${response.status}`);
        } catch (error) {
            hasFailure = true;
            const status = error.response?.status || 'NO_RESPONSE';
            const message = error.response?.data?.error || error.message;
            console.error(`FAIL ${check.label} -> ${status} ${message}`);
        }
    }

    if (hasFailure) {
        process.exitCode = 1;
        return;
    }

    console.log('Smoke API checks completed successfully.');
}

run();
