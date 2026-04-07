import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, BookOpen, Loader2, Lock, Mail, User2, BrainCircuit, Sparkles, MessageSquareMore } from 'lucide-react';
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
            setTimeout(() => navigate('/login'), 1500);
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

    return (
        <div className="min-h-screen flex text-slate-100 bg-[#05070f]">
            {/* Left Section - Intro Details */}
            <div className="hidden lg:flex w-[45%] flex-col justify-between bg-[linear-gradient(135deg,#0f172a,#1d4ed8,#0f766e)] p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-8 font-bold shadow-2xl">
                        <BookOpen size={20} className="text-sky-400" />
                        <span className="tracking-wide">AskNLearn <span className="text-sky-400">v2</span></span>
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight mb-8">
                        Join the next generation of smart learning.
                    </h1>

                    <div className="space-y-8 mt-12 pr-8">
                        <div className="flex items-start gap-5">
                            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 shrink-0 shadow-lg mt-0.5">
                                <Sparkles className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Instant Material Generation</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">Drop a PDF, Video, Audio, or Doc and automatically generate Flashcards, MCQs, and Mind-Maps in seconds.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-5">
                            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 shrink-0 shadow-lg mt-0.5">
                                <MessageSquareMore className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Interactive AI Tutor</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">Chat with your study material contextually. The AI guarantees grounded answers without hallucinating data.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-5">
                            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 shrink-0 shadow-lg mt-0.5">
                                <BrainCircuit className="text-fuchsia-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-2">Adaptive CS Quizzes</h3>
                                <p className="text-slate-300 text-sm leading-relaxed">Review history and take personalized quizzes tracking your performance and detailed analytics dynamically.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-white/50 text-sm font-semibold mt-12 flex items-center justify-between">
                    <span>&copy; {new Date().getFullYear()} AskNLearn Platform</span>
                    <span>Version 2.0</span>
                </div>
            </div>

            {/* Right Section - Auth Form */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.1),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]">

                {/* Mobile Header */}
                <div className="absolute top-8 left-6 sm:left-12 lg:hidden flex items-center gap-3 font-bold text-white text-xl">
                    <div className="bg-[linear-gradient(120deg,#0ea5e9,#8b5cf6)] p-2.5 rounded-xl text-white shadow-lg">
                        <BookOpen size={20} />
                    </div>
                    AskNLearn v2
                </div>

                <div className="max-w-[420px] w-full mt-10 lg:mt-0 relative z-10 backdrop-blur-xl bg-white/5 p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                    <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-semibold mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Create Account</h2>
                        <p className="text-slate-400 font-medium">Register once and save your study progress.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl font-semibold animate-[fadeIn_0.3s_ease] backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-2xl font-semibold animate-[fadeIn_0.3s_ease] backdrop-blur-sm">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="group">
                            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">Full Name</label>
                            <div className="relative">
                                <User2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5 transition-colors group-focus-within:text-sky-400" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white"
                                    placeholder="Enter your name"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5 transition-colors group-focus-within:text-sky-400" />
                                <input
                                    required
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 size-4 transition-colors group-focus-within:text-sky-400" />
                                    <input
                                        required
                                        type="password"
                                        className="w-full pl-10 pr-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white text-sm"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => handleChange('password', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 size-4 transition-colors group-focus-within:text-sky-400" />
                                    <input
                                        required
                                        type="password"
                                        className="w-full pl-10 pr-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white text-sm"
                                        placeholder="••••••••"
                                        value={form.confirmPassword}
                                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full mt-6 bg-[linear-gradient(120deg,#0ea5e9,#8b5cf6)] hover:bg-[linear-gradient(120deg,#0284c7,#7c3aed)] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 disabled:shadow-none border border-white/10"
                        >
                            {loading ? <Loader2 className="animate-spin size-5" /> : 'Create Free Account'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm font-medium text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold text-sky-400 hover:text-sky-300 transition-all ml-1">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
