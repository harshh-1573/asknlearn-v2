import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, BookOpenCheck, BrainCircuit, LogOut, Moon, Sparkles, Sun,
    Settings, Trophy, LayoutDashboard, Bookmark, Target, Calendar, Star,
    Award, Loader2, CheckCircle2, BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const THEME_KEY = 'asknlearn_theme';
const API = 'http://localhost:5000';

const StudyPlanner = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId') || '0';
    const rawUsername = localStorage.getItem('username') || 'Student';

    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const [profile, setProfile] = useState({ name: rawUsername, xp_points: 0, streak_count: 0 });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId || userId === '0') return;
            try {
                const res = await axios.get(`${API}/api/user/profile/${userId}`);
                if (res.data.profile && res.data.profile.length > 0) {
                    setProfile(res.data.profile[0]);
                    if (res.data.profile[0].name) localStorage.setItem('username', res.data.profile[0].name);
                }
            } catch {
                console.error('Failed to load planner profile snapshot.');
            }
        };
        fetchProfile();
    }, [userId]);

    const [form, setForm] = useState({
        examName: '',
        examDate: '',
        subjects: '',
        dailyHours: '4',
        weakTopics: '',
    });

    const [loading, setLoading] = useState(false);
    const [planMarkdown, setPlanMarkdown] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPlanMarkdown('');

        try {
            const prompt = `You are a concise AI Study Planner. Generate a STRICT, compact study schedule.

STRICT RULES — follow exactly:
- Total output must be under 400 words. No exceptions.
- NO long introductions, no motivational paragraphs, no closing remarks.
- Output ONLY: 1 short strategy line + a day-by-day table or bullet list.
- Each day entry: Day name → subject/topic → hours. Maximum 1 line per day.
- Prioritize weak topics prominently.
- Use Markdown: bold day names, bullet points. NO walls of text.

Input:
- Exam: ${form.examName}
- Target Date: ${form.examDate}
- Subjects: ${form.subjects}
- Daily Hours: ${form.dailyHours} hrs
- Weak Topics: ${form.weakTopics || 'None'}

Output format example (follow this exactly):
**Strategy:** [1 sentence max]

**Week 1**
- **Mon** – Subject A: Topic X (2h), Subject B: Topic Y (2h)
- **Tue** – Subject C: Topic Z (3h), Revision (1h)
...`;

            const res = await axios.post(`${API}/api/ai/chat`, {
                userId,
                materialId: null,
                question: prompt,
                language: 'English',
                socraticMode: false,
            });

            if (res.data?.answer) {
                setPlanMarkdown(res.data.answer);
            } else {
                setError('Failed to generate study plan.');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'An error occurred while generating your plan.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('asknlearn_active_material');
        localStorage.clear();
        navigate('/login');
    };

    const ui = lightMode
        ? {
            bg: 'bg-[#f5f7fb]',
            text: 'text-slate-900',
            sidebar: 'bg-white border-r border-slate-200 shadow-[10px_0_30px_rgba(0,0,0,0.03)]',
            card: 'bg-white border border-slate-200 shadow-sm',
            muted: 'text-slate-500',
            input: 'bg-slate-50 border-slate-200 text-slate-900',
            btnActive: 'bg-[linear-gradient(120deg,#06b6d4,#2563eb)] text-white shadow-md',
            btnHover: 'hover:bg-slate-50',
            formBg: 'bg-white border border-slate-200',
            outputBg: 'bg-slate-50 border border-slate-200',
        }
        : {
            bg: 'bg-[#0a0f18]',
            text: 'text-white',
            sidebar: 'bg-[#0f172a]/90 backdrop-blur-2xl border-r border-white/10 shadow-[10px_0_30px_rgba(0,0,0,0.2)]',
            card: 'bg-white/5 border border-white/10 backdrop-blur-xl',
            muted: 'text-neutral-400',
            input: 'bg-black/30 border-white/10 text-white',
            btnActive: 'bg-[linear-gradient(120deg,#0ea5e9,#6366f1)] text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]',
            btnHover: 'hover:bg-white/5',
            formBg: 'bg-white/5 border border-white/10 backdrop-blur-xl',
            outputBg: 'bg-black/20 border border-white/5',
        };

    const navItems = [
        { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Overview', path: '/dashboard' },
        { id: 'leaderboard', icon: <Star size={18} />, label: 'Leaderboard', path: '/dashboard' },
        { id: 'courses', icon: <BookOpenCheck size={18} />, label: 'My Library', path: '/dashboard' },
        { id: 'study-planner', icon: <Calendar size={18} />, label: 'Study Planner (AI)', path: '/study-planner' },
        { id: 'performance', icon: <Target size={18} />, label: 'Performance', path: '/dashboard' },
        { id: 'certificates', icon: <Award size={18} />, label: 'Achievements', path: '/dashboard' },
    ];

    return (
        <div className={`min-h-screen flex overflow-hidden transition-colors duration-500 ${ui.bg} ${ui.text}`}>
            {/* Global Background Gradients */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${lightMode ? 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.15),transparent_30%)]'}`} />

            {/* ─── Sidebar ─── */}
            <aside className={`relative z-20 hidden md:flex flex-col w-72 h-screen p-5 transition-all duration-500 ${ui.sidebar}`}>
                {/* Branding */}
                <div className="flex items-center gap-3 mb-10 px-2 mt-4 hover:scale-105 transition-transform duration-300 cursor-default">
                    <div className="rounded-2xl p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">AskNLearn</h1>
                        <p className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>Student Portal</p>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 space-y-2">
                    {navItems.map(({ id, icon, label, path }) => {
                        const isActive = id === 'study-planner';
                        return (
                            <button
                                key={id}
                                onClick={() => {
                                    if (path === '/study-planner') return; // already here
                                    // Navigate to dashboard and set tab
                                    if (path === '/dashboard') {
                                        navigate('/dashboard', { state: { tab: id } });
                                    } else {
                                        navigate(path);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                                    isActive ? ui.btnActive : `text-current ${ui.btnHover}`
                                }`}
                            >
                                {icon}
                                <span className="font-semibold text-sm tracking-wide">{label}</span>
                            </button>
                        );
                    })}

                    <div className="pt-6 pb-2 px-4">
                        <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Preferences</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard', { state: { tab: 'settings' } })}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] text-current ${ui.btnHover}`}
                    >
                        <Settings size={18} />
                        <span className="font-semibold text-sm tracking-wide">Profile &amp; Settings</span>
                    </button>
                </nav>

                {/* Bottom Controls */}
                <div className="mt-auto pt-6 border-t border-slate-200/20 space-y-2">
                    <button
                        onClick={() => setTheme(lightMode ? 'dark' : 'light')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${ui.btnHover} active:scale-95`}
                    >
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="font-semibold text-sm text-left flex-1">{lightMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-colors active:scale-95"
                    >
                        <LogOut size={18} />
                        <span className="font-semibold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 h-screen overflow-y-auto relative z-10 scroll-smooth">
                {/* Mobile Header */}
                <header className={`md:hidden flex items-center justify-between p-5 border-b backdrop-blur-xl sticky top-0 z-30 transition-colors ${lightMode ? 'bg-white/80 border-slate-200' : 'bg-[#0f172a]/80 border-white/10'}`}>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Sparkles className="text-cyan-500" size={18} /> AskNLearn
                    </h1>
                    <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className="p-2 active:scale-90 transition-transform">
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </header>

                <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">

                    {/* ─── Header Greeting ─── */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-[slideInUp_0.4s_ease-out]">
                        <div>
                            <p className="text-sm tracking-widest uppercase font-bold text-cyan-500 mb-1">Welcome Back</p>
                            <h2 className="text-4xl md:text-5xl font-black transition-all">
                                {profile.name ? profile.name.split(' ')[0] : 'Student'}! 👋
                            </h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-3 rounded-[2rem] flex items-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${ui.card}`}>
                                <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"><path d="M12 2c0 0-4.5 4.5-5 9.5C6.5 16 8.5 22 12 22s5.5-6 5-10.5C16.5 6.5 12 2 12 2zM12 19c-1.5 0-2.5-1.5-2.5-3 0-2 2-4 2-4s1 1 1 2.5C12.5 16 13.5 17.5 12 19z"/></svg>
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Streak</p>
                                    <p className="text-xl font-black text-orange-500">{profile.streak_count || 0} <span className="text-sm font-semibold opacity-50">Days</span></p>
                                </div>
                            </div>
                            <div className={`px-5 py-3 rounded-[2rem] flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg ${ui.card}`}>
                                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                                    <Trophy className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Total XP</p>
                                    <p className="text-xl font-black text-amber-500">{profile.xp_points || 0} <span className="text-sm font-semibold opacity-50">Pts</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Page Title ─── */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-purple-500/20">
                            <Calendar size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">AI Study Planner</h3>
                            <p className={`text-sm font-medium ${ui.muted}`}>
                                Generate a personalized, day-by-day algorithmic timetable customized to your exams, target dates, and learning weaknesses.
                            </p>
                        </div>
                    </div>

                    {/* ─── Main Grid ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Panel: Input Form */}
                        <div className="lg:col-span-4 space-y-6">
                            <form
                                onSubmit={handleGenerate}
                                className={`p-6 sm:p-8 rounded-[2.5rem] shadow-xl space-y-6 ${ui.formBg}`}
                            >
                                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                                    <Target className="text-sky-400" size={20} />
                                    <h4 className="text-lg font-bold">Goal Parameters</h4>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-2xl font-semibold">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Target Exam / Goal</label>
                                        <input
                                            required name="examName" value={form.examName} onChange={handleChange}
                                            placeholder="e.g. GATE 2026, Final Sem"
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600 ${ui.input}`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Exam Date</label>
                                        <input
                                            type="date" required name="examDate" value={form.examDate} onChange={handleChange}
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all [color-scheme:dark] ${ui.input}`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Subjects to Cover</label>
                                        <textarea
                                            required name="subjects" value={form.subjects} onChange={handleChange} rows="2"
                                            placeholder="e.g. OS, DBMS, Networks, Data Structures"
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all resize-none placeholder:text-slate-600 ${ui.input}`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${ui.muted}`}>
                                            <span>Daily Study Hours</span>
                                            <span className="text-purple-400">{form.dailyHours} hrs</span>
                                        </label>
                                        <input
                                            type="range" min="1" max="16" required name="dailyHours" value={form.dailyHours} onChange={handleChange}
                                            className="w-full accent-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Weak Topics (Optional)</label>
                                        <input
                                            name="weakTopics" value={form.weakTopics} onChange={handleChange}
                                            placeholder="e.g. SQL deadlocks, CPU Scheduling"
                                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-600 ${ui.input}`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit" disabled={loading}
                                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                    {loading ? 'Orchestrating Plan...' : 'Generate Plan'}
                                </button>
                            </form>
                        </div>

                        {/* Right Panel: Output */}
                        <div className={`lg:col-span-8 flex flex-col items-center justify-center p-6 sm:p-10 rounded-[2.5rem] relative overflow-hidden min-h-[500px] ${ui.outputBg}`}>

                            {!planMarkdown && !loading && (
                                <div className="text-center opacity-40 flex flex-col items-center">
                                    <BrainCircuit size={64} className="mb-4" />
                                    <h3 className="text-2xl font-black tracking-tight mb-2">Awaiting Parameters</h3>
                                    <p className="text-sm font-medium">Fill out the goal parameters to let the AI build your timeline.</p>
                                </div>
                            )}

                            {loading && (
                                <div className="flex flex-col items-center justify-center gap-6 animate-pulse z-10">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-3xl opacity-30 animate-ping"></div>
                                        <div className="relative p-6 bg-white/5 border border-white/10 rounded-full shadow-2xl backdrop-blur-xl">
                                            <Loader2 className="animate-spin text-purple-400" size={48} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-center mt-4">
                                        <p className="text-lg font-bold">Structuring Timeline...</p>
                                        <p className={`text-sm ${ui.muted}`}>Our AI is analyzing your subjects and balancing the load.</p>
                                    </div>
                                </div>
                            )}

                            {planMarkdown && !loading && (
                                <div className="w-full h-full relative z-10 flex flex-col">
                                    <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                                        <CheckCircle2 className="text-emerald-400" size={28} />
                                        <h4 className="text-2xl font-black">Your Master Plan</h4>
                                    </div>
                                    <div className="prose prose-invert prose-purple max-w-none w-full flex-1 overflow-y-auto pr-2">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {planMarkdown}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudyPlanner;
