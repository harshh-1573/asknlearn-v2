import React, { useState } from 'react';
import axios from 'axios';
import { BookOpen, Lock, Mail, Loader2, BrainCircuit, Sparkles, MessageSquareMore, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResetSuccess(false);

        try {
            const payload = {
                email: email.trim().toLowerCase(),
                newPassword: password.trim()
            };

            const res = await axios.post('http://localhost:5000/api/auth/reset-password', payload);

            if (res.data.success || res.status === 200) {
                setResetSuccess(true);
                setTimeout(() => {
                    setIsResetMode(false);
                    setPassword('');
                    setResetSuccess(false);
                }, 3000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Password reset failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                email: email.trim().toLowerCase(),
                password: password.trim()
            };

            const res = await axios.post('http://localhost:5000/api/auth/login', payload);

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
                setError('No response from server. Is backend running?');
            } else {
                setError(err.message || 'Login failed.');
            }
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
                        The ultimate AI study companion for modern learners.
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

                <div className="max-w-[420px] w-full relative z-10 backdrop-blur-xl bg-white/5 p-8 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                            {isResetMode ? 'Reset Password' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-400 font-medium">
                            {isResetMode
                                ? 'Enter your email and a new password.'
                                : 'Please sign in to your dashboard to continue.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl font-semibold animate-[fadeIn_0.3s_ease] backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    {resetSuccess && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-2xl font-semibold animate-[fadeIn_0.3s_ease] backdrop-blur-sm flex items-center gap-2">
                            <Sparkles size={16} /> Password reset successful!
                        </div>
                    )}

                    <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-5">
                        <div className="group">
                            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5 transition-colors group-focus-within:text-sky-400" />
                                <input
                                    required
                                    type="email"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 transition-colors group-focus-within:text-sky-400">
                                {isResetMode ? 'New Password' : 'Password'}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5 transition-colors group-focus-within:text-sky-400" />
                                <input
                                    required
                                    type="password"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all hover:bg-white/10 font-medium placeholder:text-slate-500 text-white"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {!isResetMode && (
                            <div className="flex items-center justify-between pb-2 pt-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" className="peer w-5 h-5 rounded border border-white/20 bg-white/5 checked:bg-sky-500 checked:border-sky-500 appearance-none cursor-pointer transition-all" />
                                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 10" fill="none"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Remember me</span>
                                </label>
                                <button type="button" onClick={() => { setIsResetMode(true); setError(''); }} className="text-sm font-bold text-sky-400 hover:text-sky-300 transition-colors">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full mt-2 bg-[linear-gradient(120deg,#0ea5e9,#8b5cf6)] hover:bg-[linear-gradient(120deg,#0284c7,#7c3aed)] text-white font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.5)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 disabled:shadow-none border border-white/10"
                        >
                            {loading ? <Loader2 className="animate-spin size-5" /> : (isResetMode ? 'Reset Password' : 'Sign In Now')}
                        </button>

                        {isResetMode && (
                            <button
                                type="button"
                                onClick={() => { setIsResetMode(false); setError(''); }}
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors py-3 mt-4 rounded-2xl border border-white/5 hover:bg-white/5"
                            >
                                <ArrowLeft size={16} /> Back to Login
                            </button>
                        )}
                    </form>

                    {!isResetMode && (
                        <p className="mt-8 text-center text-sm font-medium text-slate-400">
                            Don't have an account yet?{' '}
                            <Link to="/register" className="font-bold text-sky-400 hover:text-sky-300 transition-all ml-1">
                                Create an account
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
