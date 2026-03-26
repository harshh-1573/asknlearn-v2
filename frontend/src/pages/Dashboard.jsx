import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, BrainCircuit, LogOut, Moon, Sparkles, Sun, Trophy, Waves } from 'lucide-react';

const THEME_KEY = 'asknlearn_theme';

const Dashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'User';
    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    const handleLogout = () => {
        sessionStorage.removeItem('asknlearn_active_material');
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className={`min-h-screen overflow-hidden ${lightMode ? 'bg-[#f5f7fb] text-slate-900' : 'bg-[#07111f] text-white'}`}>
            <div className={`absolute inset-0 ${lightMode ? 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.10),transparent_28%),radial-gradient(circle_at_center,rgba(251,191,36,0.08),transparent_32%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.15),transparent_28%),radial-gradient(circle_at_center,rgba(251,191,36,0.08),transparent_32%)]'}`} />

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-10">
                <div className="flex items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-3">
                        <div className={`rounded-2xl p-3 border ${lightMode ? 'bg-white border-slate-200' : 'bg-white/10 border-white/10'}`}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className={`text-xs uppercase tracking-[0.3em] ${lightMode ? 'text-sky-700/70' : 'text-cyan-200/70'}`}>ASKNLEARN</p>
                            <h1 className="text-xl md:text-2xl font-black">Study Dashboard</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(lightMode ? 'dark' : 'light')}
                            className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${lightMode ? 'bg-white border-slate-200 text-slate-900' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}
                        >
                            <span className="inline-flex items-center gap-2">{lightMode ? <Moon size={15} /> : <Sun size={15} />} Theme</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${lightMode ? 'bg-white border-slate-200 text-slate-900' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}
                        >
                            <span className="inline-flex items-center gap-2"><LogOut size={15} /> Sign Out</span>
                        </button>
                    </div>
                </div>

                <section className={`rounded-[2rem] p-6 md:p-10 mb-8 border ${lightMode ? 'border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(168,85,247,0.12),rgba(244,114,182,0.10))]' : 'border-white/10 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(168,85,247,0.2),rgba(244,114,182,0.16))]'}`}>
                    <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr] items-center">
                        <div>
                            <p className={`text-sm uppercase tracking-[0.28em] mb-3 ${lightMode ? 'text-sky-700/70' : 'text-cyan-100/70'}`}>Learning Control Center</p>
                            <h2 className="text-4xl md:text-6xl font-black leading-tight">
                                Welcome back, {username.split(' ')[0]}.
                            </h2>
                            <p className={`mt-4 text-base md:text-lg max-w-2xl ${lightMode ? 'text-slate-700' : 'text-white/80'}`}>
                                Choose your next mode: generate AI-powered study material or take database-backed CS quizzes with progress tracking.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-3xl p-4 border ${lightMode ? 'bg-white border-slate-200' : 'bg-white/10 border-white/10'}`}>
                                <Waves size={20} className="text-cyan-200 mb-3" />
                                <p className={`text-sm ${lightMode ? 'text-slate-500' : 'text-white/70'}`}>Flow</p>
                                <p className="text-2xl font-black">AI + Quiz</p>
                            </div>
                            <div className={`rounded-3xl p-4 border ${lightMode ? 'bg-white border-slate-200' : 'bg-white/10 border-white/10'}`}>
                                <Trophy size={20} className="text-amber-200 mb-3" />
                                <p className={`text-sm ${lightMode ? 'text-slate-500' : 'text-white/70'}`}>Mode</p>
                                <p className="text-2xl font-black">Practice</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('asknlearn_active_material');
                            navigate('/ai-upload');
                        }}
                        className={`group text-left rounded-[2rem] p-6 md:p-8 hover:translate-y-[-2px] transition-all border ${lightMode ? 'border-sky-200 bg-[linear-gradient(145deg,rgba(224,242,254,0.95),rgba(240,249,255,0.98))]' : 'border-cyan-300/15 bg-[linear-gradient(145deg,rgba(12,74,110,0.65),rgba(8,47,73,0.92))]'}`}
                    >
                        <div className="flex items-start justify-between gap-3 mb-8">
                            <div className="rounded-3xl bg-cyan-400/12 border border-cyan-300/20 p-4 text-cyan-200">
                                <BrainCircuit size={30} />
                            </div>
                            <ArrowRight className="text-white/40 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black mb-3">AI Study</h3>
                        <p className={`leading-7 mb-5 ${lightMode ? 'text-slate-600' : 'text-white/75'}`}>
                            Upload PDFs, text, URLs, or notes and generate summaries, quizzes, flashcards, WH questions, mind maps, and contextual AI chat.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${lightMode ? 'bg-sky-100 text-sky-700' : 'bg-white/10 text-cyan-100/80'}`}>AskNLearn</span>
                            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${lightMode ? 'bg-sky-100 text-sky-700' : 'bg-white/10 text-cyan-100/80'}`}>Study Generator</span>
                        </div>
                    </button>

                    <button
                        onClick={() => navigate('/cs-quiz-master')}
                        className={`group text-left rounded-[2rem] p-6 md:p-8 hover:translate-y-[-2px] transition-all border ${lightMode ? 'border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(240,253,250,0.98))]' : 'border-emerald-300/15 bg-[linear-gradient(145deg,rgba(20,83,45,0.65),rgba(6,78,59,0.92))]'}`}
                    >
                        <div className="flex items-start justify-between gap-3 mb-8">
                            <div className="rounded-3xl bg-emerald-400/12 border border-emerald-300/20 p-4 text-emerald-200">
                                <BookOpenCheck size={30} />
                            </div>
                            <ArrowRight className="text-white/40 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-3xl md:text-4xl font-black mb-3">CS Quiz Master</h3>
                        <p className={`leading-7 mb-5 ${lightMode ? 'text-slate-600' : 'text-white/75'}`}>
                            Practice subject-wise quizzes from MySQL with timer control, answer review, scoring history, and progress insights.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${lightMode ? 'bg-emerald-100 text-emerald-700' : 'bg-white/10 text-emerald-100/80'}`}>Quiz Engine</span>
                            <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${lightMode ? 'bg-emerald-100 text-emerald-700' : 'bg-white/10 text-emerald-100/80'}`}>Progress Tracking</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
