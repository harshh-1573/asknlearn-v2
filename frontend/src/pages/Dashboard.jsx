import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowRight, BookOpenCheck, BrainCircuit, LogOut, Moon, Sparkles, Sun,
    User, Shield, History, Settings, Trophy, LayoutDashboard, Bookmark, Target, Phone, Mail, Award, Loader2, Save, FileText, Folder, Calendar, Star, Hexagon, BarChart3, Check, Boxes
} from 'lucide-react';

const THEME_KEY = 'asknlearn_theme';
const API = 'http://localhost:5000';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('userId') || '0';
    const rawUsername = localStorage.getItem('username') || 'Student';

    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';

    // Sidebar Navigation State — support deep-link from other pages via location.state.tab
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'overview');

    // Profile State
    const [profile, setProfile] = useState({ name: rawUsername, email: '', phone: '', bio: '', language: 'English', xp_points: 0 });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaveMsg, setProfileSaveMsg] = useState('');
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState('');

    const [stats, setStats] = useState({ quiz: { total_quizzes: 0, total_score: 0, total_questions: 0 }, ai: { total_materials: 0 }, heatmap: [] });
    const [library, setLibrary] = useState([]);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    const [aiReport, setAiReport] = useState(null);
    const [aiReportLoading, setAiReportLoading] = useState(false);

    const generateAiReport = async () => {
        setAiReportLoading(true);
        try {
            const res = await axios.get(`${API}/api/ai/performance-report/${userId}`);
            setAiReport(res.data.report || 'Unable to generate report.');
        } catch {
            setAiReport('Error generating your report. The AI tutor might be offline.');
        } finally {
            setAiReportLoading(false);
        }
    };

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) return;
            try {
                const res = await axios.get(`${API}/api/user/profile/${userId}`);
                if (res.data.profile && res.data.profile.length > 0) {
                    setProfile(res.data.profile[0]);
                    if (res.data.profile[0].name) localStorage.setItem('username', res.data.profile[0].name);
                }
            } catch {
                console.error('Failed to load profile details.');
            }
        };
        fetchProfile();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const fetchDashboardData = async () => {
            try {
                const [statsRes, libRes, leaderRes] = await Promise.all([
                    axios.get(`${API}/api/user/dashboard-stats/${userId}`),
                    axios.get(`${API}/api/ai/library/${userId}`),
                    axios.get(`${API}/api/user/leaderboard?limit=10`)
                ]);
                setStats(statsRes.data);
                setLibrary(libRes.data.materials || []);
                setLeaderboard(leaderRes.data.leaderboard || []);
            } catch {
                console.error('Failed to load dashboard data');
            }
        };
        fetchDashboardData();
    }, [userId]);

    const handleLogout = () => {
        sessionStorage.removeItem('asknlearn_active_material');
        localStorage.clear();
        navigate('/login');
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            await axios.put(`${API}/api/user/profile/${userId}`, profile);
            setProfileSaveMsg('Profile updated successfully!');
            localStorage.setItem('username', profile.name);
            setTimeout(() => setProfileSaveMsg(''), 3000);
        } catch {
            setProfileSaveMsg('Failed to update profile.');
            setTimeout(() => setProfileSaveMsg(''), 3000);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMsg('');

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordMsg('Fill in all password fields.');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            setPasswordMsg('New password must be at least 8 characters long.');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordMsg('New password and confirmation do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API}/api/auth/change-password`,
                {
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                }
            );
            setPasswordMsg('Password changed successfully.');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordMsg(err.response?.data?.error || 'Failed to change password.');
        } finally {
            setPasswordLoading(false);
            setTimeout(() => setPasswordMsg(''), 4000);
        }
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
            btnHover: 'hover:bg-slate-50'
        }
        : {
            bg: 'bg-[#0a0f18]',
            text: 'text-white',
            sidebar: 'bg-[#0f172a]/90 backdrop-blur-2xl border-r border-white/10 shadow-[10px_0_30px_rgba(0,0,0,0.2)]',
            card: 'bg-white/5 border border-white/10 backdrop-blur-xl',
            muted: 'text-neutral-400',
            input: 'bg-black/30 border-white/10 text-white',
            btnActive: 'bg-[linear-gradient(120deg,#0ea5e9,#6366f1)] text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]',
            btnHover: 'hover:bg-white/5'
        };

    const renderNavButton = (id, icon, label) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                activeTab === id ? ui.btnActive : `text-current ${ui.btnHover}`
            }`}
        >
            {icon}
            <span className="font-semibold text-sm tracking-wide">{label}</span>
        </button>
    );

    return (
        <div className={`min-h-screen flex overflow-hidden transition-colors duration-500 ${ui.bg} ${ui.text}`}>
            {/* Global Background Particles/Gradients */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${lightMode ? 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.15),transparent_30%)]'}`} />

            {/* Sidebar Navigation */}
            <aside className={`relative z-20 hidden md:flex flex-col w-72 h-screen p-5 transition-all duration-500 ${ui.sidebar}`}>
                <div className="flex items-center gap-3 mb-10 px-2 mt-4 hover:scale-105 transition-transform duration-300 cursor-default">
                    <div className="rounded-2xl p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">AskNLearn</h1>
                        <p className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>Student Portal</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {renderNavButton('overview', <LayoutDashboard size={18} />, 'Overview')}
                    {renderNavButton('leaderboard', <Star size={18} />, 'Leaderboard')}
                    {renderNavButton('courses', <BookOpenCheck size={18} />, 'My Library')}

                    <button
                        onClick={() => navigate('/study-planner')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] text-current ${ui.btnHover}`}
                    >
                        <Calendar size={18} />
                        <span className="font-semibold text-sm tracking-wide">Study Planner (AI)</span>
                    </button>

                    {renderNavButton('performance', <Target size={18} />, 'Performance')}
                    {renderNavButton('certificates', <Award size={18} />, 'Achievements')}
                    <div className="pt-6 pb-2 px-4">
                        <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Preferences</p>
                    </div>
                    {renderNavButton('settings', <Settings size={18} />, 'Profile & Settings')}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-200/20 dark:border-white/10 space-y-2">
                    <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${ui.btnHover} active:scale-95`}>
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="font-semibold text-sm text-left flex-1">{lightMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-colors active:scale-95">
                        <LogOut size={18} />
                        <span className="font-semibold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-screen overflow-y-auto relative z-10 scroll-smooth">
                {/* Mobile Header */}
                <header className={`md:hidden flex items-center justify-between p-5 border-b backdrop-blur-xl sticky top-0 z-30 transition-colors ${lightMode ? 'bg-white/80 border-slate-200' : 'bg-[#0f172a]/80 border-white/10'}`}>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2"><Sparkles className="text-cyan-500" size={18} /> AskNLearn</h1>
                    <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className="p-2 active:scale-90 transition-transform">
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </header>

                <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">

                    {/* Header Greeting */}
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

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-[fadeIn_0.6s_ease-out]">
                            {/* Key Action Buttons */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <button onClick={() => { sessionStorage.removeItem('asknlearn_active_material'); navigate('/ai-upload'); }}
                                    className={`group text-left rounded-[2rem] p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 active:scale-95 ${lightMode ? 'bg-[linear-gradient(145deg,#e0f2fe,#f0f9ff)] border border-sky-200' : 'bg-[linear-gradient(145deg,rgba(14,165,233,0.1),rgba(2,132,199,0.2))] border border-sky-400/20 shadow-[0_10px_30px_rgba(2,132,199,0.15)]'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-6">
                                        <div className="p-4 rounded-2xl bg-sky-500/20 text-sky-500 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                                            <BrainCircuit size={32} />
                                        </div>
                                        <ArrowRight className="opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-2 tracking-tight">AI Study Tools</h3>
                                    <p className={`text-sm leading-relaxed mb-6 h-12 ${ui.muted}`}>Generate incredibly accurate custom flashcards, MCQs, and access your Socratic Tutor instantly.</p>
                                    <span className="text-xs font-bold uppercase bg-sky-500 text-white px-4 py-2 rounded-full inline-flex items-center shadow-lg shadow-sky-500/30 group-hover:bg-sky-400 transition-colors">Launch Module</span>
                                </button>

                                <button onClick={() => navigate('/cs-quiz-master')}
                                    className={`group text-left rounded-[2rem] p-8 hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 active:scale-95 ${lightMode ? 'bg-[linear-gradient(145deg,#ecfdf5,#f0fdf4)] border border-emerald-200' : 'bg-[linear-gradient(145deg,rgba(16,185,129,0.1),rgba(4,120,87,0.2))] border border-emerald-400/20 shadow-[0_10px_30px_rgba(4,120,87,0.15)]'}`}>
                                    <div className="flex items-start justify-between gap-3 mb-6">
                                        <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                            <BookOpenCheck size={32} />
                                        </div>
                                        <ArrowRight className="opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" />
                                    </div>
                                    <h3 className="text-3xl font-black mb-2 tracking-tight">CS Quiz Master</h3>
                                    <p className={`text-sm leading-relaxed mb-6 h-12 ${ui.muted}`}>Test your Computer Science knowledge safely against our massive backend database.</p>
                                    <span className="text-xs font-bold uppercase bg-emerald-500 text-white px-4 py-2 rounded-full inline-flex items-center shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-400 transition-colors">Start Assessment</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* LEADERBOARD TAB */}
                    {activeTab === 'leaderboard' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex items-center gap-3 mb-6">
                                <Star className="text-amber-500" size={28} />
                                <h2 className="text-3xl font-black tracking-tight">Global Leaderboard</h2>
                            </div>
                            <div className={`rounded-[2rem] overflow-hidden shadow-lg ${ui.card}`}>
                                <table className="w-full text-left">
                                    <thead className={`bg-black/5 dark:bg-white/5 text-xs uppercase font-bold tracking-wider border-b border-black/10 dark:border-white/10 ${ui.muted}`}>
                                        <tr>
                                            <th className="p-5 w-20 text-center">Rank</th>
                                            <th className="p-5">Student</th>
                                            <th className="p-5 text-center">Streak</th>
                                            <th className="p-5 text-right w-40">Total XP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                        {leaderboard.map((user, idx) => (
                                            <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-5 text-center font-black">
                                                    {idx === 0 ? <span className="text-amber-500 text-2xl">🥇</span> :
                                                     idx === 1 ? <span className="text-slate-400 text-2xl">🥈</span> :
                                                     idx === 2 ? <span className="text-amber-700 text-2xl">🥉</span> :
                                                     `#${idx + 1}`}
                                                </td>
                                                <td className="p-5">
                                                    <div className="font-bold flex items-center gap-2 text-lg">
                                                        {user.name}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center font-bold text-orange-500 text-lg">{user.streak_count || 0} 🔥</td>
                                                <td className="p-5 text-right font-black text-amber-500 text-lg">{user.xp_points || 0} Pts</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {leaderboard.length === 0 && (
                                    <p className={`p-10 text-center font-bold ${ui.muted}`}>No warriors on the leaderboard yet. Start answering quizzes!</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SETTINGS / PROFILE TAB */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex items-center gap-3">
                                <Settings className="text-cyan-500" size={28} />
                                <h2 className="text-3xl font-black tracking-tight">Profile & Preferences</h2>
                            </div>

                            <form onSubmit={handleSaveProfile} className={`rounded-[2rem] p-6 md:p-8 space-y-6 transition-all hover:shadow-lg ${ui.card}`}>
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-4"><User className="text-cyan-400" size={20} /> Public Identity</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors group-focus-within:text-cyan-500 ${ui.muted}`}>Full Name</label>
                                        <input required value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-sm ${ui.input}`} />
                                    </div>
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}><Mail size={12} className="inline mr-1"/> Email Address</label>
                                        <input disabled value={profile.email || ''} className={`w-full px-4 py-3.5 rounded-xl border opacity-50 cursor-not-allowed shadow-sm ${ui.input}`} />
                                    </div>
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors group-focus-within:text-cyan-500 ${ui.muted}`}><Phone size={12} className="inline mr-1"/> Phone Number</label>
                                        <input value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+1 234 567 890" className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all shadow-sm ${ui.input}`} />
                                    </div>
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors group-focus-within:text-cyan-500 ${ui.muted}`}>Primary Language</label>
                                        <select value={profile.language || 'English'} onChange={e => setProfile({...profile, language: e.target.value})} className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all appearance-none cursor-pointer shadow-sm ${ui.input}`}>
                                            <option value="English">English</option>
                                            <option value="Hindi">Hindi</option>
                                            <option value="Marathi">Marathi</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="group">
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 transition-colors group-focus-within:text-cyan-500 ${ui.muted}`}>Bio / Study Goals</label>
                                    <textarea value={profile.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="What subjects are you focusing on?" rows="3" className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none shadow-sm ${ui.input}`} />
                                </div>

                                <div className="pt-4 flex items-center gap-4 border-t border-white/5 mt-6">
                                    <button type="submit" disabled={profileLoading} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-cyan-500/30 active:scale-95 flex items-center gap-2">
                                        {profileLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        Save Profile
                                    </button>
                                    {profileSaveMsg && <span className="text-emerald-500 font-bold text-sm animate-[pulse_1s_ease-out_3] bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">{profileSaveMsg}</span>}
                                </div>
                            </form>

                            {/* Security Module */}
                            <form onSubmit={handleChangePassword} className={`rounded-[2rem] p-6 md:p-8 space-y-5 hover:shadow-lg transition-all ${ui.card}`}>
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-4"><Shield className="text-rose-500" size={20} /> Security Settings</h3>
                                <p className={`text-sm ${ui.muted}`}>Change your password using your current login credentials.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Current Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all shadow-sm ${ui.input}`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all shadow-sm ${ui.input}`}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${ui.muted}`}>Confirm Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            className={`w-full px-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all shadow-sm ${ui.input}`}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 pt-2">
                                    <button type="submit" disabled={passwordLoading} className="px-6 py-3 rounded-xl border-2 border-rose-500 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-colors uppercase tracking-wider active:scale-95 shadow-lg shadow-rose-500/10 disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-rose-500">
                                        {passwordLoading ? 'Updating...' : 'Change Password'}
                                    </button>
                                    {passwordMsg ? <span className={`text-sm font-semibold px-3 py-2 rounded-lg ${passwordMsg.toLowerCase().includes('success') ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-500 bg-rose-500/10 border border-rose-500/20'}`}>{passwordMsg}</span> : null}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === 'performance' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex items-center gap-3 mb-6">
                                <Target className="text-emerald-500" size={28} />
                                <h2 className="text-3xl font-black tracking-tight">Performance Analytics</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className={`p-6 rounded-[2rem] hover:-translate-y-1 hover:shadow-lg transition-all ${ui.card}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><BookOpenCheck size={24}/></div>
                                        <p className="font-bold text-lg">CS Quizzes</p>
                                    </div>
                                    <p className="text-4xl font-black">{stats.quiz.total_quizzes}</p>
                                    <p className={`text-sm mt-2 ${ui.muted}`}>Total Quizzes Taken</p>
                                </div>
                                <div className={`p-6 rounded-[2rem] hover:-translate-y-1 hover:shadow-lg transition-all ${ui.card}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl"><BarChart3 size={24}/></div>
                                        <p className="font-bold text-lg">Accuracy</p>
                                    </div>
                                    <p className="text-4xl font-black">
                                        {stats.quiz.total_questions > 0
                                            ? Math.round((stats.quiz.total_score / stats.quiz.total_questions) * 100)
                                            : 0}%
                                    </p>
                                    <p className={`text-sm mt-2 ${ui.muted}`}>Overall Correct Answers</p>
                                </div>
                                <div className={`p-6 rounded-[2rem] hover:-translate-y-1 hover:shadow-lg transition-all ${ui.card}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><BrainCircuit size={24}/></div>
                                        <p className="font-bold text-lg">AI Library</p>
                                    </div>
                                    <p className="text-4xl font-black">{stats.ai.total_materials}</p>
                                    <p className={`text-sm mt-2 ${ui.muted}`}>Materials Generated</p>
                                </div>
                            </div>

                            <div className={`mt-8 p-8 rounded-[2rem] border ${lightMode ? 'border-sky-200 bg-sky-50' : 'border-sky-500/20 bg-sky-900/10'} shadow-lg`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-sky-500/20 text-sky-500 rounded-xl"><BrainCircuit size={24}/></div>
                                        <h3 className="text-xl font-black">AI Tutor Insights</h3>
                                    </div>
                                    <button
                                        onClick={generateAiReport}
                                        disabled={aiReportLoading}
                                        className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {aiReportLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                        {aiReportLoading ? 'Analyzing Data...' : 'Generate Performance Report'}
                                    </button>
                                </div>

                                {aiReport && (
                                    <div className={`p-6 rounded-2xl ${lightMode ? 'bg-white border border-slate-200' : 'bg-black/40 border border-white/10'} whitespace-pre-line leading-relaxed text-sm md:text-base`}>
                                        {aiReport}
                                    </div>
                                )}
                                {!aiReport && !aiReportLoading && (
                                    <p className={`text-sm ${ui.muted}`}>Click the button to let the AI analyze your heatmap and assign you a custom study plan.</p>
                                )}
                            </div>

                            <h3 className="text-xl font-bold mt-8 mb-4">Subject Mastery Heatmap</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stats.heatmap.length === 0 ? (
                                    <p className={ui.muted}>No quiz data yet to generate heatmap.</p>
                                ) : (
                                    stats.heatmap.map((h, i) => {
                                        const score = parseFloat(h.average_percentage);
                                        const colorStr = score >= 80 ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' :
                                                         score >= 50 ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' :
                                                         'text-rose-500 border-rose-500/30 bg-rose-500/5';
                                        return (
                                            <div key={i} className={`p-5 rounded-2xl border ${colorStr} flex items-center justify-between`}>
                                                <div>
                                                    <p className="font-bold">{h.subject_name}</p>
                                                    <p className="text-xs opacity-80">{h.total_attempts} attempts</p>
                                                </div>
                                                <p className="text-2xl font-black">{score}%</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* MY LIBRARY TAB */}
                    {activeTab === 'courses' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <BookOpenCheck className="text-sky-500" size={28} />
                                    <h2 className="text-3xl font-black tracking-tight">AI Study Library</h2>
                                </div>
                                {selectedMaterials.length > 0 && (
                                    <span className="text-xs font-bold bg-sky-500/20 text-sky-500 px-3 py-1.5 rounded-xl border border-sky-500/30">
                                        {selectedMaterials.length} / 5 Selected
                                    </span>
                                )}
                            </div>

                            {library.length === 0 ? (
                                <div className={`p-10 text-center rounded-[2rem] border-dashed border-2 ${lightMode ? 'border-slate-300' : 'border-white/10'}`}>
                                    <Folder className="mx-auto mb-4 opacity-50" size={48} />
                                    <p className="text-lg font-bold">Your library is empty</p>
                                    <p className={`text-sm mt-2 ${ui.muted}`}>Generate your first AI study material to see it here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 relative pb-20">
                                    {library.map((mat) => {
                                        const isSelected = selectedMaterials.includes(mat.id);
                                        return (
                                            <div key={mat.id} className="relative group">
                                                <button onClick={() => {
                                                    sessionStorage.setItem('asknlearn_active_material', mat.id);
                                                    navigate('/ai-upload');
                                                }} className={`w-full text-left p-5 rounded-2xl border flex flex-col items-start gap-4 hover:-translate-y-1 hover:shadow-xl transition-all ${isSelected ? 'border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] bg-sky-500/10' : lightMode ? 'bg-white border-slate-200 hover:border-sky-300' : 'bg-white/5 border-white/10 hover:border-sky-500/50'}`}>
                                                    <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm line-clamp-2 leading-tight pr-8">{mat.source_name || mat.filename || 'Untitled Material'}</p>
                                                        <p className={`text-xs mt-2 flex items-center gap-1 ${ui.muted}`}>
                                                            <Calendar size={12}/> {new Date(mat.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </button>
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isSelected) {
                                                            setSelectedMaterials(prev => prev.filter(id => id !== mat.id));
                                                        } else {
                                                            if (selectedMaterials.length >= 5) return alert('Maximum 5 materials allowed in Workspace.');
                                                            setSelectedMaterials(prev => [...prev, mat.id]);
                                                        }
                                                    }}
                                                    className={`absolute top-4 right-4 w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all z-10 ${isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-neutral-500 hover:border-sky-500 bg-black/20'}`}
                                                >
                                                    {isSelected && <Check size={14} strokeWidth={4} />}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Sticky Workspace Launcher bar */}
                                    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${selectedMaterials.length > 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
                                        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-1.5 rounded-full shadow-[0_10px_40px_rgba(2,132,199,0.5)] flex items-center gap-4 pr-6 border border-white/20 backdrop-blur-xl">
                                            <div className="bg-white/20 p-3 rounded-full text-white">
                                                <Boxes size={20} />
                                            </div>
                                            <div className="text-white">
                                                <p className="text-sm font-black tracking-wide">Multi-Doc RAG Active</p>
                                                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">{selectedMaterials.length} Documents Selected</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/20 mx-2"></div>
                                            <button
                                                onClick={() => {
                                                    sessionStorage.setItem('workspace_materials', JSON.stringify(selectedMaterials));
                                                    navigate('/workspace-chat');
                                                }}
                                                className="bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-transform whitespace-nowrap shadow-lg"
                                            >
                                                Launch Workspace
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ACHIEVEMENTS TAB */}
                    {activeTab === 'certificates' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex items-center gap-3 mb-6">
                                <Award className="text-amber-500" size={28} />
                                <h2 className="text-3xl font-black tracking-tight">Trophy Cabinet</h2>
                            </div>

                            {(() => {
                                const xp = profile.xp_points || 0;
                                let tier = "Bronze Novice";
                                let nextTier = 100;
                                let color = "text-orange-400 bg-orange-400/10 border-orange-400/30";
                                let iconColor = "text-orange-400";
                                if (xp >= 5000) { tier = "Diamond Legend"; nextTier = 0; color = "text-cyan-400 bg-cyan-400/10 border-cyan-400/30 shadow-[0_0_30px_rgba(34,211,238,0.3)]"; iconColor = "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]"; }
                                else if (xp >= 1500) { tier = "Platinum Prodigy"; nextTier = 5000; color = "text-slate-200 bg-slate-200/10 border-slate-200/30 shadow-[0_0_20px_rgba(226,232,240,0.2)]"; iconColor = "text-slate-200"; }
                                else if (xp >= 500) { tier = "Gold Master"; nextTier = 1500; color = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]"; iconColor = "text-yellow-400"; }
                                else if (xp >= 100) { tier = "Silver Scholar"; nextTier = 500; color = "text-slate-400 bg-slate-400/10 border-slate-400/30"; iconColor = "text-slate-400"; }

                                const progress = nextTier === 0 ? 100 : Math.min(100, (xp / nextTier) * 100);

                                return (
                                    <div className="flex flex-col items-center justify-center p-10 md:p-16 rounded-[3rem] border bg-[#111] dark:bg-black/40 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_70%)]" />

                                        <div className={`p-8 rounded-[2rem] border-2 mb-8 rotate-3 hover:rotate-0 transition-all duration-500 scale-110 relative ${color}`}>
                                            <div className="absolute inset-0 rounded-[2rem] bg-white mix-blend-overlay opacity-10 animate-pulse"></div>
                                            <Hexagon size={120} className={iconColor} strokeWidth={1} />
                                            <Star size={40} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${iconColor}`} fill="currentColor" />
                                        </div>

                                        <h3 className="text-4xl font-black tracking-widest uppercase mb-2 text-white drop-shadow-md">{tier}</h3>
                                        <p className="text-xl font-bold text-white/70 mb-8">{xp} XP Earned</p>

                                        {nextTier > 0 && (
                                            <div className="w-full max-w-md relative z-10">
                                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 text-white/50">
                                                    <span>Progress to Next Tier</span>
                                                    <span>{xp} / {nextTier} XP</span>
                                                </div>
                                                <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
