import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowRight, BookOpen, Eye, EyeOff, BrainCircuit, Trophy, MessageSquare, Sparkles, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config/api';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpRegex = /^\d{6}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const featureCards = [
    {
        title: 'AI Content Generation',
        text: 'Convert notes, PDFs, URLs, images, audio, and video into summaries, flashcards, MCQs, and memory maps.',
        icon: BrainCircuit,
        glow: 'from-cyan-400 to-blue-500',
        className: 'lg:ml-12',
    },
    {
        title: 'Gamified XP',
        text: 'Earn XP, maintain learning streaks, and turn every quiz attempt into visible progress.',
        icon: Trophy,
        glow: 'from-violet-400 to-fuchsia-500',
        className: 'lg:mr-8',
    },
    {
        title: 'Community Rooms',
        text: 'Discuss topics in real time, learn with peers, and stay connected through focused chat spaces.',
        icon: MessageSquare,
        glow: 'from-emerald-400 to-cyan-500',
        className: 'lg:ml-24',
    },
];

const marqueeRow1 = [
    'AI summaries',
    'Flashcard practice',
    'Adaptive quizzes',
    'XP streaks',
];

const marqueeRow2 = [
    'Leaderboards',
    'Secure reset',
    'Community chat',
    'Admin control',
];

const socialProof = [
    {
        quote: "AskNLearn makes revision feel structured instead of stressful.",
        author: "Dev M.",
        role: "CS Major"
    },
    {
        quote: "The quiz and XP flow keeps students coming back daily.",
        author: "Sarah K.",
        role: "Student Tutor"
    },
    {
        quote: "AI notes, flashcards, and practice are finally in one place.",
        author: "Alex R.",
        role: "Active Learner"
    }
];

const PasswordToggle = ({ isVisible, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className="touch-target absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:scale-110 hover:text-white active:scale-95"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
    >
        {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
);

const FieldShell = ({ children, icon: Icon }) => (
    <div className="relative rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 p-px shadow-[0_0_20px_rgba(34,211,238,0.04)] transition-all duration-300 focus-within:from-cyan-400/60 focus-within:via-blue-500/60 focus-within:to-violet-500/60 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
        <div className="relative rounded-2xl bg-[#090d16]/90 backdrop-blur-xl">
            {Icon && <Icon size={18} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors duration-300" />}
            {children}
        </div>
    </div>
);

const ShineButton = ({ children, className = '', ...props }) => (
    <button
        {...props}
        className={`touch-target group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 py-3.5 font-black text-white shadow-[0_18px_45px_rgba(59,130,246,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(139,92,246,0.35)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
    >
        <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/35 opacity-0 blur-sm transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
);

const AuthLogin = () => {
    const [mode, setMode] = useState('login');
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [resetMethod, setResetMethod] = useState('oldPassword');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [otpRequested, setOtpRequested] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % socialProof.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const isEmailValid = useMemo(() => emailRegex.test(email.trim().toLowerCase()), [email]);
    const isNewPasswordStrong = useMemo(() => strongPasswordRegex.test(newPassword), [newPassword]);
    const isConfirmMatched = useMemo(() => newPassword === confirmPassword, [newPassword, confirmPassword]);
    const isOldPasswordResetValid = useMemo(() => {
        return isEmailValid && oldPassword.trim().length > 0 && isNewPasswordStrong && isConfirmMatched && oldPassword.trim() !== newPassword.trim();
    }, [isEmailValid, oldPassword, newPassword, isNewPasswordStrong, isConfirmMatched]);
    const canLogin = isEmailValid && password.trim().length > 0 && !loading;
    const canRequestOtp = isEmailValid && isNewPasswordStrong && isConfirmMatched && !loading && resendIn === 0;
    const canResetOtp = isEmailValid && isNewPasswordStrong && isConfirmMatched && otpRegex.test(otp.trim()) && !loading;

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const id = setInterval(() => {
            setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [resendIn]);

    const resetMessages = () => {
        setError('');
        setMessage('');
    };

    const switchToLogin = () => {
        setMode('login');
        setResetMethod('oldPassword');
        setOtpRequested(false);
        setOtp('');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResendIn(0);
        resetMessages();
    };

    const switchResetMethod = (method) => {
        setResetMethod(method);
        setOtpRequested(false);
        setOtp('');
        setOldPassword('');
        setResendIn(0);
        resetMessages();
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        resetMessages();
        if (!isEmailValid) return setError('Please enter a valid email address.');
        if (!password.trim()) return setError('Please enter your password.');

        setLoading(true);
        try {
            const payload = { email: email.trim().toLowerCase(), password };
            const endpoint = isAdminLogin ? '/api/auth/admin/login' : '/api/auth/login';
            const res = await axios.post(`${API_BASE}${endpoint}`, payload);

            if (!res.data?.token) throw new Error('Token missing in login response.');
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('username', res.data.username || (isAdminLogin ? 'Admin' : 'User'));

            if (isAdminLogin) {
                localStorage.setItem('role', 'admin');
                window.location.href = '/admin-dashboard';
            } else {
                localStorage.setItem('role', 'user');
                localStorage.setItem('userId', String(res.data.user?.id || ''));
                localStorage.setItem('email', res.data.user?.email || payload.email);
                window.location.href = '/dashboard';
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async () => {
        resetMessages();
        if (!isEmailValid) return setError('Please enter a valid email address.');
        if (!isNewPasswordStrong) return setError('Use a stronger new password first.');
        if (!isConfirmMatched) return setError('New password and confirm password must match.');

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/auth/request-reset-otp`, { email: email.trim().toLowerCase() });
            setOtpRequested(true);
            setResendIn(60);
            setMessage('OTP sent to backend terminal. Copy it from backend-node console.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetOtp = async (event) => {
        event.preventDefault();
        resetMessages();
        if (!canResetOtp) return setError('Please complete all OTP reset fields correctly.');

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/auth/reset-password-otp`, {
                email: email.trim().toLowerCase(),
                otp: otp.trim(),
                newPassword: newPassword.trim(),
            });
            setMessage('Password updated successfully. You can sign in now.');
            setTimeout(() => switchToLogin(), 1200);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password with OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetWithOldPassword = async (event) => {
        event.preventDefault();
        resetMessages();
        if (!isEmailValid) return setError('Please enter a valid email address.');
        if (!oldPassword.trim()) return setError('Old password is required.');
        if (!isNewPasswordStrong) return setError('New password must follow the strong password rules.');
        if (!isConfirmMatched) return setError('New password and confirm password must match.');
        if (oldPassword.trim() === newPassword.trim()) return setError('New password must be different from old password.');

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/auth/reset-password-old`, {
                email: email.trim().toLowerCase(),
                oldPassword: oldPassword.trim(),
                newPassword: newPassword.trim(),
            });
            setMessage('Password updated successfully. Please sign in with the new password.');
            setTimeout(() => switchToLogin(), 1200);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password using old password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
            <style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes floatGlass {
                    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
                    50% { transform: translate3d(0, -14px, 0) rotate(1deg); }
                }
                @keyframes meshDrift {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(32px, -26px, 0) scale(1.08); }
                }
                @keyframes marqueeLeft {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                @keyframes marqueeRight {
                    from { transform: translateX(-50%); }
                    to { transform: translateX(0); }
                }
                @keyframes nodePulse {
                    0%, 100% { opacity: 0.22; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.25); }
                }
                .auth-appear { animation: fadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .auth-delay-1 { animation-delay: 0.08s; }
                .auth-delay-2 { animation-delay: 0.16s; }
                .auth-delay-3 { animation-delay: 0.24s; }
                .auth-float-1 { animation: floatGlass 5.8s ease-in-out infinite; }
                .auth-float-2 { animation: floatGlass 6.8s ease-in-out infinite reverse; }
                .auth-float-3 { animation: floatGlass 7.6s ease-in-out infinite; }
                .auth-marquee-left { animation: marqueeLeft 18s linear infinite; }
                .auth-marquee-right { animation: marqueeRight 18s linear infinite; }
                .auth-node { animation: nodePulse 3.5s ease-in-out infinite; }
            `}</style>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-[120px]" style={{ animation: 'meshDrift 14s ease-in-out infinite' }} />
                <div className="absolute right-[-12rem] top-20 h-[40rem] w-[40rem] rounded-full bg-violet-600/20 blur-[130px]" style={{ animation: 'meshDrift 17s ease-in-out infinite reverse' }} />
                <div className="absolute bottom-[-14rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-blue-600/10 blur-[120px]" style={{ animation: 'meshDrift 19s ease-in-out infinite' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:34px_34px] opacity-20" />
                {[14, 28, 43, 62, 76].map((left, index) => (
                    <span
                        key={left}
                        className="auth-node absolute h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.9)]"
                        style={{ left: `${left}%`, top: `${18 + index * 13}%`, animationDelay: `${index * 0.45}s` }}
                    />
                ))}
            </div>

            <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-8 sm:px-8 lg:grid-cols-2 lg:px-10">
                <section className="auth-appear auth-delay-1 hidden min-h-[650px] flex-col justify-center lg:flex">
                    <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm font-bold text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-xl">
                        <BookOpen size={18} className="text-cyan-300" />
                        AskNLearn AI Student Companion
                    </div>

                    <h1 className="mt-8 max-w-2xl text-5xl font-black leading-[0.98] tracking-tight text-white xl:text-6xl">
                        Learn faster with an
                        <span className="block bg-gradient-to-r from-cyan-200 via-white to-violet-300 bg-clip-text text-transparent">AI-powered study flow.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg xl:leading-8">
                        Generate study material, practice through adaptive quizzes, compete on leaderboards, and keep your learning history in one polished workspace.
                    </p>

                    <div className="mt-8 grid max-w-xl gap-4">
                        {featureCards.map((card, index) => {
                            const Icon = card.icon;
                            return (
                                <article
                                    key={card.title}
                                    className={`auth-float-${index + 1} ${card.className} relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.07]`}
                                >
                                    <div className={`absolute -right-14 -top-14 h-36 w-36 rounded-full bg-gradient-to-br ${card.glow} opacity-25 blur-2xl`} />
                                    <div className="relative flex items-start gap-4">
                                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.glow} shadow-[0_0_32px_rgba(34,211,238,0.24)]`}>
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">{card.title}</h3>
                                            <p className="mt-1 text-sm leading-6 text-slate-300">{card.text}</p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-8 max-w-xl space-y-3">
                        <div className="overflow-hidden rounded-full border border-white/10 bg-white/[0.04] py-2.5 backdrop-blur-xl">
                            <div className="auth-marquee-left flex w-max gap-3 whitespace-nowrap px-3">
                                {[...marqueeRow1, ...marqueeRow1].map((item, index) => (
                                    <span key={`${item}-${index}`} className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-full border border-white/10 bg-white/[0.04] py-2.5 backdrop-blur-xl">
                            <div className="auth-marquee-right flex w-max gap-3 whitespace-nowrap px-3">
                                {[...marqueeRow2, ...marqueeRow2].map((item, index) => (
                                    <span key={`${item}-${index}`} className="rounded-full border border-violet-300/15 bg-violet-300/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-violet-100">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="auth-appear auth-delay-2 mx-auto w-full max-w-[31rem]">
                    <div className="mb-5 flex items-center justify-between lg:hidden">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-sm font-black text-cyan-100 backdrop-blur-xl">
                            <BookOpen size={18} className="text-cyan-300" />
                            AskNLearn
                        </div>
                        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100">AI Student Companion</span>
                    </div>

                    <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.08] p-4 shadow-[0_32px_100px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-7">
                        <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />
                        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
                        <div className="absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />

                        <div className="relative">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
                                        <Sparkles size={13} />
                                        Secure Access
                                    </p>
                                    <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                                        {mode === 'login' ? 'Welcome back.' : 'Recover access.'}
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                        {mode === 'login'
                                            ? 'Sign in to continue your AI-powered learning workflow.'
                                            : 'Choose old-password verification or console OTP reset.'}
                                    </p>
                                </div>
                            </div>

                            {(error || message) && (
                                <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
                                    <div className="flex items-start gap-2">
                                        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                                        <span>{error || message}</span>
                                    </div>
                                </div>
                            )}

                             {mode === 'login' && (
                                 <div className="relative mb-5 grid rounded-full border border-white/10 bg-[#070b13] p-1 shadow-inner">
                                     <span className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r transition-all duration-300 ${isAdminLogin ? 'from-violet-500 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.35)] translate-x-full' : 'from-teal-400 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.35)] translate-x-0'}`} />
                                     <div className="relative z-10 grid grid-cols-2">
                                         <button type="button" onClick={() => setIsAdminLogin(false)} className={`rounded-full px-4 py-2.5 text-sm font-black transition-colors duration-300 ${!isAdminLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                                             Student
                                         </button>
                                         <button type="button" onClick={() => setIsAdminLogin(true)} className={`rounded-full px-4 py-2.5 text-sm font-black transition-colors duration-300 ${isAdminLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                                             Admin
                                         </button>
                                     </div>
                                 </div>
                             )}

                            {mode === 'login' ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Email</label>
                                        <FieldShell icon={Mail}>
                                            <input id="login-email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-4 text-white outline-none placeholder:text-slate-500" />
                                        </FieldShell>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Password</label>
                                        <FieldShell icon={Lock}>
                                            <input id="login-password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-11 text-white outline-none placeholder:text-slate-500" />
                                            <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
                                        </FieldShell>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <button type="button" onClick={() => { setMode('reset'); switchResetMethod('oldPassword'); }} className="text-sm font-black text-cyan-300 transition hover:text-cyan-100">
                                            Forgot password?
                                        </button>
                                    </div>

                                    <ShineButton disabled={!canLogin}>
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={17} /></>}
                                    </ShineButton>
                                </form>
                            ) : (
                                <form onSubmit={resetMethod === 'oldPassword' ? handleResetWithOldPassword : handleResetOtp} className="space-y-4">
                                    <div className="relative grid rounded-full border border-white/15 bg-[#0b1220]/80 p-1">
                                        <span className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-transform duration-300 ${resetMethod === 'otp' ? 'translate-x-full' : 'translate-x-0'}`} />
                                        <div className="relative z-10 grid grid-cols-2">
                                            <button type="button" onClick={() => switchResetMethod('oldPassword')} className={`rounded-full px-3 py-2.5 text-sm font-black transition ${resetMethod === 'oldPassword' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                                                Old Password
                                            </button>
                                            <button type="button" onClick={() => switchResetMethod('otp')} className={`rounded-full px-3 py-2.5 text-sm font-black transition ${resetMethod === 'otp' ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                                                OTP Reset
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Email</label>
                                        <FieldShell icon={Mail}>
                                            <input id="reset-email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-4 text-white outline-none placeholder:text-slate-500" />
                                        </FieldShell>
                                    </div>

                                    {resetMethod === 'oldPassword' && (
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Old password</label>
                                            <FieldShell icon={Lock}>
                                                <input id="old-password" name="current-password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} type={showOldPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-11 text-white outline-none placeholder:text-slate-500" />
                                                <PasswordToggle isVisible={showOldPassword} onToggle={() => setShowOldPassword((prev) => !prev)} />
                                            </FieldShell>
                                        </div>
                                    )}

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">New password</label>
                                            <FieldShell icon={Lock}>
                                                <input id="new-password" name="new-password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type={showNewPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-11 text-white outline-none placeholder:text-slate-500" />
                                                <PasswordToggle isVisible={showNewPassword} onToggle={() => setShowNewPassword((prev) => !prev)} />
                                            </FieldShell>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Confirm</label>
                                            <FieldShell icon={Lock}>
                                                <input id="confirm-password" name="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? 'text' : 'password'} placeholder="********" className="w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-11 text-white outline-none placeholder:text-slate-500" />
                                                <PasswordToggle isVisible={showConfirmPassword} onToggle={() => setShowConfirmPassword((prev) => !prev)} />
                                            </FieldShell>
                                        </div>
                                    </div>

                                    <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-300">
                                        Password needs 8+ chars with uppercase, lowercase, number, and symbol.
                                    </p>

                                    {resetMethod === 'otp' && otpRequested && (
                                        <div>
                                            <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Console OTP code</label>
                                            <FieldShell>
                                                <input id="reset-otp" name="one-time-code" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" className="w-full rounded-2xl bg-transparent px-4 py-3.5 text-center font-mono tracking-[0.4em] text-white outline-none placeholder:text-slate-500" />
                                            </FieldShell>
                                        </div>
                                    )}

                                    {resetMethod === 'oldPassword' ? (
                                        <ShineButton disabled={!isOldPasswordResetValid || loading}>
                                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify Old Password and Reset'}
                                        </ShineButton>
                                    ) : (
                                        !otpRequested ? (
                                            <ShineButton type="button" disabled={!canRequestOtp} onClick={handleRequestOtp}>
                                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Request Console OTP'}
                                            </ShineButton>
                                        ) : (
                                            <div className="grid gap-3">
                                                <ShineButton disabled={!canResetOtp}>
                                                    {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify OTP and Reset'}
                                                </ShineButton>
                                                <button type="button" disabled={!canRequestOtp} onClick={handleRequestOtp} className="touch-target rounded-2xl border border-cyan-300/25 bg-cyan-300/10 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50">
                                                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
                                                </button>
                                            </div>
                                        )
                                    )}

                                    <button type="button" onClick={switchToLogin} className="touch-target w-full rounded-2xl border border-white/15 bg-white/[0.05] py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.09] hover:text-white">
                                        Back to Login
                                    </button>
                                </form>
                            )}

                             <div className="mt-6 border-t border-white/10 pt-5">
                                 {/* Premium Testimonial Card */}
                                 <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090d16]/60 p-4 transition-all duration-500 hover:border-cyan-500/20">

                                     <div className="h-[3.5rem] flex flex-col justify-center">
                                         <p className="text-slate-300 text-sm italic font-medium leading-relaxed transition-all duration-500">
                                             "{socialProof[activeTestimonial].quote}"
                                         </p>
                                     </div>
                                     <div className="mt-3 flex items-center justify-between">
                                         <span className="text-xs font-black text-cyan-300 tracking-wide uppercase">
                                             {socialProof[activeTestimonial].author}
                                         </span>
                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                             {socialProof[activeTestimonial].role}
                                         </span>
                                     </div>
                                 </div>
                                 <p className="mt-5 text-center text-sm text-slate-400">
                                     No account yet? <Link to="/register" className="font-black text-cyan-300 transition hover:text-cyan-100">Create one</Link>
                                 </p>
                             </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AuthLogin;
