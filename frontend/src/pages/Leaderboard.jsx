import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { Trophy, Star, ArrowLeft, Activity, Medal, Shield } from 'lucide-react';

const Leaderboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchLeaderboard = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/user/leaderboard`);
                setUsers(res.data.leaderboard || []);
            } catch (err) {
                setError('Failed to load leaderboard.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [token, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070f] flex items-center justify-center text-white">
                <p className="animate-pulse flex items-center gap-2"><Activity size={20} /> Calculating rankings...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070f] text-white p-6 md:p-10 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <header className="flex items-center gap-4 mb-10 pb-6 border-b border-white/10">
                    <button onClick={() => navigate('/dashboard')} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                            <Trophy size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">Global Leaderboard</h1>
                            <p className="text-sm text-slate-400 font-semibold">Top learners based on XP and streaks</p>
                        </div>
                    </div>
                </header>

                {error ? (
                    <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center">
                        {error}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {users.map((u, idx) => {
                            let rankClass = 'bg-white/5 border-white/10 text-slate-300';
                            let icon = <span className="font-bold w-6 text-center">{idx + 1}</span>;
                            
                            if (idx === 0) {
                                rankClass = 'bg-gradient-to-r from-amber-500/20 to-orange-500/5 whitespace-nowrap border-amber-500/30 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-[1.02] transform';
                                icon = <Medal size={28} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />;
                            } else if (idx === 1) {
                                rankClass = 'bg-gradient-to-r from-slate-300/20 to-slate-400/5 border-slate-300/30 text-slate-100';
                                icon = <Medal size={28} className="text-slate-300" />;
                            } else if (idx === 2) {
                                rankClass = 'bg-gradient-to-r from-orange-700/30 to-amber-900/10 border-orange-700/30 text-orange-200';
                                icon = <Medal size={28} className="text-orange-600" />;
                            }

                            return (
                                <div key={u.id} className={`flex items-center gap-4 p-5 rounded-3xl border backdrop-blur-xl transition ${rankClass}`}>
                                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold truncate">{u.name}</h3>
                                        {idx === 0 && <span className="text-xs uppercase tracking-widest text-amber-500 font-black">Grandmaster</span>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                                            <Shield size={14} className="fill-purple-500/10" />
                                            <span className="font-bold text-xs">Lvl {Math.floor((u.xp_points || 0) / 100) + 1}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-lg">
                                            <Star size={14} className={idx === 0 ? 'text-amber-500' : 'text-slate-400'} />
                                            <span className="font-bold text-sm">{u.xp_points} XP</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
