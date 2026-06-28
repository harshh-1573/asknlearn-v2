import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { io } from 'socket.io-client';
import {
    ArrowRight, BookOpenCheck, BrainCircuit, LogOut, Moon, Sparkles, Sun,
    User, Users, Shield, History, Settings, Trophy, LayoutDashboard, Bookmark, Target, Phone, Mail, Award, Loader2, Save, FileText, Folder, Calendar, Star, Hexagon, BarChart3, Check, Boxes, Menu, X, MessageSquare, Send,
    Paperclip, Mic, Image, Video, Music
} from 'lucide-react';

const THEME_KEY = 'asknlearn_theme';
const API = API_BASE;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('userId') || '0';
    const rawUsername = localStorage.getItem('username') || 'Student';

    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';

    // Sidebar Navigation State â€” support deep-link from other pages via location.state.tab
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'overview');

    // Chat States
    const [socket, setSocket] = useState(null);
    const [chatGroups, setChatGroups] = useState([]);
    const [activeChatGroup, setActiveChatGroup] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadRoomMessages, setUnreadRoomMessages] = useState({});
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const [chatMembers, setChatMembers] = useState([]);
    const messagesEndRef = useRef(null);
    const activeChatGroupRef = useRef(null);
    
    useEffect(() => { activeChatGroupRef.current = activeChatGroup; }, [activeChatGroup]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'chat') scrollToBottom();
    }, [chatMessages, activeTab]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const newSocket = io(API_BASE.replace('/api', ''), { withCredentials: true, autoConnect: true });
        setSocket(newSocket);

        const fetchGroups = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/chat/groups`, { headers: { Authorization: `Bearer ${token}` } });
                setChatGroups(res.data.groups || []);
                if (res.data.groups && res.data.groups.length > 0) {
                    setActiveChatGroup(res.data.groups[0].id);
                    res.data.groups.forEach(g => newSocket.emit('join_room', g.id));
                    const msgRes = await axios.get(`${API_BASE}/api/chat/groups/${res.data.groups[0].id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
                    setChatMessages(msgRes.data.messages || []);
                }
            } catch (err) { console.error('Chat error', err); }
        };
        fetchGroups();

        const fetchMembers = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/chat/members`, { headers: { Authorization: `Bearer ${token}` } });
                setChatMembers(res.data.members || []);
            } catch (err) { console.error('Chat members error', err); }
        };
        fetchMembers();

        newSocket.on('receive_message', (msg) => {
            if (String(msg.group_id) === String(activeChatGroupRef.current)) {
                setChatMessages((prev) => [...prev, msg]);
            } else {
                setUnreadRoomMessages((prev) => ({ ...prev, [msg.group_id]: (prev[msg.group_id] || 0) + 1 }));
            }
            
            setActiveTab((currentTab) => {
                if (currentTab !== 'chat') setUnreadMessages((u) => u + 1);
                return currentTab;
            });
        });

        return () => newSocket.disconnect();
    }, []);

    // Universal Media / Voice Note Upload States
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [fileAccept, setFileAccept] = useState('*');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [chatActionMsg, setChatActionMsg] = useState('');

    const chatFileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);

    // Auto-create preview URL for images
    useEffect(() => {
        if (!selectedAttachment) {
            setAttachmentPreviewUrl(null);
            return;
        }
        if (selectedAttachment.type.startsWith('image/')) {
            const url = URL.createObjectURL(selectedAttachment);
            setAttachmentPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [selectedAttachment]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
                setSelectedAttachment(audioFile);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Microphone access denied or not supported.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
            audioChunksRef.current = [];
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const formatAttachmentSize = (size) => {
        if (!size) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(size) / Math.log(k));
        return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const triggerFileSelect = (acceptType) => {
        setFileAccept(acceptType);
        setAttachmentMenuOpen(false);
        setTimeout(() => {
            chatFileInputRef.current?.click();
        }, 50);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) {
                    setSelectedAttachment(file);
                    e.preventDefault();
                    break;
                }
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            setSelectedAttachment(files[0]);
        }
    };

    const handleAttachmentChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedAttachment(file);
        }
    };

    const clearSelectedAttachment = () => {
        setSelectedAttachment(null);
        if (chatFileInputRef.current) {
            chatFileInputRef.current.value = '';
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!inputMsg.trim() && !selectedAttachment) || !activeChatGroup || !socket || uploadingAttachment) return;

        try {
            let attachmentPayload = null;
            if (selectedAttachment) {
                setUploadingAttachment(true);
                setChatActionMsg('Uploading attachment...');
                const formData = new FormData();
                formData.append('file', selectedAttachment);
                
                const token = localStorage.getItem('token');
                const uploadRes = await axios.post(`${API_BASE}/api/chat/upload`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                });
                attachmentPayload = uploadRes.data?.attachment || null;
            }

            socket.emit('send_message', {
                groupId: activeChatGroup,
                message: inputMsg.trim(),
                attachment: attachmentPayload,
                token: localStorage.getItem('token')
            });
            setInputMsg('');
            clearSelectedAttachment();
            setChatActionMsg('');
        } catch (_err) {
            setChatActionMsg(_err.response?.data?.error || 'Failed to upload attachment.');
            window.setTimeout(() => setChatActionMsg(''), 2500);
        } finally {
            setUploadingAttachment(false);
        }
    };

    const handleJoinGroup = async (id) => {
        setActiveChatGroup(id);
        setUnreadRoomMessages(prev => ({ ...prev, [id]: 0 }));
        // Already joined natively via socket init mapping
        try {
            const msgRes = await axios.get(`${API_BASE}/api/chat/groups/${id}/messages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setChatMessages(msgRes.data.messages || []);
        } catch (err) {}
    };

    // Profile State
    const [profile, setProfile] = useState({ name: rawUsername, email: '', phone: '', bio: '', language: 'English', xp_points: 0 });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaveMsg, setProfileSaveMsg] = useState('');
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState('');

    const [xpRulesOpen, setXpRulesOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setXpRulesOpen(false);
        };
        if (xpRulesOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [xpRulesOpen]);

    const [stats, setStats] = useState({ quiz: { total_quizzes: 0, total_score: 0, total_questions: 0 }, ai: { total_materials: 0 }, heatmap: [] });
    const [library, setLibrary] = useState([]);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        const currentPassword = passwordForm.currentPassword.trim();
        const newPassword = passwordForm.newPassword.trim();
        const confirmPassword = passwordForm.confirmPassword.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMsg('Fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMsg('New password and confirmation do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordMsg('New password must be different from current password.');
            return;
        }

        if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
            setPasswordMsg('Use 8+ chars with uppercase, lowercase, number, and special symbol.');
            return;
        }

        setPasswordLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API}/api/auth/change-password`,
                {
                    currentPassword,
                    newPassword
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

    const renderNavButton = (id, icon, label, closeMobile = false) => (
        <button
            onClick={() => {
                setActiveTab(id);
                if (closeMobile) setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                activeTab === id ? ui.btnActive : `text-current ${ui.btnHover}`
            }`}
        >
            {icon}
            <span className="font-semibold text-sm tracking-wide">{label}</span>
        </button>
    );

    const memberDetail = selectedChatUser ? chatMembers.find(member => member.id === selectedChatUser.user_id || member.id === selectedChatUser.id) : null;
    const userRank = memberDetail?.rank || null;
    const userXP = selectedChatUser?.xp_points || memberDetail?.xp_points || 0;
    const userStreak = selectedChatUser?.streak_count || memberDetail?.streak_count || 0;
    const userBio = selectedChatUser?.bio || memberDetail?.bio || '';

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

                                        <button
                        onClick={() => { setActiveTab('chat'); setUnreadMessages(0); }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                            activeTab === 'chat' ? ui.btnActive : `text-current ${ui.btnHover}`
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Users size={18} />
                            <span className="font-semibold text-sm tracking-wide">Community Chat</span>
                        </div>
                        {unreadMessages > 0 && <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{unreadMessages}</span>}
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

            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            )}

            <aside className={`md:hidden fixed top-0 left-0 z-50 h-full w-[86%] max-w-sm p-5 transition-transform duration-300 ${ui.sidebar} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-2xl p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">AskNLearn</h1>
                            <p className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>Student Portal</p>
                        </div>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <nav className="space-y-2">
                    {renderNavButton('overview', <LayoutDashboard size={18} />, 'Overview', true)}
                    {renderNavButton('leaderboard', <Star size={18} />, 'Leaderboard', true)}
                    {renderNavButton('courses', <BookOpenCheck size={18} />, 'My Library', true)}
                    <button
                        onClick={() => { setMobileMenuOpen(false); navigate('/study-planner'); }}
                        className={`touch-target w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] text-current ${ui.btnHover}`}
                    >
                        <Calendar size={18} />
                        <span className="font-semibold text-sm tracking-wide">Study Planner (AI)</span>
                    </button>
                                        <button
                        onClick={() => { setMobileMenuOpen(false); setActiveTab('chat'); setUnreadMessages(0); }}
                        className={`touch-target w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                            activeTab === 'chat' ? ui.btnActive : `text-current ${ui.btnHover}`
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Users size={18} />
                            <span className="font-semibold text-sm tracking-wide">Community Chat</span>
                        </div>
                        {unreadMessages > 0 && <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">{unreadMessages}</span>}
                    </button>
                    {renderNavButton('performance', <Target size={18} />, 'Performance', true)}
                    {renderNavButton('certificates', <Award size={18} />, 'Achievements', true)}
                    {renderNavButton('settings', <Settings size={18} />, 'Profile & Settings', true)}
                </nav>

                <div className="mt-6 pt-5 border-t border-slate-200/20 dark:border-white/10 space-y-2">
                    <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className={`touch-target w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${ui.btnHover} active:scale-95`}>
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="font-semibold text-sm text-left flex-1">{lightMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button onClick={handleLogout} className="touch-target w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-colors active:scale-95">
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
                    <div className="flex items-center gap-1">
                        <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className="touch-target p-2 active:scale-90 transition-transform">
                            {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button onClick={() => setMobileMenuOpen(true)} className="touch-target p-2 rounded-xl hover:bg-white/10 transition-colors">
                            <Menu size={18} />
                        </button>
                    </div>
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
                        <div className="flex flex-wrap items-center gap-4">
                            <div className={`px-4 py-3 rounded-[2rem] flex items-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg ${ui.card}`}>
                                <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"><path d="M12 2c0 0-4.5 4.5-5 9.5C6.5 16 8.5 22 12 22s5.5-6 5-10.5C16.5 6.5 12 2 12 2zM12 19c-1.5 0-2.5-1.5-2.5-3 0-2 2-4 2-4s1 1 1 2.5C12.5 16 13.5 17.5 12 19z"/></svg>
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Streak</p>
                                    <p className="text-xl font-black text-orange-500">{profile.streak_count || 0} <span className="text-sm font-semibold opacity-50">Days</span></p>
                                </div>
                            </div>
                            <div 
                                onClick={() => setXpRulesOpen(true)}
                                className={`px-5 py-3 rounded-[2rem] flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-amber-500/30 ${ui.card}`}
                                title="Click to view XP earning rules & ranks"
                            >
                                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                                    <Trophy className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Total XP</p>
                                    <p className="text-xl font-black text-amber-500">{profile.xp_points || 0} <span className="text-sm font-semibold opacity-50">Pts</span></p>
                                </div>
                            </div>
                            <div 
                                onClick={() => setXpRulesOpen(true)}
                                className={`px-5 py-3 rounded-[2rem] flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer hover:border-purple-500/30 ${ui.card}`}
                                title="Click to view XP earning rules & ranks"
                            >
                                <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20">
                                    <Shield className="text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" size={24} />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${ui.muted}`}>Level</p>
                                    <p className="text-xl font-black text-purple-500">{Math.floor((profile.xp_points || 0) / 100) + 1}</p>
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

                    
                    {/* COMMUNITY CHAT TAB */}
                    {activeTab === 'chat' && (
                        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] flex flex-col h-[calc(100vh-140px)]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl"><Users size={24}/></div>
                                    <h2 className="text-3xl font-black tracking-tight">Community Chat</h2>
                                </div>
                            </div>
                            
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onPaste={handlePaste}
                                className={`flex-1 rounded-[2rem] flex overflow-hidden border shadow-lg relative ${lightMode ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10'}`}
                            >
                                {isDragging && (
                                    <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-sm border-2 border-dashed border-cyan-500 z-40 rounded-[2rem] flex flex-col items-center justify-center pointer-events-none">
                                        <div className="bg-cyan-500 text-white p-4 rounded-full shadow-lg animate-bounce">
                                            <Paperclip size={32} />
                                        </div>
                                        <p className="mt-4 font-black text-lg text-cyan-500">Drop files here to attach</p>
                                    </div>
                                )}
                                <div className={`w-32 md:w-56 flex flex-col border-r ${lightMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.01]'}`}>
                                    <div className="p-4 border-b border-transparent dark:border-white/5">
                                        <p className={`text-xs font-bold uppercase tracking-widest ${ui.muted}`}>Rooms</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {chatGroups.map(g => (
                                            <button 
                                                key={g.id} onClick={() => handleJoinGroup(g.id)}
                                                className={`w-full text-left px-3 py-3 rounded-xl transition flex items-center justify-between ${activeChatGroup === g.id ? 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 font-bold' : `text-slate-500 hover:bg-black/5 dark:hover:bg-white/5`}`}
                                            >
                                                <span className="text-sm truncate"># {g.name}</span>
                                                {unreadRoomMessages[g.id] > 0 && <span className="bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black animate-bounce">{unreadRoomMessages[g.id]}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col relative">
                                    <div className={`flex-1 overflow-y-auto p-6 space-y-4`}>
                                        {chatMessages.map((m, idx) => {
                                            const isMe = String(m.user_id) === String(userId);
                                            const isAdmin = m.role === 'admin';
                                            return (
                                                <div key={m.id || idx} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                                                    <span 
                                                        onClick={() => !isMe && setSelectedChatUser(m)}
                                                        className={`text-[11px] font-bold mb-1 px-1 cursor-pointer hover:underline flex items-center gap-1 ${isAdmin ? 'text-amber-500' : 'text-slate-400'}`}
                                                    >
                                                        {isAdmin && <Shield size={10} />}
                                                        {isMe ? 'You' : m.username}
                                                    </span>
                                                    <div className={`group flex items-start gap-2 px-4 py-2.5 text-sm ${isMe ? 'bg-cyan-500 text-white rounded-2xl rounded-tr-sm shadow-md shadow-cyan-500/20' : isAdmin ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl rounded-tl-sm' : lightMode ? 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm' : 'bg-white/10 text-slate-200 border border-white/5 rounded-2xl rounded-tl-sm'}`}>
                                                        <div className="min-w-0 space-y-2">
                                                            {!!m.message && <p className="break-words whitespace-pre-wrap">{m.message}</p>}
                                                            {m.attachment_url && (
                                                                <div className="space-y-2">
                                                                    {String(m.attachment_type || '').startsWith('image/') && (
                                                                        <a href={m.attachment_url} target="_blank" rel="noreferrer">
                                                                            <img src={m.attachment_url} alt={m.attachment_name || 'attachment'} className="max-h-64 rounded-2xl border border-white/10 object-cover" />
                                                                        </a>
                                                                    )}
                                                                    {String(m.attachment_type || '').startsWith('video/') && (
                                                                        <video controls src={m.attachment_url} className="max-h-72 rounded-2xl border border-white/10" />
                                                                    )}
                                                                    {String(m.attachment_type || '').startsWith('audio/') && (
                                                                        <audio controls src={m.attachment_url} className="max-w-full" />
                                                                    )}
                                                                    {!String(m.attachment_type || '').startsWith('image/')
                                                                        && !String(m.attachment_type || '').startsWith('video/')
                                                                        && !String(m.attachment_type || '').startsWith('audio/') && (
                                                                        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-white">
                                                                            <FileText size={18} />
                                                                            <span className="min-w-0 flex-1 truncate">{m.attachment_name || 'Attachment'}</span>
                                                                        </a>
                                                                    )}
                                                                    <a href={m.attachment_url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-xs font-bold underline-offset-4 hover:underline ${isMe ? 'text-white' : isAdmin ? 'text-amber-400' : 'text-cyan-300'}`}>
                                                                        Open {m.attachment_name || 'attachment'} {m.attachment_size ? `(${formatAttachmentSize(m.attachment_size)})` : ''}
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className={`p-4 border-t ${lightMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/40'} relative`}>
                                        
                                        {/* Chat Action Feedback Banner */}
                                        {chatActionMsg && (
                                            <div className="absolute -top-10 left-4 right-4 bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
                                                {chatActionMsg}
                                            </div>
                                        )}

                                        {/* Floating Attachment Category Picker Popover */}
                                        {attachmentMenuOpen && (
                                            <div className="absolute bottom-20 left-4 z-30 p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col gap-1.5 backdrop-blur-xl bg-slate-900/95 text-white shadow-black/80">
                                                <button
                                                    type="button"
                                                    onClick={() => triggerFileSelect('image/*,video/*')}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 rounded-xl transition text-left text-sm font-semibold w-48 text-white"
                                                >
                                                    <Image size={16} className="text-rose-500" />
                                                    <span>Photos & Videos</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerFileSelect('.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar')}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 rounded-xl transition text-left text-sm font-semibold w-48 text-white"
                                                >
                                                    <FileText size={16} className="text-blue-500" />
                                                    <span>Documents</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerFileSelect('audio/*')}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 rounded-xl transition text-left text-sm font-semibold w-48 text-white"
                                                >
                                                    <Music size={16} className="text-purple-500" />
                                                    <span>Audio Files</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => triggerFileSelect('*')}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 rounded-xl transition text-left text-sm font-semibold w-48 text-white"
                                                >
                                                    <Folder size={16} className="text-amber-500" />
                                                    <span>Universal File</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachmentMenuOpen(false);
                                                        startRecording();
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/10 rounded-xl transition text-left text-sm font-semibold w-48 text-white"
                                                >
                                                    <Mic size={16} className="text-emerald-500" />
                                                    <span>Voice Note</span>
                                                </button>
                                            </div>
                                        )}

                                        {selectedAttachment && (
                                            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {attachmentPreviewUrl ? (
                                                        <img src={attachmentPreviewUrl} alt="preview" className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" />
                                                    ) : selectedAttachment.type.startsWith('audio/') ? (
                                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0"><Music size={16} /></div>
                                                    ) : selectedAttachment.type.startsWith('video/') ? (
                                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0"><Video size={16} /></div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0"><FileText size={16} /></div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-xs text-white">{selectedAttachment.name}</p>
                                                        <p className="text-[10px] opacity-70">{formatAttachmentSize(selectedAttachment.size)}</p>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={clearSelectedAttachment} className="rounded-xl p-2 hover:bg-white/10 shrink-0">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <form onSubmit={sendMessage} className="flex gap-2">
                                            <input ref={chatFileInputRef} type="file" accept={fileAccept} onChange={handleAttachmentChange} className="hidden" />
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)} 
                                                className={`rounded-2xl px-4 py-3 transition hover:bg-white/10 ${
                                                    attachmentMenuOpen ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-white/5 text-slate-300'
                                                }`} 
                                                title="Attach file / record audio"
                                            >
                                                <Paperclip size={18} />
                                            </button>

                                            {isRecording ? (
                                                <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-2xl text-red-500">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                                                        <span className="font-bold text-xs uppercase tracking-wider">Recording voice note...</span>
                                                        <span className="font-mono text-sm opacity-80">{formatDuration(recordingDuration)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button" 
                                                            onClick={cancelRecording}
                                                            className="px-3 py-1.5 text-xs font-bold border border-red-500/30 hover:bg-red-500/20 rounded-xl transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={stopRecording}
                                                            className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl transition shadow-lg shadow-red-500/25"
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <input 
                                                        type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)}
                                                        placeholder="Type your message..."
                                                        className={`flex-1 rounded-2xl px-5 py-3 text-sm focus:outline-none transition ${ui.input} focus:ring-2 focus:ring-cyan-500/50`}
                                                    />
                                                    <button type="submit" disabled={!inputMsg.trim() && !selectedAttachment} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:bg-slate-400 text-white p-3 px-5 rounded-2xl transition shadow-lg shadow-cyan-500/20"><Send size={18} /></button>
                                                </>
                                            )}
                                        </form>
                                    </div>
                                </div>

                                {/* Right Sidebar - Group Members */}
                                <div className={`hidden lg:flex w-48 md:w-60 flex-col border-l shrink-0 ${lightMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.01]'}`}>
                                    <div className="p-4 border-b border-transparent dark:border-white/5 flex items-center justify-between">
                                        <p className={`text-xs font-bold uppercase tracking-widest ${ui.muted}`}>Group Members</p>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-bold">{chatMembers.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {chatMembers.map(member => {
                                            const isAdmin = member.role === 'admin';
                                            const isMe = String(member.id) === String(userId) && member.role !== 'admin';
                                            return (
                                                <button 
                                                    key={`${member.role}-${member.id}`}
                                                    onClick={() => setSelectedChatUser(member)}
                                                    className="w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 group border border-transparent"
                                                >
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${isAdmin ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                                                        {isAdmin ? <Shield size={14} /> : member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-1.5">
                                                            <span className={`text-xs font-bold truncate ${isAdmin ? 'text-amber-500' : lightMode ? 'text-slate-800' : 'text-slate-200'} group-hover:underline`}>
                                                                {member.name} {isMe && "(You)"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-500 font-semibold truncate">
                                                            {isAdmin ? 'Staff Administrator' : `Rank #${member.rank} • ${member.xp_points} XP`}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Profile Modal Overlay */}
                            {selectedChatUser && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedChatUser(null)}>
                                    <div className={`max-w-xs w-full p-8 rounded-[2rem] border shadow-2xl relative ${selectedChatUser.role === 'admin' ? 'bg-gradient-to-b from-amber-500/20 to-black/90 border-amber-500/50' : 'bg-[#0f172a] border-white/10'}`} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setSelectedChatUser(null)} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition"><X size={16}/></button>
                                        
                                        <div className={`mx-auto w-20 h-20 rounded-2xl mb-4 flex items-center justify-center border-2 border-white/20 shadow-lg ${selectedChatUser.role === 'admin' ? 'bg-amber-500 text-white' : 'bg-cyan-500 text-white'}`}>
                                            {selectedChatUser.role === 'admin' ? <Shield size={32}/> : <User size={32}/>}
                                        </div>
                                        
                                        <h3 className="text-xl font-black text-center text-white flex items-center justify-center gap-2">
                                            {selectedChatUser.name || selectedChatUser.username}
                                            {selectedChatUser.role === 'admin' && <span className="text-[10px] uppercase font-black tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded-md">Admin</span>}
                                        </h3>
                                        
                                        <div className="grid grid-cols-3 gap-2 mt-8">
                                            <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                                                <p className="text-lg font-black text-cyan-400">#{userRank || 'N/A'}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Rank</p>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                                                <p className="text-lg font-black text-amber-500">{userXP}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">XP</p>
                                            </div>
                                            <div className="text-center p-2 bg-white/5 rounded-xl border border-white/5">
                                                <p className="text-lg font-black text-orange-500">🔥 {userStreak}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Streak</p>
                                            </div>
                                        </div>
                                        {userBio && (
                                            <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">About</p>
                                                <p className="text-xs text-slate-300 italic">"{userBio}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
                                <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[640px]">
                                    <thead className={`bg-black/5 dark:bg-white/5 text-xs uppercase font-bold tracking-wider border-b border-black/10 dark:border-white/10 ${ui.muted}`}>
                                        <tr>
                                            <th className="p-5 w-20 text-center">Rank</th>
                                            <th className="p-5">Student</th>
                                            <th className="p-5 text-center">Level</th>
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
                                                <td className="p-5 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-500 dark:text-purple-400 text-sm font-black rounded-xl">
                                                        <Shield size={14} className="fill-purple-500/10" />
                                                        Lvl {Math.floor((user.xp_points || 0) / 100) + 1}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-center font-bold text-orange-500 text-lg">{user.streak_count || 0} 🔥</td>
                                                <td className="p-5 text-right font-black text-amber-500 text-lg">{user.xp_points || 0} Pts</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
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
                                <p className={`text-xs ${ui.muted}`}>Password policy: minimum 8 characters with uppercase, lowercase, number, and special symbol.</p>
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
                                        
                                        <div className="flex items-center gap-4 mb-8">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-black rounded-xl">
                                                <Shield size={16} className="fill-purple-500/10" />
                                                Level {Math.floor(xp / 100) + 1}
                                            </span>
                                            <span className="text-xl font-bold text-white/70">{xp} XP Earned</span>
                                        </div>

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

            {xpRulesOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop overlay */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setXpRulesOpen(false)}
                    />
                    
                    {/* Modal content */}
                    <div className={`relative w-full max-w-2xl rounded-[2.5rem] border shadow-2xl p-6 md:p-8 overflow-hidden z-10 transition-all duration-300 scale-100 ${
                        lightMode 
                            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50' 
                            : 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80'
                    }`}>
                        {/* Background glowing gradients */}
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
                        
                        {/* Header */}
                        <div className="flex items-center justify-between pb-5 border-b border-slate-200/20 mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500 animate-pulse">
                                    <Trophy size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">XP Rules &amp; Rank Tiers</h3>
                                    <p className={`text-xs font-semibold uppercase tracking-wider ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Learn how to level up your score
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setXpRulesOpen(false)}
                                className={`p-2 rounded-xl border transition-all ${
                                    lightMode 
                                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white'
                                }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Rules list */}
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 relative z-10">
                            {/* How to Earn */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">How to Earn XP</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* CS Quiz */}
                                    <div className={`p-5 rounded-2xl border ${lightMode ? 'bg-slate-50/50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">🎓</span>
                                            <h5 className="font-bold text-sm">CS Quiz Master</h5>
                                        </div>
                                        <ul className="space-y-2.5 text-xs font-medium">
                                            <li className="flex items-center justify-between">
                                                <span className="opacity-70">Correct MCQ Answer</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+10 XP</span>
                                            </li>
                                            <li className="flex items-center justify-between">
                                                <span className="opacity-70">Incorrect Penalty (Exam Mode)</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">-1 XP</span>
                                            </li>
                                            <li className="flex items-center justify-between">
                                                <span className="opacity-70">Incorrect Penalty (Practice)</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/10">0 XP</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* AI Module */}
                                    <div className={`p-5 rounded-2xl border ${lightMode ? 'bg-slate-50/50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">🤖</span>
                                            <h5 className="font-bold text-sm">AI Study Tools</h5>
                                        </div>
                                        <ul className="space-y-2.5 text-xs font-medium">
                                            <li className="flex items-center justify-between">
                                                <span className="opacity-70">Generate Study Material</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+20 XP</span>
                                            </li>
                                            <li className="flex items-center justify-between">
                                                <span className="opacity-70">Ask Socratic Tutor Question</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+5 XP</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Level Up System */}
                            <div className={`p-5 rounded-2xl border ${lightMode ? 'bg-slate-50/50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Level Up Progression</h4>
                                <p className="text-xs font-medium opacity-80 leading-relaxed">
                                    Levels are calculated directly from your total XP. You level up for every <span className="font-bold text-amber-500">100 XP</span> earned. Keep exploring AI Study Tools and answering quizzes to unlock higher ranks!
                                </p>
                            </div>

                            {/* Rank Tiers */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">AskNLearn Rank Tiers</h4>
                                <div className="space-y-2">
                                    {/* Bronze Novice */}
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${lightMode ? 'bg-slate-50/30 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-500">
                                                <Star size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Bronze Novice</p>
                                                <p className="text-[10px] opacity-50">Starting point for all new learners</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-orange-400">0 - 99 XP</span>
                                    </div>

                                    {/* Silver Scholar */}
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${lightMode ? 'bg-slate-50/30 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-400/20 rounded-lg text-slate-400">
                                                <Star size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Silver Scholar</p>
                                                <p className="text-[10px] opacity-50">Unlock at level 2</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400">100+ XP</span>
                                    </div>

                                    {/* Gold Master */}
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${lightMode ? 'bg-slate-50/30 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-yellow-400/20 rounded-lg text-yellow-400">
                                                <Star size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Gold Master</p>
                                                <p className="text-[10px] opacity-50">Unlock at level 6</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-yellow-400">500+ XP</span>
                                    </div>

                                    {/* Platinum Prodigy */}
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${lightMode ? 'bg-slate-50/30 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-200/20 rounded-lg text-slate-200">
                                                <Star size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Platinum Prodigy</p>
                                                <p className="text-[10px] opacity-50">Unlock at level 16</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-200">1,500+ XP</span>
                                    </div>

                                    {/* Diamond Legend */}
                                    <div className={`flex items-center justify-between p-3.5 rounded-xl border bg-gradient-to-r from-cyan-500/10 to-transparent ${lightMode ? 'border-cyan-200/50' : 'border-cyan-500/20'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-cyan-400/20 rounded-lg text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                                                <Star size={16} fill="currentColor" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-cyan-400 drop-shadow-sm">Diamond Legend</p>
                                                <p className="text-[10px] opacity-50">Unlock at level 51 - Ultimate Learner</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-cyan-400">5,000+ XP</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end pt-5 border-t border-slate-200/20 mt-6 relative z-10">
                            <button
                                onClick={() => setXpRulesOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-xs"
                            >
                                Got it, Thanks!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
