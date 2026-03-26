import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowRight, BookOpenCheck, BrainCircuit, LogOut, Moon, Sparkles, Sun, 
    User, Shield, History, Settings, Trophy, LayoutDashboard, Bookmark, Target, Phone, Mail, Award, Loader2, Save
} from 'lucide-react';

const THEME_KEY = 'asknlearn_theme';
const API = 'http://localhost:5000';

const Dashboard = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId') || '0';
    const rawUsername = localStorage.getItem('username') || 'Student';
    
    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';
    
    // Sidebar Navigation State
    const [activeTab, setActiveTab] = useState('overview');
    
    // Profile State
    const [profile, setProfile] = useState({ name: rawUsername, email: '', phone: '', bio: '', language: 'English', xp_points: 0 });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaveMsg, setProfileSaveMsg] = useState('');

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
            } catch (err) {
                console.error('Failed to load profile details.');
            }
        };
        fetchProfile();
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
        } catch (err) {
            setProfileSaveMsg('Failed to update profile.');
            setTimeout(() => setProfileSaveMsg(''), 3000);
        } finally {
            setProfileLoading(false);
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
                    {renderNavButton('courses', <BookOpenCheck size={18} />, 'My Library')}
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
                            <div className={`rounded-[2rem] p-6 md:p-8 space-y-4 hover:shadow-lg transition-all ${ui.card}`}>
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-4"><Shield className="text-rose-500" size={20} /> Security Settings</h3>
                                <p className={`text-sm ${ui.muted}`}>Update your password and manage login authentication.</p>
                                <button className="px-6 py-3 rounded-xl border-2 border-rose-500 text-rose-500 font-bold text-sm hover:bg-rose-500 hover:text-white transition-colors uppercase tracking-wider active:scale-95 shadow-lg shadow-rose-500/10">Change Password</button>
                            </div>
                        </div>
                    )}

                    {/* COMING SOON TABS */}
                    {['courses', 'performance', 'certificates'].includes(activeTab) && (
                        <div className={`rounded-[2rem] p-12 text-center flex flex-col items-center justify-center border-dashed border-2 animate-[fadeIn_0.4s_ease-out] min-h-[400px] ${lightMode ? 'bg-slate-50 border-slate-300' : 'bg-white/5 border-white/10'}`}>
                            <div className="w-24 h-24 rounded-[2rem] bg-cyan-500/10 flex items-center justify-center text-cyan-500 mb-6 rotate-12 hover:rotate-0 transition-transform duration-500 shadow-xl">
                                <Bookmark size={40} />
                            </div>
                            <h2 className="text-3xl font-black mb-3">Module Under Construction</h2>
                            <p className={`max-w-md mx-auto leading-relaxed ${ui.muted}`}>This entire segment is scheduled for Phase 3! We are building your beautiful gamified timeline right now.</p>
                            <button onClick={() => setActiveTab('overview')} className="mt-8 px-6 py-3.5 rounded-xl bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-1 active:scale-95">Return to Overview</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
