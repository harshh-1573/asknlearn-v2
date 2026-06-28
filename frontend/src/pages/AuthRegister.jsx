import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowRight, BookOpen, Eye, EyeOff, BrainCircuit, Trophy, MessageSquare, Sparkles, Loader2, Lock, Mail, ShieldAlert, User2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const AuthRegister = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isEmailValid = useMemo(() => emailRegex.test(form.email.trim().toLowerCase()), [form.email]);
    const isStrongPassword = useMemo(() => strongPasswordRegex.test(form.password), [form.password]);
    const doPasswordsMatch = useMemo(() => form.password === form.confirmPassword, [form.password, form.confirmPassword]);
    const canSubmit = useMemo(() => {
        return form.name.trim().length > 1 && isEmailValid && isStrongPassword && doPasswordsMatch && !loading;
    }, [form.name, isEmailValid, isStrongPassword, doPasswordsMatch, loading]);
    const faqItems = [
        { q: 'Password policy?', a: 'Minimum 8 chars with upper, lower, number, and symbol.' },
        { q: 'Forgot password later?', a: 'You can reset via OTP or by verifying your old password.' },
    ];
    const testimonials = [
        '"Registration took less than a minute."',
        '"The onboarding feels premium and clear."',
    ];

    const handleChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
            return setError('Please fill in all fields.');
        }
        if (!isEmailValid) {
            return setError('Please enter a valid email address.');
        }
        if (!isStrongPassword) {
            return setError('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
        }
        if (!doPasswordsMatch) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/auth/signup`, {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password.trim(),
            });
            setSuccess('Account created successfully. Redirecting to login...');
            setTimeout(() => navigate('/login'), 1300);
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#040611] text-white">
                        <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes floatSlow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes spinSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .auth-stagger-1 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.1s; }
                .auth-stagger-2 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.2s; }
                .auth-stagger-3 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.3s; }
                .auth-stagger-4 { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; animation-delay: 0.4s; }
                .auth-float { animation: floatSlow 4s ease-in-out infinite; }
            `}</style>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[30%] -left-[10%] w-[50rem] h-[50rem] bg-cyan-500/10 rounded-full blur-[120px] mix-blend-screen" style={{ animation: 'spinSlow 25s linear infinite' }} />
                <div className="absolute top-[20%] -right-[10%] w-[45rem] h-[45rem] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen" style={{ animation: 'spinSlow 30s linear infinite reverse' }} />
            </div>
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-8 sm:py-10">
                                <div className="hidden w-1/2 pr-14 lg:flex flex-col justify-center h-full">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 text-sm font-bold text-cyan-300 auth-stagger-1 auth-float" style={{ width: 'fit-content' }}>
                        <Sparkles size={16} /> Intelligent Learning Engine
                    </div>
                    <h1 className="text-5xl font-black leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 auth-stagger-2">
                        What is AskNLearn?
                    </h1>
                    <p className="mt-4 max-w-lg text-lg text-slate-400 auth-stagger-2">
                        Your ultimate AI-powered study companion. Upload materials, generate intelligent practice tests, and learn smarter.
                    </p>

                    <div className="mt-10 space-y-4 max-w-lg">
                        {/* Feature 1 */}
                        <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors auth-stagger-3 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                                <BrainCircuit size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">AI Content Generation</h3>
                                <p className="text-sm text-slate-400 mt-1">Transform any PDF or text into interactive flashcards and dynamic mock quizzes instantly.</p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors auth-stagger-3 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                <Trophy size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Gamified Progression</h3>
                                <p className="text-sm text-slate-400 mt-1">Earn XP for answering correctly, maintain daily streaks, and climb the global leaderboards.</p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors auth-stagger-4 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                <MessageSquare size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Community Chat Rooms</h3>
                                <p className="text-sm text-slate-400 mt-1">Engage in real-time study discussions with classmates and platform Admins.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 max-w-lg">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Student feedback</p>
                            <div className="mt-2 space-y-2">
                                {testimonials.map((item) => (
                                    <p key={item} className="text-sm text-slate-300">{item}</p>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Quick FAQ</p>
                            <div className="mt-2 space-y-2">
                                {faqItems.map((item) => (
                                    <p key={item.q} className="text-sm text-slate-300"><span className="font-semibold text-slate-200">{item.q}</span> {item.a}</p>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-3 text-xs">
                                <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">LinkedIn</a>
                                <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">Instagram</a>
                                <a href="https://x.com" target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200">X</a>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="w-full lg:w-1/2 auth-fade-up">
                    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#0d1220]/85 p-5 sm:p-8 backdrop-blur-2xl shadow-[0_24px_55px_-20px_rgba(0,0,0,0.65)]">
                        <h2 className="text-3xl sm:text-4xl font-black">Start with AskNLearn</h2>
                        <p className="mt-2 text-slate-400">Create your account to unlock AI study tools and smart revision flow.</p>

                        {(error || success) && (
                            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                                <div className="flex items-start gap-2">
                                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                                    <span>{error || success}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="mt-6 space-y-4">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Full name</label>
                            <div className="relative">
                                <User2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-400/70" />
                            </div>

                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Email address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input value={form.email} onChange={(e) => handleChange('email', e.target.value)} type="email" placeholder="name@example.com" className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 outline-none transition focus:border-indigo-400/70" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
                                    <div className="relative mt-1.5">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input value={form.password} onChange={(e) => handleChange('password', e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-11 outline-none transition focus:border-emerald-400/70" />
                                        <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="touch-target absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center justify-center">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Confirm</label>
                                    <div className="relative mt-1.5">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} type={showConfirmPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-11 outline-none transition focus:border-emerald-400/70" />
                                        <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="touch-target absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white flex items-center justify-center">{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
                            {!!form.confirmPassword && !doPasswordsMatch && <p className="text-xs text-rose-400">Passwords do not match.</p>}

                            <button disabled={!canSubmit} className="touch-target mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-500 py-3.5 font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Free Account <ArrowRight size={17} /></>}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Already have an account? <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthRegister;
