const express = require('express');

module.exports = ({ appVersion, serverStartedAt }) => {
    const router = express.Router();

    router.get('/health', (_req, res) => res.json({ ok: true }));

    router.get('/diagnostics', (_req, res) => {
        return res.json({
            ok: true,
            service: 'backend-node',
            version: appVersion,
            routes: {
                authBase: '/api/auth',
                changePassword: '/api/auth/change-password',
                userProfileGet: '/api/user/profile/:userId',
                userProfilePut: '/api/user/profile/:userId',
                dashboardStats: '/api/user/dashboard-stats/:userId',
                aiLibrary: '/api/ai/library/:userId',
            },
            startedAt: serverStartedAt,
        });
    });

    return router;
};
