import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE } from '../config/api';
import {
    Shield, Users, BookOpen, BrainCircuit, Activity, Trash2, ArrowLeft, MessageSquare, Send, X, Award, Plus, Paperclip, FileText, Loader2, Folder,
    Mic, Image, Video, Music, Upload, Download, Database, User
} from 'lucide-react';

const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let insideQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            row.push("");
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += char;
        }
    }
    if (row.length > 1 || row[0] !== "") {
        lines.push(row);
    }
    return lines;
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const adminName = localStorage.getItem('username') || 'Admin';
    const API = API_BASE;

    const [stats, setStats] = useState({ totalUsers: 0, totalMaterials: 0, totalQuizzesTaken: 0 });
    const [users, setUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', xp_points: 0, streak_count: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- TABS & GENERAL STATES ---
    const [activeTab, setActiveTab] = useState('users');
    const activeTabRef = useRef('users');

    // --- QUESTIONS TAB STATES ---
    const [subjectsList, setSubjectsList] = useState([]);
    const [questionForm, setQuestionForm] = useState({
        subject_id: '',
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
        difficulty: 'medium'
    });
    const [singleSubmitting, setSingleSubmitting] = useState(false);
    const [singleMessage, setSingleMessage] = useState({ type: '', text: '' });

    const [csvSubmitting, setCsvSubmitting] = useState(false);
    const [csvMessage, setCsvMessage] = useState({ type: '', text: '' });
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [csvSubTab, setCsvSubTab] = useState('manual'); // 'manual' or 'csv'

    useEffect(() => {
        if (subjectsList.length > 0 && !questionForm.subject_id) {
            setQuestionForm(prev => ({ ...prev, subject_id: subjectsList[0].id }));
        }
    }, [subjectsList]);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);
    
    // Chat States
    const [socket, setSocket] = useState(null);
    const [chatGroups, setChatGroups] = useState([]);
    const [activeChatGroup, setActiveChatGroup] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadRoomMessages, setUnreadRoomMessages] = useState({});
    const [chatActionMsg, setChatActionMsg] = useState('');
    const [newRoomForm, setNewRoomForm] = useState({ name: '', description: '' });
    const [selectedAttachment, setSelectedAttachment] = useState(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [chatMembers, setChatMembers] = useState([]);
    const [selectedChatUser, setSelectedChatUser] = useState(null);
    const messagesEndRef = useRef(null);
    const activeChatGroupRef = useRef(null);
    const chatGroupsRef = useRef([]);
    const chatFileInputRef = useRef(null);

    // Universal Upload & Voice Note States
    const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
    const [fileAccept, setFileAccept] = useState('*');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

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

    useEffect(() => { activeChatGroupRef.current = activeChatGroup; }, [activeChatGroup]);
    useEffect(() => { chatGroupsRef.current = chatGroups; }, [chatGroups]);

    // Modal States
    const [activityModalUser, setActivityModalUser] = useState(null);
    const [activityData, setActivityData] = useState({ scores: [], materials: [] });
    const [activityLoading, setActivityLoading] = useState(false);

    const loadChatMessages = async (groupId, authToken = token) => {
        if (!groupId || !authToken) {
            setChatMessages([]);
            return;
        }
        try {
            const msgRes = await axios.get(`${API}/api/chat/groups/${groupId}/messages`, { headers: { Authorization: `Bearer ${authToken}` } });
            setChatMessages(msgRes.data.messages || []);
        } catch (_err) {
            setChatMessages([]);
        }
    };

    const handleRoomDeletedLocally = (groupId) => {
        setUnreadRoomMessages((prev) => {
            const next = { ...prev };
            delete next[groupId];
            return next;
        });

        setChatGroups((prev) => {
            const next = prev.filter((group) => String(group.id) !== String(groupId));
            if (String(activeChatGroupRef.current) === String(groupId)) {
                const fallbackId = next[0]?.id || null;
                setActiveChatGroup(fallbackId);
                if (fallbackId) {
                    loadChatMessages(fallbackId);
                } else {
                    setChatMessages([]);
                }
            }
            return next;
        });
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };
                const [statsRes, usersRes, subjectsRes] = await Promise.all([
                    axios.get(`${API}/api/admin/stats`, { headers }),
                    axios.get(`${API}/api/admin/users`, { headers }),
                    axios.get(`${API}/api/subjects`)
                ]);
                setStats(statsRes.data);
                setUsers(usersRes.data.users || []);
                setSubjectsList(subjectsRes.data || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load admin data. Access denied.');
                if (err.response?.status === 401 || err.response?.status === 403) {
                    localStorage.clear();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();

        // Init Socket for Admin
        if (token) {
            const newSocket = io(API_BASE.replace('/api', ''), { withCredentials: true });
            setSocket(newSocket);
            
            const fetchGroups = async () => {
                try {
                    const res = await axios.get(`${API}/api/chat/groups`, { headers: { Authorization: `Bearer ${token}` } });
                    setChatGroups(res.data.groups || []);
                    if (res.data.groups && res.data.groups.length > 0) {
                        setActiveChatGroup(res.data.groups[0].id);
                        res.data.groups.forEach(g => newSocket.emit('join_room', g.id));
                        await loadChatMessages(res.data.groups[0].id, token);
                    }
                } catch(e) {}
            };
            fetchGroups();

            const fetchMembers = async () => {
                try {
                    const res = await axios.get(`${API}/api/chat/members`, { headers: { Authorization: `Bearer ${token}` } });
                    setChatMembers(res.data.members || []);
                } catch (err) { console.error('Chat members error', err); }
            };
            fetchMembers();

            newSocket.on('receive_message', (msg) => {
                if (String(msg.group_id) === String(activeChatGroupRef.current)) {
                    setChatMessages(prev => [...prev, msg]);
                } else {
                    setUnreadRoomMessages(prev => ({ ...prev, [msg.group_id]: (prev[msg.group_id] || 0) + 1 }));
                }

                if (activeTabRef.current !== 'chat') {
                    setUnreadMessages(u => u + 1);
                }
            });

            newSocket.on('message_deleted', ({ messageId, groupId }) => {
                if (String(groupId) === String(activeChatGroupRef.current)) {
                    setChatMessages((prev) => prev.filter((msg) => String(msg.id) !== String(messageId)));
                }
            });

            newSocket.on('room_created', (room) => {
                setChatGroups((prev) => {
                    if (prev.some((group) => String(group.id) === String(room.id))) {
                        return prev;
                    }
                    return [...prev, room];
                });
                newSocket.emit('join_room', room.id);
                if (!activeChatGroupRef.current) {
                    setActiveChatGroup(room.id);
                    loadChatMessages(room.id, token);
                }
            });

            newSocket.on('room_deleted', ({ groupId }) => {
                handleRoomDeletedLocally(groupId);
            });

            newSocket.on('chat_error', ({ error: chatError }) => {
                setChatActionMsg(chatError || 'Chat action failed.');
                window.setTimeout(() => setChatActionMsg(''), 2500);
            });

            return () => newSocket.disconnect();
        }
    }, [token, navigate, API]);

    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeTab]);

    const handleJoinGroup = async (id) => {
        setActiveChatGroup(id);
        setUnreadRoomMessages(prev => ({ ...prev, [id]: 0 }));
        await loadChatMessages(id);
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
                const uploadRes = await axios.post(`${API}/api/chat/upload`, formData, {
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
                token
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

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (!socket || !newRoomForm.name.trim()) return;
        socket.emit('create_room', {
            token,
            name: newRoomForm.name.trim(),
            description: newRoomForm.description.trim()
        });
        setNewRoomForm({ name: '', description: '' });
    };

    const handleDeleteRoom = (groupId, groupName) => {
        if (!socket || !groupId) return;
        if (!window.confirm(`Delete "${groupName}" and all of its chat messages?`)) return;
        socket.emit('delete_room', { token, groupId });
    };

    const handleDeleteMessage = (messageId) => {
        if (!socket || !messageId) return;
        if (!window.confirm('Delete this message for everyone in the room?')) return;
        socket.emit('delete_message', { token, messageId });
    };

    const formatAttachmentSize = (size) => {
        const bytes = Number(size || 0);
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleAttachmentChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedAttachment(file);
    };

    const clearSelectedAttachment = () => {
        setSelectedAttachment(null);
        if (chatFileInputRef.current) {
            chatFileInputRef.current.value = '';
        }
    };

    const handleViewActivity = async (user) => {
        setActivityModalUser(user);
        setActivityLoading(true);
        try {
            const res = await axios.get(`${API}/api/admin/users/${user.id}/activity`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivityData({ scores: res.data.scores || [], materials: res.data.materials || [] });
        } catch (err) {
            alert('Failed to fetch user activity');
        } finally {
            setActivityLoading(false);
        }
    };

    const handleEditClick = (u) => {
        setEditingUser(u.id);
        setEditForm({ name: u.name, xp_points: u.xp_points || 0, streak_count: u.streak_count || 0 });
    };

    const handleSaveUser = async (id) => {
        try {
            await axios.put(`${API}/api/admin/users/${id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editForm } : u));
            setEditingUser(null);
        } catch (err) {
            alert('Failed to update user.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you absolutely sure you want to delete this user? All their data will be lost.')) return;
        try {
            await axios.delete(`${API}/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (err) {
            alert('Failed to delete user.');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // --- QUESTION CREATOR FUNCTIONS ---
    const downloadCsvTemplate = () => {
        const headers = ['subject_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation', 'difficulty'];
        const sampleRow = ['1', 'What is the main function of a router?', 'Forwarding packets', 'Filtering traffic', 'Connecting devices', 'Managing IP addresses', 'A', "A router's main function is to forward packets between different networks.", 'medium'];
        const csvContent = [headers.join(','), sampleRow.map(val => `"${val.replace(/"/g, '""')}"`).join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'asknlearn_quiz_questions_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processCsvFile(file);
    };

    const processCsvFile = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = parseCSV(text);
            if (rows.length < 2) {
                setCsvMessage({ type: 'error', text: 'CSV is empty or missing headers' });
                return;
            }
            
            const headers = rows[0].map(h => h.trim().toLowerCase());
            const requiredHeaders = ['subject_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation', 'difficulty'];
            
            const headerIndices = {};
            requiredHeaders.forEach(rh => {
                headerIndices[rh] = headers.indexOf(rh);
            });

            const missingHeaders = requiredHeaders.filter(rh => headerIndices[rh] === -1);
            if (missingHeaders.length > 0) {
                setCsvMessage({ type: 'error', text: `Missing required headers: ${missingHeaders.join(', ')}` });
                return;
            }

            const questions = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < requiredHeaders.length && row.join('').trim() === '') {
                    continue; // Skip empty rows
                }
                
                const q = {
                    subject_id: row[headerIndices['subject_id']]?.trim(),
                    question_text: row[headerIndices['question_text']]?.trim(),
                    option_a: row[headerIndices['option_a']]?.trim(),
                    option_b: row[headerIndices['option_b']]?.trim(),
                    option_c: row[headerIndices['option_c']]?.trim(),
                    option_d: row[headerIndices['option_d']]?.trim(),
                    correct_option: row[headerIndices['correct_option']]?.trim(),
                    explanation: row[headerIndices['explanation']]?.trim(),
                    difficulty: row[headerIndices['difficulty']]?.trim() || 'medium'
                };

                const validationErrors = [];
                if (!q.subject_id) {
                    validationErrors.push('Subject ID is required');
                } else {
                    const subId = parseInt(q.subject_id, 10);
                    if (isNaN(subId)) {
                        validationErrors.push('Subject ID must be a number');
                    } else if (subjectsList.length > 0 && !subjectsList.some(s => s.id === subId)) {
                        validationErrors.push(`Subject ID ${subId} does not exist`);
                    }
                }
                
                if (!q.question_text) validationErrors.push('Question text is required');
                if (!q.option_a) validationErrors.push('Option A is required');
                if (!q.option_b) validationErrors.push('Option B is required');
                if (!q.option_c) validationErrors.push('Option C is required');
                if (!q.option_d) validationErrors.push('Option D is required');

                if (!q.correct_option) {
                    validationErrors.push('Correct option is required');
                } else {
                    const co = q.correct_option.trim().toUpperCase();
                    if (!['A', 'B', 'C', 'D'].includes(co)) {
                        validationErrors.push('Correct option must be A, B, C, or D');
                    }
                }

                if (!q.explanation) validationErrors.push('Explanation is required');

                const diff = q.difficulty.trim().toLowerCase();
                if (!['foundation', 'medium', 'advanced'].includes(diff)) {
                    validationErrors.push('Difficulty must be foundation, medium, or advanced');
                }

                questions.push({
                    ...q,
                    isValid: validationErrors.length === 0,
                    error: validationErrors.join(', ')
                });
            }

            setParsedQuestions(questions);
            setCsvMessage({ type: 'success', text: `Parsed ${questions.length} rows successfully.` });
        };
        reader.readAsText(file);
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        setSingleMessage({ type: '', text: '' });

        if (!questionForm.subject_id) {
            setSingleMessage({ type: 'error', text: 'Please select a subject' });
            return;
        }
        if (!questionForm.question_text.trim() || !questionForm.option_a.trim() || !questionForm.option_b.trim() || !questionForm.option_c.trim() || !questionForm.option_d.trim() || !questionForm.explanation.trim()) {
            setSingleMessage({ type: 'error', text: 'All fields are required' });
            return;
        }

        setSingleSubmitting(true);
        try {
            await axios.post(`${API}/api/admin/questions`, questionForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSingleMessage({ type: 'success', text: 'Question added successfully!' });
            setQuestionForm({
                subject_id: subjectsList[0]?.id || '',
                question_text: '',
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: '',
                correct_option: 'A',
                explanation: '',
                difficulty: 'medium'
            });
            const statsRes = await axios.get(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
            setStats(statsRes.data);
        } catch (err) {
            setSingleMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save question' });
        } finally {
            setSingleSubmitting(false);
        }
    };

    const handleCsvUploadSubmit = async () => {
        setCsvMessage({ type: '', text: '' });
        const invalidRows = parsedQuestions.filter(q => !q.isValid);
        if (invalidRows.length > 0) {
            setCsvMessage({ type: 'error', text: `Please correct the ${invalidRows.length} invalid rows before uploading.` });
            return;
        }
        if (parsedQuestions.length === 0) {
            setCsvMessage({ type: 'error', text: 'No questions to upload' });
            return;
        }

        setCsvSubmitting(true);
        try {
            await axios.post(`${API}/api/admin/questions/batch`, { questions: parsedQuestions }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCsvMessage({ type: 'success', text: `Successfully inserted ${parsedQuestions.length} questions!` });
            setParsedQuestions([]);
            const statsRes = await axios.get(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
            setStats(statsRes.data);
        } catch (err) {
            setCsvMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload batch' });
        } finally {
            setCsvSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070f] flex items-center justify-center text-white">
                <p className="animate-pulse flex items-center gap-2"><Activity size={20} /> Loading Admin System...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#05070f] flex items-center justify-center p-6 text-white text-center">
                <div className="max-w-md bg-red-500/10 border border-red-500/30 text-red-200 p-6 rounded-3xl">
                    <Shield size={40} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p>{error}</p>
                    <button onClick={handleLogout} className="mt-6 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl transition font-bold">Return to Login</button>
                </div>
            </div>
        );
    }

    const memberDetail = selectedChatUser ? chatMembers.find(member => member.id === selectedChatUser.user_id || member.id === selectedChatUser.id) : null;
    const userRank = memberDetail?.rank || selectedChatUser?.rank || null;
    const userXP = selectedChatUser?.xp_points || memberDetail?.xp_points || 0;
    const userStreak = selectedChatUser?.streak_count || memberDetail?.streak_count || 0;
    const userBio = selectedChatUser?.bio || memberDetail?.bio || '';

    return (
        <div className="min-h-screen bg-[#05070f] text-white p-6 md:p-10 font-sans flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                
                {/* Header & Tabs */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3 text-amber-500">
                        <Shield size={36} />
                        <div>
                            <h1 className="text-3xl font-black text-white">Admin Hub</h1>
                            <p className="text-sm text-slate-400 font-semibold">Welcome back, {adminName}</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'users' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}>
                            <Users size={16} className="inline mr-2" /> Users
                        </button>
                        <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'questions' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white'}`}>
                            <BookOpen size={16} className="inline mr-2" /> Manage Questions
                        </button>
                        <button onClick={() => { setActiveTab('chat'); setUnreadMessages(0); }} className={`relative px-4 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'chat' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                            <MessageSquare size={16} className="inline mr-2" /> Community Chat
                            {unreadMessages > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.5)]">{unreadMessages}</span>}
                        </button>
                    </div>

                    <button onClick={handleLogout} className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition rounded-xl text-sm font-bold flex items-center gap-2">
                        <ArrowLeft size={16} /> Logout
                    </button>
                </header>

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                <div className="animate-[fadeIn_0.3s_ease-out]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/5 border border-indigo-500/20 backdrop-blur-sm">
                            <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Users size={24} /></div><h2 className="text-lg font-bold text-slate-300">Total Users</h2></div>
                            <p className="text-5xl font-black mt-2 text-white">{stats.totalUsers}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 backdrop-blur-sm">
                            <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><BookOpen size={24} /></div><h2 className="text-lg font-bold text-slate-300">Generated Materials</h2></div>
                            <p className="text-5xl font-black mt-2 text-white">{stats.totalMaterials}</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 border border-amber-500/20 backdrop-blur-sm">
                            <div className="flex items-center gap-4 mb-2"><div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400"><BrainCircuit size={24} /></div><h2 className="text-lg font-bold text-slate-300">Quizzes Taken</h2></div>
                            <p className="text-5xl font-black mt-2 text-white">{stats.totalQuizzesTaken}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold flex items-center gap-3"><Users size={20} className="text-amber-400" /> Platform Directory ({users.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02]">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">User</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Gamification Stats</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.05]">
                                    {users.map((u) => {
                                        const isEditing = editingUser === u.id;
                                        return (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-black/50 border border-white/20 rounded px-2 py-1 w-full text-white mb-1" />
                                                ) : <p className="font-bold text-sm text-white">{u.name}</p>}
                                                <p className="text-xs text-slate-400">{u.email} &bull; ID: #{u.id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <input type="number" value={editForm.xp_points} onChange={e => setEditForm({...editForm, xp_points: e.target.value})} className="bg-black/50 border border-white/20 rounded px-2 w-20 text-xs text-amber-500" title="XP Points" />
                                                        <input type="number" value={editForm.streak_count} onChange={e => setEditForm({...editForm, streak_count: e.target.value})} className="bg-black/50 border border-white/20 rounded px-2 w-20 text-xs text-slate-300" title="Streak" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold">{u.xp_points} XP</span>
                                                        <span className="text-slate-400">🔥 {u.streak_count} Streak</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={() => handleSaveUser(u.id)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition">Save</button>
                                                        <button onClick={() => setEditingUser(null)} className="px-3 py-1 bg-white/10 text-slate-300 hover:bg-white/20 rounded-lg text-xs font-bold transition">Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button disabled={u.role === 'admin'} onClick={() => handleViewActivity(u)} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg font-bold text-xs transition flex items-center gap-1"><Activity size={14}/> Log</button>
                                                        <button onClick={() => handleEditClick(u)} className="px-3 py-1.5 bg-white/10 text-slate-300 hover:bg-white/20 rounded-lg font-bold text-xs transition">Edit</button>
                                                        <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Delete User"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}

                {/* --- QUESTIONS TAB --- */}
                {activeTab === 'questions' && (
                <div className="animate-[fadeIn_0.3s_ease-out] flex flex-col gap-6">
                    {/* Header and Toggle buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-xl">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-3 text-purple-400">
                                <BookOpen size={24} /> CS Quiz Question Management
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">Insert new quiz questions manually or upload in bulk using a CSV file.</p>
                        </div>
                        
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shrink-0">
                            <button 
                                onClick={() => setCsvSubTab('manual')} 
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition ${csvSubTab === 'manual' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
                            >
                                <Plus size={14} className="inline mr-1" /> Manual Entry
                            </button>
                            <button 
                                onClick={() => setCsvSubTab('csv')} 
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition ${csvSubTab === 'csv' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
                            >
                                <Upload size={14} className="inline mr-1" /> CSV Bulk Upload
                            </button>
                        </div>
                    </div>

                    {/* Manual Entry Form */}
                    {csvSubTab === 'manual' && (
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl p-8">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                <Plus size={20} className="text-purple-400" /> Add Single Question
                            </h3>

                            {singleMessage.text && (
                                <div className={`mb-6 p-4 rounded-2xl border text-sm font-semibold ${singleMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                    {singleMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleSingleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Subject Selection */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                                        <select 
                                            value={questionForm.subject_id} 
                                            onChange={e => setQuestionForm({...questionForm, subject_id: e.target.value})}
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        >
                                            {subjectsList.map(s => (
                                                <option key={s.id} value={s.id} className="bg-[#05070f]">{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Difficulty */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
                                        <select 
                                            value={questionForm.difficulty} 
                                            onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})}
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        >
                                            <option value="foundation" className="bg-[#05070f]">Foundation</option>
                                            <option value="medium" className="bg-[#05070f]">Medium</option>
                                            <option value="advanced" className="bg-[#05070f]">Advanced</option>
                                        </select>
                                    </div>

                                    {/* Correct Answer */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correct Answer</label>
                                        <select 
                                            value={questionForm.correct_option} 
                                            onChange={e => setQuestionForm({...questionForm, correct_option: e.target.value})}
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        >
                                            <option value="A" className="bg-[#05070f]">Option A</option>
                                            <option value="B" className="bg-[#05070f]">Option B</option>
                                            <option value="C" className="bg-[#05070f]">Option C</option>
                                            <option value="D" className="bg-[#05070f]">Option D</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Question Text */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question Text</label>
                                    <textarea 
                                        rows="3"
                                        value={questionForm.question_text}
                                        onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})}
                                        placeholder="Enter the question text here..."
                                        className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                    />
                                </div>

                                {/* Options A & B */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Option A</label>
                                        <input 
                                            type="text"
                                            value={questionForm.option_a}
                                            onChange={e => setQuestionForm({...questionForm, option_a: e.target.value})}
                                            placeholder="First option..."
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Option B</label>
                                        <input 
                                            type="text"
                                            value={questionForm.option_b}
                                            onChange={e => setQuestionForm({...questionForm, option_b: e.target.value})}
                                            placeholder="Second option..."
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        />
                                    </div>
                                </div>

                                {/* Options C & D */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Option C</label>
                                        <input 
                                            type="text"
                                            value={questionForm.option_c}
                                            onChange={e => setQuestionForm({...questionForm, option_c: e.target.value})}
                                            placeholder="Third option..."
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Option D</label>
                                        <input 
                                            type="text"
                                            value={questionForm.option_d}
                                            onChange={e => setQuestionForm({...questionForm, option_d: e.target.value})}
                                            placeholder="Fourth option..."
                                            className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                        />
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Explanation</label>
                                    <textarea 
                                        rows="3"
                                        value={questionForm.explanation}
                                        onChange={e => setQuestionForm({...questionForm, explanation: e.target.value})}
                                        placeholder="Explain why the correct answer is correct..."
                                        className="w-full bg-black/50 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition text-white"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button 
                                        type="submit" 
                                        disabled={singleSubmitting}
                                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-2xl transition shadow-lg shadow-purple-500/20 flex items-center gap-2"
                                    >
                                        {singleSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Question
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* CSV Bulk Upload Portal */}
                    {csvSubTab === 'csv' && (
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl p-8 flex flex-col gap-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Upload size={20} className="text-purple-400" /> CSV Bulk Upload Portal
                                </h3>
                                <button 
                                    onClick={downloadCsvTemplate}
                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl transition text-xs font-bold flex items-center gap-2 self-start"
                                >
                                    <Download size={14} /> Download CSV Template
                                </button>
                            </div>

                            {csvMessage.text && (
                                <div className={`p-4 rounded-2xl border text-sm font-semibold ${csvMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                                    {csvMessage.text}
                                </div>
                            )}

                            {/* Drag & Drop File Zone */}
                            <div 
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) processCsvFile(file);
                                }}
                                className="border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-[2rem] p-10 text-center bg-black/20 hover:bg-purple-500/[0.02] transition cursor-pointer flex flex-col items-center justify-center gap-3 group"
                                onClick={() => document.getElementById('csvFileInput').click()}
                            >
                                <div className="p-4 bg-purple-500/15 rounded-full text-purple-400 group-hover:scale-110 transition duration-300">
                                    <Upload size={32} />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-white">Drag & Drop your CSV file here</p>
                                    <p className="text-xs text-slate-400 mt-1">or click to browse from your computer</p>
                                </div>
                                <input 
                                    id="csvFileInput" 
                                    type="file" 
                                    accept=".csv" 
                                    onChange={handleCsvFileChange} 
                                    className="hidden" 
                                />
                            </div>

                            {/* Subjects Quick Guide Reference */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Subject ID Quick Reference:</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                    {subjectsList.map(s => (
                                        <div key={s.id} className="p-2.5 bg-black/40 rounded-xl border border-white/10 text-center">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{s.name}</p>
                                            <p className="text-sm font-black text-purple-400 mt-0.5">ID: {s.id}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CSV Table Preview */}
                            {parsedQuestions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                                        <h4 className="font-bold text-white text-base">File Preview ({parsedQuestions.length} Questions)</h4>
                                        <button 
                                            onClick={handleCsvUploadSubmit}
                                            disabled={csvSubmitting || parsedQuestions.some(q => !q.isValid)}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                                        >
                                            {csvSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Commit Upload Batch
                                        </button>
                                    </div>

                                    {parsedQuestions.some(q => !q.isValid) && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl font-medium">
                                            ⚠️ Warning: Some rows have validation errors. You must fix them in your CSV file before uploading.
                                        </div>
                                    )}

                                    <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-white/10 bg-black/30">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-white/[0.05] border-b border-white/10 text-slate-400 font-bold">
                                                    <th className="px-4 py-3">Row</th>
                                                    <th className="px-4 py-3">Subject ID</th>
                                                    <th className="px-4 py-3">Question Text</th>
                                                    <th className="px-4 py-3">Correct Option</th>
                                                    <th className="px-4 py-3">Difficulty</th>
                                                    <th className="px-4 py-3 text-right">Validation Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {parsedQuestions.map((q, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition">
                                                        <td className="px-4 py-3 font-semibold text-slate-500">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-semibold text-purple-400">{q.subject_id}</td>
                                                        <td className="px-4 py-3 max-w-xs truncate text-slate-200" title={q.question_text}>{q.question_text}</td>
                                                        <td className="px-4 py-3 font-bold text-center sm:text-left">{q.correct_option}</td>
                                                        <td className="px-4 py-3 capitalize text-slate-300">{q.difficulty}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {q.isValid ? (
                                                                <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">✅ Valid</span>
                                                            ) : (
                                                                <span className="inline-block px-2.5 py-1 bg-rose-500/10 text-rose-400 rounded-full font-bold" title={q.error}>❌ Error</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}

                {/* --- CHAT TAB --- */}
                {activeTab === 'chat' && (
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="animate-[fadeIn_0.3s_ease-out] flex-1 flex flex-col bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl h-[600px] relative"
                    >
                        {chatActionMsg && (
                            <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                                {chatActionMsg}
                            </div>
                        )}
                        <div className="flex flex-1 overflow-hidden">
                            <div className="w-64 border-r border-white/10 bg-black/20 flex flex-col">
                                <div className="p-4 border-b border-white/5 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Rooms</p>
                                    <form onSubmit={handleCreateRoom} className="space-y-2">
                                        <input
                                            type="text"
                                            value={newRoomForm.name}
                                            onChange={(e) => setNewRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                                            placeholder="New room name"
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
                                        />
                                        <textarea
                                            rows="2"
                                            value={newRoomForm.description}
                                            onChange={(e) => setNewRoomForm((prev) => ({ ...prev, description: e.target.value }))}
                                            placeholder="Short description"
                                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
                                        />
                                        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-cyan-600">
                                            <Plus size={16} /> Create Room
                                        </button>
                                    </form>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {chatGroups.map(g => (
                                        <div key={g.id} className={`flex items-center gap-2 rounded-xl px-2 py-2 transition ${activeChatGroup === g.id ? 'bg-cyan-500/15 border border-cyan-500/25' : 'hover:bg-white/5 border border-transparent'}`}>
                                            <button onClick={() => handleJoinGroup(g.id)} className={`min-w-0 flex-1 text-left ${activeChatGroup === g.id ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-sm"># {g.name}</span>
                                                    {unreadRoomMessages[g.id] > 0 && <span className="bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black animate-bounce">{unreadRoomMessages[g.id]}</span>}
                                                </div>
                                                {g.description && <p className="mt-1 truncate text-[11px] text-slate-500">{g.description}</p>}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRoom(g.id, g.name)}
                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                                                title="Delete room"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.03),transparent_80%)]">
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {chatMessages.map((m, idx) => {
                                        const isMe = String(m.user_id) === String(localStorage.getItem('userId')) || m.username === adminName;
                                        const isAdmin = m.role === 'admin' || m.username === adminName;
                                        return (
                                            <div key={m.id || idx} className={`flex flex-col max-w-[80%] ${isMe ? 'ml-auto items-end' : 'items-start'}`}>
                                                <span 
                                                    onClick={() => !isMe && setSelectedChatUser(m)}
                                                    className={`text-[11px] font-bold mb-1 px-1 cursor-pointer hover:underline flex items-center gap-1 ${isAdmin ? 'text-amber-500' : 'text-slate-400'}`}
                                                >
                                                    {isAdmin && <Shield size={10} />}
                                                    {isMe ? 'You (Admin)' : m.username}
                                                </span>
                                                <div className={`group flex items-start gap-2 px-4 py-2.5 text-sm ${isMe ? 'bg-amber-600 text-white rounded-2xl rounded-tr-sm shadow-md' : isAdmin ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl rounded-tl-sm' : 'bg-white/10 text-slate-200 border border-white/5 rounded-2xl rounded-tl-sm'}`}>
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
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMessage(m.id)}
                                                        className="shrink-0 rounded-lg p-1 text-white/70 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-4 border-t border-white/10 bg-[#05070f] relative">
                                    
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
                                        
                                        {isRecording ? (
                                            <div className="flex-1 flex items-center justify-between bg-rose-500/15 border border-rose-500/20 rounded-2xl px-4 py-3 text-sm text-rose-300">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                                    <span>Recording Voice Note... ({formatDuration(recordingDuration)})</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button type="button" onClick={cancelRecording} className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider">Cancel</button>
                                                    <button type="button" onClick={stopRecording} className="text-rose-400 hover:text-rose-300 font-bold text-xs uppercase tracking-wider">Done</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)} className="p-3 bg-white/5 border border-white/10 rounded-xl transition hover:bg-white/10 text-slate-400 hover:text-white">
                                                    <Paperclip size={18} />
                                                </button>
                                                <input 
                                                    type="text" 
                                                    value={inputMsg} 
                                                    onChange={e => setInputMsg(e.target.value)} 
                                                    onPaste={handlePaste}
                                                    placeholder={selectedAttachment ? 'Add a caption (optional)...' : 'Send official admin message...'} 
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition text-white" 
                                                />
                                                <button type="submit" disabled={(!inputMsg.trim() && !selectedAttachment) || uploadingAttachment} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white p-3 rounded-xl transition shadow-lg shadow-amber-500/20">
                                                    {uploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                </button>
                                            </>
                                        )}
                                    </form>
                                </div>
                            </div>

                            {/* Right Sidebar - Group Members */}
                            <div className="hidden lg:flex w-48 md:w-60 flex-col border-l border-white/10 bg-white/[0.01] shrink-0">
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Group Members</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-bold">{chatMembers.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {chatMembers.map(member => {
                                        const isAdmin = member.role === 'admin';
                                        const isMe = isAdmin && member.name === adminName;
                                        return (
                                            <button 
                                                key={`${member.role}-${member.id}`}
                                                onClick={() => setSelectedChatUser(member)}
                                                className="w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-3 hover:bg-white/5 group border border-transparent"
                                            >
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 ${isAdmin ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                                                    {isAdmin ? <Shield size={14} /> : member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className={`text-xs font-bold truncate ${isAdmin ? 'text-amber-500' : 'text-slate-200'} group-hover:underline`}>
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

                        {isDragging && (
                            <div className="absolute inset-0 bg-cyan-500/10 backdrop-blur-sm border-2 border-dashed border-cyan-500 z-40 rounded-[2rem] flex flex-col items-center justify-center pointer-events-none">
                                <div className="bg-cyan-500 text-white p-4 rounded-full shadow-lg animate-bounce">
                                    <Paperclip size={32} />
                                </div>
                                <p className="mt-4 font-black text-lg text-cyan-500">Drop files here to attach</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ACTIVITY MODAL --- */}
                {activityModalUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setActivityModalUser(null)}>
                        <div className="max-w-3xl w-full max-h-[85vh] flex flex-col bg-[#05070f] rounded-[2rem] border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] rounded-t-[2rem]">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Award className="text-indigo-400"/> Performance & Achievements</h2>
                                    <p className="text-sm text-slate-400">Audit log for {activityModalUser.name}</p>
                                </div>
                                <button onClick={() => setActivityModalUser(null)} className="p-2 bg-white/5 hover:bg-white/10 transition rounded-xl"><X size={20}/></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {activityLoading ? (
                                    <p className="text-slate-400 text-center py-10 animate-pulse">Scanning records...</p>
                                ) : (
                                    <>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Recent Quizzes</h3>
                                            {activityData.scores.length === 0 ? <p className="text-sm text-slate-600">No quizzes taken yet.</p> : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {activityData.scores.map(s => (
                                                        <div key={s.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center">
                                                            <div>
                                                                <p className="text-sm font-bold truncate max-w-[150px]">{s.subject_title || 'General Quiz'}</p>
                                                                <p className="text-[10px] text-slate-500">{new Date(s.date_taken).toLocaleDateString()}</p>
                                                            </div>
                                                            <div className={`px-2 py-1 rounded text-xs font-bold ${s.score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {s.score}%
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Generated Materials</h3>
                                            {activityData.materials.length === 0 ? <p className="text-sm text-slate-600">No materials generated yet.</p> : (
                                                <div className="space-y-2">
                                                    {activityData.materials.map(m => (
                                                        <div key={m.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                                            <BookOpen size={16} className="text-cyan-400 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-semibold">{m.title}</p>
                                                                <p className="text-[10px] text-slate-500">Created: {new Date(m.uploaded_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
        </div>
    );
};

export default AdminDashboard;
