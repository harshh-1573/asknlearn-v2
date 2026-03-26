import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, BookOpenCheck, Clock3, ListOrdered, Loader2, Sparkles,
    Trophy, TrendingUp, X, BarChart3, History, Target, CheckCircle2
} from 'lucide-react';

const iconPalette = [
    'text-blue-400',
    'text-emerald-400',
    'text-violet-400',
    'text-orange-400',
    'text-pink-400',
    'text-cyan-400',
];

const formatPercentage = (value) => `${Number(value || 0).toFixed(1)}%`;

const CSQuizMaster = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId') || '0';

    const [selectedSubject, setSelectedSubject] = useState(null);
    const [config, setConfig] = useState({ limit: 10, timer: 10 });
    const [dashboard, setDashboard] = useState({
        subjects: [],
        stats: null,
        history: [],
        progress: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/cs-quiz/dashboard/${userId}`);
                setDashboard({
                    subjects: res.data.subjects || [],
                    stats: res.data.stats || null,
                    history: res.data.history || [],
                    progress: res.data.progress || [],
                });
            } catch (err) {
                console.error('Failed to load CS Quiz dashboard:', err);
                setError(err.response?.data?.error || 'Unable to load CS Quiz Master right now.');
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [userId]);

    const progressMap = useMemo(() => {
        const entries = dashboard.progress || [];
        return Object.fromEntries(entries.map((item) => [item.subject_id, item]));
    }, [dashboard.progress]);

    const startQuiz = () => {
        if (!selectedSubject) return;

        navigate(`/quiz/${selectedSubject.id}`, {
            state: {
                limit: config.limit,
                timer: config.timer,
                subjectName: selectedSubject.name,
            },
        });
    };

    const stats = dashboard.stats || {
        total_quizzes: 0,
        total_score: 0,
        total_questions: 0,
        average_percentage: 0,
        best_percentage: 0,
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center">
                <Loader2 className="animate-spin mb-4" size={36} />
                <p className="text-neutral-400">Loading CS Quiz Master...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
                <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-3xl p-10 text-center">
                    <h2 className="text-3xl font-bold mb-4">CS Quiz Master Unavailable</h2>
                    <p className="text-neutral-400 mb-8">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-white text-black hover:bg-neutral-200 py-3 px-6 rounded-xl font-bold transition-all"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 relative overflow-hidden font-sans">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-neutral-500 hover:text-white mb-10 transition-colors text-sm font-medium tracking-wide"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="rounded-[2rem] bg-gradient-to-r from-rose-400 via-orange-300 to-yellow-300 text-black p-8 md:p-10 mb-12 shadow-2xl">
                    <div className="flex items-start gap-4">
                        <div className="bg-white/35 p-3 rounded-2xl">
                            <BookOpenCheck size={34} />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight">CS Quiz Master</h1>
                            <p className="text-black/75 text-lg mt-3 max-w-2xl">
                                Practice subject-wise CS quizzes with customizable question counts, timer control, explanations, answer review, and progress tracking.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 size={24} className="text-white" />
                        <h2 className="text-3xl font-bold tracking-tight">My Progress</h2>
                    </div>
                    <p className="text-neutral-400 mb-8">Track your learning journey and achievements.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <div className="flex items-center gap-2 text-neutral-300 mb-3"><Target size={16} /> Total Quizzes</div>
                            <div className="text-5xl font-black text-indigo-300">{stats.total_quizzes}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <div className="flex items-center gap-2 text-neutral-300 mb-3"><CheckCircle2 size={16} /> Total Score</div>
                            <div className="text-5xl font-black text-indigo-300">{stats.total_score}/{stats.total_questions}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <div className="flex items-center gap-2 text-neutral-300 mb-3"><TrendingUp size={16} /> Average</div>
                            <div className="text-5xl font-black text-indigo-300">{formatPercentage(stats.average_percentage)}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <div className="flex items-center gap-2 text-neutral-300 mb-3"><Trophy size={16} /> Best Score</div>
                            <div className="text-5xl font-black text-indigo-300">{formatPercentage(stats.best_percentage)}</div>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles size={22} className="text-blue-400" />
                        <h2 className="text-3xl font-bold tracking-tight">Choose a Subject</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {dashboard.subjects.map((subject, index) => {
                            const progress = progressMap[subject.id];
                            const accent = iconPalette[index % iconPalette.length];

                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => setSelectedSubject(subject)}
                                    className="group bg-white/5 border border-white/10 p-7 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-left backdrop-blur-xl"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-8">
                                        <div className={`${accent} bg-black/40 p-4 rounded-2xl border border-white/5`}>
                                            <BookOpenCheck size={28} />
                                        </div>
                                        <Sparkles size={18} className="text-neutral-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-3">{subject.name}</h3>
                                    <p className="text-neutral-400 text-sm mb-4">
                                        {subject.question_count} questions available
                                    </p>
                                    {progress ? (
                                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                                            Last progress at question {progress.last_question_id}
                                        </p>
                                    ) : (
                                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                                            Fresh start available
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <History size={22} className="text-orange-300" />
                        <h2 className="text-3xl font-bold tracking-tight">Quiz History</h2>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.9fr] gap-4 px-6 py-4 border-b border-white/10 text-sm text-neutral-400 uppercase tracking-[0.2em]">
                            <div>Subject</div>
                            <div>Date</div>
                            <div>Score</div>
                            <div>Percentage</div>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto">
                            {dashboard.history.length ? dashboard.history.map((item) => (
                                <div
                                    key={item.session_id}
                                    className="grid grid-cols-[1.2fr_1fr_0.9fr_0.9fr] gap-4 px-6 py-4 border-b border-white/5 text-sm"
                                >
                                    <div className="text-white font-medium">{item.subject_name || `Subject ${item.subject_id}`}</div>
                                    <div className="text-neutral-300">{new Date(item.timestamp).toLocaleString()}</div>
                                    <div className="text-white">{item.score}/{item.total_questions}</div>
                                    <div className="text-emerald-300">{formatPercentage(item.percentage)}</div>
                                </div>
                            )) : (
                                <div className="px-6 py-12 text-center text-neutral-500">
                                    No quiz attempts yet. Start one above to build your progress history.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {selectedSubject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl p-10 shadow-2xl relative">
                        <button
                            onClick={() => setSelectedSubject(null)}
                            className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <h3 className="text-3xl font-semibold mb-2">{selectedSubject.name}</h3>
                            <p className="text-neutral-500 text-sm">Customize your test before you begin.</p>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest">
                                    <ListOrdered size={14} /> Questions
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={config.limit}
                                    onChange={(e) => setConfig({ ...config, limit: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                                    className="w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                />
                                <div className="grid grid-cols-4 gap-3">
                                    {[5, 10, 15, 20].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => setConfig({ ...config, limit: num })}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${config.limit === num ? 'bg-white text-black' : 'bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400'}`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 mb-3 uppercase tracking-widest">
                                    <Clock3 size={14} /> Time (Mins)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={config.timer}
                                    onChange={(e) => setConfig({ ...config, timer: Math.max(1, Math.min(120, Number(e.target.value) || 1)) })}
                                    className="w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
                                />
                                <div className="grid grid-cols-4 gap-3">
                                    {[5, 10, 15, 20].map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setConfig({ ...config, timer: time })}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${config.timer === time ? 'bg-white text-black' : 'bg-white/5 border border-white/5 hover:bg-white/10 text-neutral-400'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={startQuiz}
                            className="w-full mt-10 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                        >
                            Start Assessment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CSQuizMaster;
