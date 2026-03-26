import React, { useState } from 'react';
import axios from 'axios';
import { BookOpen, Lock, Mail, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                email: email.trim().toLowerCase(),
                password: password.trim()
            };

            console.log('Attempting login:', { email: payload.email });

            const res = await axios.post('http://localhost:5000/api/auth/login', payload);

            // Store the JWT and user info for the Dashboard
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('username', res.data.username || 'User');
                localStorage.setItem('userId', String(res.data.user?.id || 0));
                localStorage.setItem('email', res.data.user?.email || '');
                window.location.href = '/dashboard';
            } else {
                setError(res.data?.error || res.data?.message || 'Login failed: no token returned.');
            }
        } catch (err) {
            console.error('Login Error:', err);
            const apiError =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.response?.data?.details;
            const status = err.response?.status;

            if (apiError) {
                setError(status ? `Login failed (HTTP ${status}): ${apiError}` : `Login failed: ${apiError}`);
            } else if (err.response) {
                setError(status ? `Login failed (HTTP ${status})` : 'Login failed.');
            } else if (err.request) {
                setError('No response from server. Is `backend-node` running on port 5000?');
            } else {
                setError(err.message || 'Login failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_26%),linear-gradient(180deg,#eff6ff,#f8fafc)] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/95 backdrop-blur rounded-[2rem] shadow-[0_28px_80px_rgba(15,23,42,0.12)] p-8 border border-white/70 transition-all duration-300 hover:translate-y-[-2px]">
                <div className="text-center mb-8">
                    <div className="bg-[linear-gradient(120deg,#2563eb,#7c3aed)] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 animate-[pulse_4s_ease-in-out_infinite]">
                        <BookOpen className="text-white size-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">AskNLearn <span className="text-blue-600">v2</span></h1>
                    <p className="text-slate-500 mt-1">Sign in to access your CS Quizzes & AI Tools</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                required
                                type="email"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-white hover:border-slate-300"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                required
                                type="password"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-white hover:border-slate-300"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-[linear-gradient(120deg,#2563eb,#7c3aed)] text-white font-bold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-sky-200 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin size-5" /> : 'Sign In'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    New here? <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">Create an account</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

