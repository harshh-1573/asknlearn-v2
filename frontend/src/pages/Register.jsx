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
        <div className="min-h-screen flex text-slate-900 bg-white">
            {/* Left Section - Intro Details (Hidden on mobile) */}
            <div className="hidden lg:flex w-[45%] flex-col justify-between bg-[linear-gradient(135deg,#0f172a,#1d4ed8,#0f766e)] text-white p-12 xl:p-16 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
                <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] bg-teal-500/30 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-8 font-semibold shadow-2xl">
                        <BookOpen size={20} className="text-sky-300" />
                        <span className="tracking-wide">AskNLearn <span className="text-sky-300 font-bold">v2</span></span>
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-black leading-[1.15] tracking-tight mb-8">
                        Join the next generation of smart learning.
                    </h1>

                    <div className="space-y-8 mt-12 pr-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                                <Sparkles className="text-amber-300" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Instant Material Generation</h3>
                                <p className="text-white/70 text-sm leading-relaxed">Drop a PDF, Video, Audio, or Doc and automatically generate Flashcards, MCQs, and Mind-Maps.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                                <MessageSquareMore className="text-emerald-300" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">Interactive AI Tutor</h3>
                                <p className="text-white/70 text-sm leading-relaxed">Chat with your study material. The AI guarantees grounded answers without hallucinating data.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
                                <BrainCircuit className="text-fuchsia-300" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">CS Quiz Practice</h3>
                                <p className="text-white/70 text-sm leading-relaxed">Review history and take personalized quizzes tracking your performance and detailed analytics.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-white/50 text-sm font-medium mt-12">
                    &copy; {new Date().getFullYear()} AskNLearn Educational Platform.
                </div>
            </div>

            {/* Right Section - Auth Form */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.06),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.06),transparent_40%)]">
                
                {/* Mobile brand header (only visible on small screens) */}
                <div className="absolute top-8 left-6 sm:left-12 lg:hidden flex items-center gap-2 font-bold text-slate-800 text-xl">
                    <div className="bg-[linear-gradient(120deg,#2563eb,#7c3aed)] p-2 rounded-xl text-white">
                        <BookOpen size={20} />
                    </div>
                    AskNLearn v2
                </div>

                <div className="max-w-[420px] w-full mt-10 lg:mt-0">
                    <button onClick={() => navigate('/login')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold mb-8 transition-colors">
                        <ArrowLeft size={16} /> Back to login
                    </button>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Create Account</h2>
                        <p className="text-slate-500 font-medium">Register once and save your study progress.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl font-medium animate-[fadeIn_0.3s_ease]">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl font-medium animate-[fadeIn_0.3s_ease]">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">Full Name</label>
                            <div className="relative">
                                <User2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5 transition-colors group-focus-within:text-blue-600" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all hover:border-slate-300 font-medium placeholder:text-slate-400 bg-white"
                                    placeholder="Enter your name"
                                    value={form.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5 transition-colors group-focus-within:text-blue-600" />
                                <input
                                    required
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all hover:border-slate-300 font-medium placeholder:text-slate-400 bg-white"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5 transition-colors group-focus-within:text-blue-600" />
                                    <input
                                        required
                                        type="password"
                                        className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all hover:border-slate-300 font-medium placeholder:text-slate-400 bg-white"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => handleChange('password', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-blue-600">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5 transition-colors group-focus-within:text-blue-600" />
                                    <input
                                        required
                                        type="password"
                                        className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all hover:border-slate-300 font-medium placeholder:text-slate-400 bg-white"
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
                            className="w-full mt-4 bg-[linear-gradient(120deg,#2563eb,#0ea5e9)] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                        >
                            {loading ? <Loader2 className="animate-spin size-5" /> : 'Create Free Account'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm font-medium text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 transition-all">
                            Sign in instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
