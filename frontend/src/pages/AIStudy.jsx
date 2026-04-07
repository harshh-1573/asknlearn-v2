import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, BrainCircuit, Check, Loader2,
    Moon, Sun, Wand2,
    Trophy, Shield
} from 'lucide-react';
import {
    TYPE_LABELS,
    resolveStoredData,
} from '../components/ai-study/constants';
import GeneratedSections from '../components/ai-study/GeneratedSections';
import TutorChatPanel from '../components/ai-study/TutorChatPanel';
import LibraryPanel from '../components/ai-study/LibraryPanel';

const API = 'http://localhost:5000';
const ACTIVE_KEY = 'asknlearn_active_material';
const THEME_KEY = 'asknlearn_theme';

const AIStudy = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userId = localStorage.getItem('userId') || '';
    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'dark');
    const lightMode = theme === 'light';

    const [mode, setMode] = useState('file');
    const [file, setFile] = useState(null);
    const [sourceText, setSourceText] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [language, setLanguage] = useState('English');
    const [model, setModel] = useState('Gemini');
    const [autoSave, setAutoSave] = useState(false);
    const [types, setTypes] = useState({
        summary: true,
        flashcards: true,
        mcq: true,
        fill_blanks: false,
        yes_no: false,
        true_false: false,
        memory_map: true,
        wh_questions: false,
    });
    const [counts, setCounts] = useState({
        flashcards: 8,
        mcq: 8,
        fill_blanks: 6,
        yes_no: 6,
        true_false: 6,
        wh_questions: 6,
    });
    const [generated, setGenerated] = useState({});
    const [activeId, setActiveId] = useState(null);
    const [activeName, setActiveName] = useState('');
    const [activeContent, setActiveContent] = useState('');
    const [library, setLibrary] = useState([]);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [expandedLibraryItems, setExpandedLibraryItems] = useState({});
    const [stats, setStats] = useState(null);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [guessInputs, setGuessInputs] = useState({});
    const [flashcardFlip, setFlashcardFlip] = useState({});
    const [mcqFeedback, setMcqFeedback] = useState({});
    const [fillFeedback, setFillFeedback] = useState({});
    const [fillHints, setFillHints] = useState({});
    const [tfFeedback, setTfFeedback] = useState({});
    const [ynFeedback, setYnFeedback] = useState({});
    const [whReveal, setWhReveal] = useState({});
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState('');
    const [modelUsed, setModelUsed] = useState('');
    const [savedBanner, setSavedBanner] = useState('');

    const [xp, setXp] = useState(0);
    const [xpAnimation, setXpAnimation] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [speechError, setSpeechError] = useState('');

    const level = Math.floor(xp / 100) + 1;
    const xpProgress = xp % 100;

    const [socraticMode, setSocraticMode] = useState(false);

    const flashcards = Array.isArray(generated.flashcards) ? generated.flashcards : [];
    const mcq = Array.isArray(generated.mcq) ? generated.mcq : [];
    const fillBlanks = Array.isArray(generated.fill_blanks) ? generated.fill_blanks : [];
    const trueFalse = Array.isArray(generated.true_false) ? generated.true_false : [];
    const yesNo = Array.isArray(generated.yes_no) ? generated.yes_no : [];
    const whQuestions = Array.isArray(generated.wh_questions) ? generated.wh_questions : [];
    const selectedTypes = Object.keys(types).filter((key) => types[key]);
    const hasGeneratedData = Object.keys(generated).length > 0;

    const ui = lightMode
        ? {
            page: 'bg-[#f4f7fb] text-slate-900',
            card: 'bg-white border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.06)]',
            input: 'bg-white border border-slate-300 text-slate-900',
            muted: 'text-slate-500',
            badge: 'bg-slate-100 text-slate-700',
        }
        : {
            page: 'bg-[#05070f] text-white',
            card: 'bg-white/5 border border-white/10',
            input: 'bg-white/5 border border-white/10 text-white',
            muted: 'text-neutral-400',
            badge: 'bg-white/10 text-neutral-100',
        };

    const persistActive = (payload) => {
        sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    };

    const loadLibraryAndStats = async () => {
        if (!userId) {
            setLibrary([]);
            setStats(null);
            setError('User session not found. Please log in again.');
            return;
        }
        const [libraryResult, statsResult, xpResult] = await Promise.allSettled([
            axios.get(`${API}/api/ai/library/${userId}`),
            axios.get(`${API}/api/ai/dashboard/${userId}`),
            axios.get(`${API}/api/user/${userId}/xp`)
        ]);

        if (libraryResult.status === 'fulfilled') {
            setLibrary(libraryResult.value.data.materials || []);
        } else {
            setLibrary([]);
            setError(libraryResult.reason?.response?.data?.error || 'Failed to load library.');
        }

        if (statsResult.status === 'fulfilled') {
            setStats(statsResult.value.data.stats || null);
        } else {
            setStats(null);
        }

        if (xpResult.status === 'fulfilled') {
            setXp(xpResult.value.data.xp_points || 0);
        }
    };

    const loadChatHistory = async (materialId) => {
        if (!materialId || !userId) {
            setChat([]);
            return;
        }
        try {
            const res = await axios.get(`${API}/api/ai/chat-history/${materialId}`, {
                params: { userId },
            });
            setChat((res.data.history || []).map((entry) => ({
                role: entry.role,
                message: entry.message,
            })));
        } catch {
            setChat([]);
        }
    };

    const openMaterial = async (item) => {
        setError('');
        try {
            const res = await axios.get(`${API}/api/ai/material/${item.id}`, {
                params: { userId },
            });
            const freshItem = res.data?.material || item;
            const parsed = resolveStoredData(freshItem);
            if (!Object.keys(parsed).length) {
                throw new Error('Saved material content is empty or invalid.');
            }

            setGenerated(parsed);
            setActiveId(freshItem.id);
            setActiveName(freshItem.source_name || freshItem.filename || `Material ${freshItem.id}`);
            setActiveContent(freshItem.content || '');
            setGuessInputs({});
            setFlashcardFlip({});
            setMcqFeedback({});
            setFillFeedback({});
            setFillHints({});
            setTfFeedback({});
            setYnFeedback({});
            setWhReveal({});
            setSavedBanner('');
            persistActive({
                id: freshItem.id,
                sourceName: freshItem.source_name || freshItem.filename || `Material ${freshItem.id}`,
                content: freshItem.content || '',
                data: parsed,
            });
            await loadChatHistory(freshItem.id);
        } catch (openError) {
            setError(openError.response?.data?.error || openError.message || 'Failed to open saved material.');
        }
    };

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const init = async () => {
            try {
                await loadLibraryAndStats();

                // Attempt to load active material from Dashboard redirect
                const activeVal = sessionStorage.getItem(ACTIVE_KEY);
                if (activeVal) {
                    sessionStorage.removeItem(ACTIVE_KEY);
                    try {
                        const parsed = JSON.parse(activeVal);
                        if (parsed && typeof parsed === 'object' && parsed.id) {
                            openMaterial(parsed);
                        } else {
                            openMaterial({ id: activeVal });
                        }
                    } catch {
                        openMaterial({ id: activeVal });
                    }
                }
            } catch (initError) {
                setError(initError.response?.data?.error || 'Failed to load AskNLearn.');
            }
        };

        init();
    }, []);

    useEffect(() => {
        if (location.state?.autoPrompt) {
            setMode('text');
            setSourceText(location.state.autoPrompt);
            setTypes({
                summary: false, flashcards: false, mcq: true, fill_blanks: false,
                yes_no: false, true_false: false, memory_map: false, wh_questions: false
            });
            setCounts(prev => ({ ...prev, mcq: 10 }));
            setSavedBanner('Adaptive Generation Mode Ready! Click Generate with AI to begin.');
            window.history.replaceState({}, document.title);
        }
    }, [location.state?.autoPrompt]);

    const rewardXp = async (amount = 10) => {
        if (!userId) return;
        try {
            const res = await axios.post(`${API}/api/user/${userId}/xp`, { amount });
            setXp(res.data.xp_points);
            setXpAnimation(`+${amount} XP!`);
            setTimeout(() => setXpAnimation(''), 3000);
        } catch {
            console.error('Failed to add XP');
        }
    };

    const toggleListen = () => {
        if (isListening) {
            setIsListening(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechError('Speech recognition not supported in your browser. Use Chrome or Edge.');
            setTimeout(() => setSpeechError(''), 4000);
            return;
        }

        setIsListening(true);
        setSpeechError('');
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language === 'English' ? 'en-US' : (language === 'Hindi' ? 'hi-IN' : 'mr-IN');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setChatInput(prev => `${prev} ${transcript}`.trim());
            setIsListening(false);
        };

        recognition.onerror = () => {
            setSpeechError('Microphone not detected or denied.');
            setIsListening(false);
            setTimeout(() => setSpeechError(''), 4000);
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleSpeak = (text) => {
        if (!('speechSynthesis' in window)) {
            alert('Your browser does not support the Web Speech API.');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const handleGenerate = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setSavedBanner('');

        try {
            const form = new FormData();
            form.append('userId', userId);
            form.append('subjectId', '');
            form.append('model', model);
            form.append('language', language);
            form.append('contentTypes', JSON.stringify(selectedTypes));
            form.append('counts', JSON.stringify(counts));
            form.append('sourceName', sourceName || file?.name || `${mode}-input`);
            form.append('autoSave', String(autoSave));

            if (mode === 'file') {
                if (!file) throw new Error('Please upload a file.');
                form.append('file', file);
            } else {
                form.append('sourceText', sourceText);
            }

            const res = await axios.post(`${API}/api/ai/process`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const data = res.data?.data || {};
            const materialId = res.data?.materialId || null;
            const resolvedName = res.data?.sourceName || sourceName || file?.name || 'Generated Material';
            const resolvedText = res.data?.sourceText || sourceText || '';

            setGenerated(data);
            setActiveId(materialId);
            setActiveName(resolvedName);
            setActiveContent(resolvedText);
            setChat([]);
            setGuessInputs({});
            setFlashcardFlip({});
            setMcqFeedback({});
            setFillFeedback({});
            setFillHints({});
            setTfFeedback({});
            setYnFeedback({});
            setWhReveal({});
            setModelUsed(res.data?.modelUsed || '');
            setSavedBanner(res.data?.saved ? 'Saved to study_materials.' : '');

            persistActive({
                id: materialId,
                sourceName: resolvedName,
                content: resolvedText,
                data,
            });

            await loadLibraryAndStats();
            if (materialId) await loadChatHistory(materialId);

            await rewardXp(20);
        } catch (generateError) {
            setError(generateError.response?.data?.error || generateError.message || 'AI generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const saveToLibrary = async () => {
        if (!hasGeneratedData) return;
        setSaveLoading(true);
        setError('');
        setSavedBanner('');

        try {
            const res = await axios.post(`${API}/api/ai/save-material`, {
                userId,
                subjectId: null,
                sourceName: activeName || sourceName || file?.name || 'Generated Material',
                filename: file?.name || null,
                sourceText: activeContent || sourceText || '',
                generatedData: generated,
            });

            const materialId = res.data?.materialId || null;
            setActiveId(materialId);
            setSavedBanner('Saved to study_materials.');
            persistActive({
                id: materialId,
                sourceName: activeName || sourceName || file?.name || 'Generated Material',
                content: activeContent || sourceText || '',
                data: generated,
            });
            await loadLibraryAndStats();
            if (materialId) {
                await loadChatHistory(materialId);
            }
        } catch (saveError) {
            setError(saveError.response?.data?.error || 'Failed to save material.');
        } finally {
            setSaveLoading(false);
        }
    };

    const sendChat = async () => {
        const question = chatInput.trim();
        if (!question || !hasGeneratedData) return;

        setChatInput('');
        setChatLoading(true);
        setError('');
        setChat((prev) => [...prev, { role: 'user', message: question }]);

        try {
            const res = await axios.post(`${API}/api/ai/chat`, {
                userId,
                materialId: activeId,
                question,
                sourceText: activeContent,
                generatedJson: generated,
                history: chat.slice(-8),
                language,
                socraticMode,
            });

            setChat((prev) => [...prev, {
                role: 'assistant',
                message: res.data?.answer || '',
                suggestedFollowups: res.data?.suggestedFollowups || []
            }]);
            await rewardXp(5);
        } catch (chatError) {
            setChat((prev) => prev.slice(0, -1));
            setError(chatError.response?.data?.error || 'Tutor chat failed.');
        } finally {
            setChatLoading(false);
        }
    };

    const exportPdf = () => {
        if (!hasGeneratedData) return;
        const popup = window.open('', '_blank');
        if (!popup) {
            setError('Popup blocked. Please allow popups for export.');
            return;
        }

        const esc = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const html = [
            `<h1>AskNLearn Study Material</h1>`,
            `<p><strong>Source:</strong> ${esc(activeName || sourceName || 'Untitled')}</p>`,
            generated.summary ? `<h2>Summary</h2><p>${esc(generated.summary).replace(/\n/g, '<br/>')}</p>` : '',
            flashcards.length ? `<h2>Flashcards (${flashcards.length})</h2><ol>${flashcards.map((item) => `<li>${esc(item.q)}</li>`).join('')}</ol>` : '',
            mcq.length ? `<h2>MCQ (${mcq.length})</h2><ol>${mcq.map((item) => `<li><strong>${esc(item.question)}</strong><br/>A. ${esc(item.options?.A)}<br/>B. ${esc(item.options?.B)}<br/>C. ${esc(item.options?.C)}<br/>D. ${esc(item.options?.D)}</li>`).join('')}</ol>` : '',
            fillBlanks.length ? `<h2>Fill Blanks (${fillBlanks.length})</h2><ol>${fillBlanks.map((item) => `<li>${esc(item.question)}</li>`).join('')}</ol>` : '',
            trueFalse.length ? `<h2>True / False (${trueFalse.length})</h2><ol>${trueFalse.map((item) => `<li>${esc(item.question)}</li>`).join('')}</ol>` : '',
            yesNo.length ? `<h2>Yes / No (${yesNo.length})</h2><ol>${yesNo.map((item) => `<li>${esc(item.question)}</li>`).join('')}</ol>` : '',
            whQuestions.length ? `<h2>WH Questions (${whQuestions.length})</h2><ol>${whQuestions.map((item) => `<li>${esc(item.question)}</li>`).join('')}</ol>` : '',
        ].join('');

        popup.document.write(`<html><head><title>AskNLearn Export</title><style>body{font-family:Arial,sans-serif;padding:24px;line-height:1.5;color:#111827}h1,h2{margin-bottom:10px}li{margin-bottom:10px}</style></head><body>${html}</body></html>`);
        popup.document.close();
        popup.focus();
        setTimeout(() => popup.print(), 250);
    };

    const renderQuestionInput = (key, placeholder) => (
        <input
            value={guessInputs[key] || ''}
            onChange={(event) => setGuessInputs((prev) => ({ ...prev, [key]: event.target.value }))}
            placeholder={placeholder}
            className={`w-full rounded-2xl px-4 py-3 mt-3 ${ui.input}`}
        />
    );

    const selectClass = `rounded-2xl px-4 py-3 ${ui.input} ${lightMode ? 'text-slate-900 bg-white' : 'text-white bg-slate-900 border-white/10'}`;
    const countEnabledKeys = new Set(Object.keys(counts));
    const contentScrollClass = `max-h-[34rem] overflow-y-auto pr-1 ${lightMode ? 'scrollbar-thumb-slate-200' : 'scrollbar-thumb-white/10'}`;

    return (
        <div className={`min-h-screen p-4 md:p-6 ${ui.page}`}>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between gap-3">
                    <button onClick={() => navigate('/dashboard')} className={`inline-flex items-center gap-2 ${ui.muted}`}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`relative hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl ${ui.card}`}>
                            <div className="flex items-center gap-2 font-bold select-none cursor-default" title="Your current Level">
                                <Shield className="text-amber-500 fill-amber-500/10" size={18} /> Level {level}
                            </div>
                            <div className="w-24 h-2 bg-slate-200/20 rounded-full overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full bg-[linear-gradient(90deg,#f59e0b,#fcd34d)] transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-amber-500 w-12 text-right">{xp} XP</span>

                            {xpAnimation ? (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-black text-amber-500 animate-[bounce_0.5s_ease-out_infinite] whitespace-nowrap drop-shadow-md z-50 pointer-events-none">
                                    <Trophy size={14} className="inline mr-1 -mt-0.5" />{xpAnimation}
                                </div>
                            ) : null}
                        </div>
                        <button onClick={() => setTheme(lightMode ? 'dark' : 'light')} className={`p-3 rounded-2xl ${ui.card}`}>
                            {lightMode ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                    </div>
                </div>

                <section className={`rounded-[2rem] p-6 md:p-8 ${lightMode ? 'bg-[linear-gradient(120deg,#f59e0b,#fb7185,#60a5fa)] text-slate-950' : 'bg-[linear-gradient(120deg,#0f172a,#1d4ed8,#0f766e)] text-white'}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center gap-3">
                                <BrainCircuit size={34} /> AskNLearn AI
                            </h1>
                            <p className="mt-3 text-base md:text-lg max-w-3xl">
                                Generate study material, practice without clue leaks, save only when you want, and continue learning on mobile or desktop.
                            </p>
                        </div>
                        <div className={`rounded-3xl px-4 py-3 ${lightMode ? 'bg-white/65' : 'bg-white/10'}`}>
                            <p className="text-sm font-semibold">Model</p>
                            <p className="text-sm">{modelUsed || 'Ready'}</p>
                        </div>
                    </div>
                </section>

                {error ? <div className={`rounded-2xl border px-4 py-3 ${lightMode ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/15 border-red-500/30 text-red-200'}`}>{error}</div> : null}
                {savedBanner ? <div className={`rounded-2xl border px-4 py-3 flex items-center gap-2 ${lightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'}`}><Check size={16} /> {savedBanner}</div> : null}

                <section className={`rounded-[2rem] p-5 md:p-6 ${ui.card}`}>
                    <h2 className="text-2xl font-bold flex items-center gap-2 mb-4"><Wand2 size={20} /> Generate Material</h2>
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {['file', 'text', 'url'].map((item) => (
                                <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-2xl px-3 py-3 border text-sm font-semibold ${mode === item ? (lightMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-950 border-white') : ui.input}`}>
                                    {item.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        {mode === 'file' ? (
                            <input
                                type="file"
                                accept="*/*"
                                onChange={(event) => setFile(event.target.files?.[0] || null)}
                                className={`w-full rounded-2xl px-4 py-3 ${ui.input}`}
                            />
                        ) : (
                            <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder={mode === 'url' ? 'Paste URL here...' : 'Paste notes, transcript, or content here...'} className={`w-full h-32 rounded-2xl px-4 py-3 ${ui.input}`} />
                        )}
                        <p className={`text-xs ${ui.muted}`}>
                            Universal input: upload documents, screenshots, slides, code/text files, audio, video, or paste raw text and URLs. Video/audio sources are transcribed first, then all study material types are generated from the extracted transcript.
                        </p>
                        <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Source name (optional)" className={`w-full rounded-2xl px-4 py-3 ${ui.input}`} />
                        <div className="grid gap-3 md:grid-cols-2">
                            <select value={language} onChange={(event) => setLanguage(event.target.value)} className={selectClass} style={{ color: lightMode ? '#0f172a' : '#f8fafc', backgroundColor: lightMode ? '#ffffff' : '#0f172a' }}>
                                <option style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>English</option>
                                <option style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Hindi</option>
                                <option style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Marathi</option>
                            </select>
                            <select value={model} onChange={(event) => setModel(event.target.value)} className={selectClass} style={{ color: lightMode ? '#0f172a' : '#f8fafc', backgroundColor: lightMode ? '#ffffff' : '#0f172a' }}>
                                <option style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Gemini</option>
                                <option style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>OpenAI</option>
                            </select>
                        </div>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                            {Object.keys(TYPE_LABELS).map((key) => (
                                <div key={key} className={`rounded-2xl px-3 py-3 text-sm border ${ui.card}`}>
                                    <label className="flex items-center gap-2 font-medium cursor-pointer">
                                        <input type="checkbox" checked={types[key]} onChange={() => setTypes((prev) => ({ ...prev, [key]: !prev[key] }))} className="mr-1" />
                                        <span>{TYPE_LABELS[key]}</span>
                                    </label>
                                    {countEnabledKeys.has(key) ? (
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <span className={`text-xs ${ui.muted}`}>Count</span>
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCounts((prev) => ({ ...prev, [key]: Math.max(1, (prev[key] || 1) - 1) }))}
                                                    className={`w-8 h-8 rounded-xl border ${lightMode ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-white/5 text-white'}`}
                                                >
                                                    -
                                                </button>
                                                <span className="min-w-[2rem] text-center font-bold">{counts[key]}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCounts((prev) => ({ ...prev, [key]: Math.min(40, (prev[key] || 1) + 1) }))}
                                                    className={`w-8 h-8 rounded-xl border ${lightMode ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-white/10 bg-white/5 text-white'}`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                        <label className={`inline-flex items-center gap-2 text-sm ${ui.muted}`}>
                            <input type="checkbox" checked={autoSave} onChange={(event) => setAutoSave(event.target.checked)} />
                            Save to `study_materials` right after generation
                        </label>
                        <button type="submit" disabled={loading || !selectedTypes.length} className="w-full rounded-2xl px-4 py-4 bg-[linear-gradient(120deg,#06b6d4,#2563eb)] text-white font-bold disabled:opacity-60">
                            {loading ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Generating...</span> : 'Generate with AI'}
                        </button>
                    </form>
                </section>

                <GeneratedSections
                    ui={ui}
                    lightMode={lightMode}
                    activeName={activeName}
                    saveToLibrary={saveToLibrary}
                    hasGeneratedData={hasGeneratedData}
                    saveLoading={saveLoading}
                    activeId={activeId}
                    exportPdf={exportPdf}
                    generated={generated}
                    flashcards={flashcards}
                    flashcardFlip={flashcardFlip}
                    setFlashcardFlip={setFlashcardFlip}
                    handleSpeak={handleSpeak}
                    contentScrollClass={contentScrollClass}
                    mcq={mcq}
                    mcqFeedback={mcqFeedback}
                    setMcqFeedback={setMcqFeedback}
                    fillBlanks={fillBlanks}
                    fillFeedback={fillFeedback}
                    setFillFeedback={setFillFeedback}
                    fillHints={fillHints}
                    setFillHints={setFillHints}
                    guessInputs={guessInputs}
                    renderQuestionInput={renderQuestionInput}
                    trueFalse={trueFalse}
                    tfFeedback={tfFeedback}
                    setTfFeedback={setTfFeedback}
                    yesNo={yesNo}
                    ynFeedback={ynFeedback}
                    setYnFeedback={setYnFeedback}
                    whQuestions={whQuestions}
                    whReveal={whReveal}
                    setWhReveal={setWhReveal}
                />

                <TutorChatPanel
                    ui={ui}
                    lightMode={lightMode}
                    socraticMode={socraticMode}
                    setSocraticMode={setSocraticMode}
                    activeId={activeId}
                    chat={chat}
                    setChatInput={setChatInput}
                    speechError={speechError}
                    toggleListen={toggleListen}
                    isListening={isListening}
                    chatInput={chatInput}
                    sendChat={sendChat}
                    chatLoading={chatLoading}
                    hasGeneratedData={hasGeneratedData}
                />

                <LibraryPanel
                    ui={ui}
                    lightMode={lightMode}
                    library={library}
                    libraryOpen={libraryOpen}
                    setLibraryOpen={setLibraryOpen}
                    expandedLibraryItems={expandedLibraryItems}
                    setExpandedLibraryItems={setExpandedLibraryItems}
                    activeId={activeId}
                    openMaterial={openMaterial}
                />

                <section className={`rounded-[2rem] p-5 md:p-6 ${ui.card}`}>
                    <h2 className="text-2xl font-bold mb-4">Progress Snapshot</h2>
                    {stats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-3xl p-4 bg-[linear-gradient(120deg,rgba(59,130,246,.12),rgba(6,182,212,.12))] border border-sky-300/20">
                                <p className={ui.muted}>Materials</p>
                                <p className="text-3xl font-black text-sky-500">{stats.total_materials || 0}</p>
                            </div>
                            <div className="rounded-3xl p-4 bg-[linear-gradient(120deg,rgba(139,92,246,.12),rgba(236,72,153,.12))] border border-violet-300/20">
                                <p className={ui.muted}>Generated Items</p>
                                <p className="text-3xl font-black text-violet-500">{stats.total_generated_items || 0}</p>
                            </div>
                            <div className="rounded-3xl p-4 bg-[linear-gradient(120deg,rgba(16,185,129,.12),rgba(34,197,94,.12))] border border-emerald-300/20">
                                <p className={ui.muted}>Flashcards</p>
                                <p className="text-3xl font-black text-emerald-500">{stats.total_flashcards || 0}</p>
                            </div>
                            <div className="rounded-3xl p-4 bg-[linear-gradient(120deg,rgba(245,158,11,.12),rgba(249,115,22,.12))] border border-amber-300/20">
                                <p className={ui.muted}>MCQ</p>
                                <p className="text-3xl font-black text-amber-500">{stats.total_mcq || 0}</p>
                            </div>
                        </div>
                    ) : <p className={ui.muted}>No stats available.</p>}
                </section>
            </div>
        </div>
    );
};

export default AIStudy;
