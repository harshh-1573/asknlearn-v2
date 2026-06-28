const defaultHost = typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : 'localhost';

const configuredBase = import.meta.env.VITE_API_BASE;

export const API_BASE = (configuredBase || `http://${defaultHost}:5000`).replace(/\/$/, '');

