import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Loader2, Lock, Mail, User2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const payload = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password.trim(),
        };

        if (!payload.name || !payload.email || !payload.password) {
            setError('Please fill in all fields.');
            return;
        }

        if (payload.password.length < 6) {
            setError('Password should be at least 6 characters.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/auth/signup', payload);
            setSuccess('Registration successful. Redirecting to login...');
            setTimeout(() => navigate('/login'), 1000);
        } catch (err) {
            const apiError =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message;
            setError(apiError || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full pl-10 pr-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all bg-white';

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_26%),linear-gradient(180deg,#f8fafc,#e2e8f0)] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white/95 backdrop-blur border border-white/70 rounded-[2rem] shadow-[0_24px_80px_rgba(15,23,42,0.12)] p-8 transition-all duration-300 hover:translate-y-[-2px]">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-[linear-gradient(120deg,#e0f2fe,#ede9fe)] text-sky-700 text-sm font-semibold">
                        <BookOpen size={16} /> AskNLearn
                    </div>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900">Create your account</h1>
                    <p className="text-slate-500 mt-2">
                        Register once, then save AI materials, quiz progress, and chat history in your personal library.
                    </p>
                </div>

                {error ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                ) : null}

                {success ? (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        {success}
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                        <div className="relative">
                            <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                required
                                type="text"
                                value={form.name}
                                onChange={(event) => handleChange('name', event.target.value)}
                                placeholder="Enter your name"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                required
                                type="email"
                                value={form.email}
                                onChange={(event) => handleChange('email', event.target.value)}
                                placeholder="Enter your email"
                                className={inputClass}
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
                                value={form.password}
                                onChange={(event) => handleChange('password', event.target.value)}
                                placeholder="Create a password"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
                            <input
                                required
                                type="password"
                                value={form.confirmPassword}
                                onChange={(event) => handleChange('confirmPassword', event.target.value)}
                                placeholder="Re-enter your password"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full rounded-2xl py-3 font-bold text-white bg-[linear-gradient(120deg,#0ea5e9,#2563eb,#7c3aed)] shadow-lg shadow-sky-200 hover:shadow-xl hover:shadow-sky-200 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin size-5" /> : 'Create Account'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    Already have an account? <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
