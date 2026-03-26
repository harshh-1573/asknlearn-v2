import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, Bot, BrainCircuit, Boxes, Check, ChevronDown, ChevronUp, FileDown, Library, Loader2,
    MessageSquareMore, Moon, Save, Send, Sparkles, Sun, Wand2, ZoomIn, ZoomOut, RotateCcw,
    Mic, Trophy, Shield
} from 'lucide-react';

const API = 'http://localhost:5000';
const ACTIVE_KEY = 'asknlearn_active_material';
const THEME_KEY = 'asknlearn_theme';

const TYPE_LABELS = {
    summary: 'Summary',
    flashcards: 'Flashcards',
    mcq: 'MCQ',
    fill_blanks: 'Fill Blanks',
    yes_no: 'Yes / No',
    true_false: 'True / False',
    memory_map: 'Mind Map',
    wh_questions: 'WH Questions',
};

const SECTION_STYLES = {
    summary: 'from-amber-400/20 to-orange-500/20',
    flashcards: 'from-sky-400/20 to-cyan-500/20',
    mcq: 'from-emerald-400/20 to-teal-500/20',
    fill_blanks: 'from-pink-400/20 to-rose-500/20',
    yes_no: 'from-violet-400/20 to-fuchsia-500/20',
    true_false: 'from-indigo-400/20 to-blue-500/20',
    wh_questions: 'from-lime-400/20 to-emerald-500/20',
    memory_map: 'from-yellow-400/20 to-amber-500/20',
};

const safeParse = (value, fallback) => {
    let current = value;
    for (let index = 0; index < 3; index += 1) {
        try {
            if (typeof current === 'string') {
                const trimmed = current.trim();
                if (!trimmed) return fallback;
                current = JSON.parse(trimmed);
                continue;
            }
            return current ?? fallback;
        } catch (_error) {
            if (typeof current === 'string') {
                const repaired = current
                    .trim()
                    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
                    .replace(/:\s*'([^']*?)'/g, ': "$1"');
                if (repaired !== current) {
                    current = repaired;
                    continue;
                }
            }
            return fallback;
        }
    }
    return fallback;
};

const resolveStoredData = (item = {}) => {
    const direct = safeParse(item.content_json, null);
    if (direct && typeof direct === 'object' && Object.keys(direct).length) {
        return direct;
    }

    const fallback = safeParse(item.content, null);
    if (fallback && typeof fallback === 'object' && Object.keys(fallback).length) {
        return fallback;
    }

    if (typeof item.content === 'string' && item.content.trim()) {
        return { summary: item.content.trim() };
    }

    return {};
};

const stripMermaid = (value = '') => String(value).replace(/```mermaid/gi, '').replace(/```/g, '').trim();

const normalizeMermaidLabel = (value = '') => String(value)
    .replace(/[{}[\]]/g, ' ')
    .replace(/[:;]+/g, ' - ')
    .replace(/[<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeMindMap = (value = '') => {
    const raw = stripMermaid(value).replace(/\r/g, '').replace(/\t/g, '    ').trim();
    if (!raw) return '';

    const lines = raw.split('\n').map((line) => line.replace(/\u00a0/g, ' ').trimEnd());
    const children = [];
    let rootLabel = 'Study Topic';

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (index === 0 && trimmed.startsWith('mindmap')) {
            return;
        }

        const normalized = normalizeMermaidLabel(trimmed
            .replace(/^[-*+]\s+/, '')
            .replace(/^\d+[\.)]\s+/, '')
            .replace(/^\#+\s+/, '')
            .replace(/^root\s*[:\-]?\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim());

        if (!normalized) return;
        if (/^\(\(.*\)\)$/.test(normalized)) {
            rootLabel = normalized.replace(/^\(\(/, '').replace(/\)\)$/, '').trim() || rootLabel;
            return;
        }
        if (/^root\s*\(\(/i.test(trimmed) || /^root\s*\[/i.test(trimmed) || /^root\s*$/i.test(trimmed)) {
            rootLabel = normalized || rootLabel;
            return;
        }
        children.push(normalized.replace(/"/g, '\\"'));
    });

    const output = ['mindmap', `  root((${rootLabel.replace(/"/g, '\\"')}))`];
    children.forEach((child, index) => {
        output.push(`    node${index + 1}["${child}"]`);
    });
    if (!children.length) {
        output.push('    node1["Key Ideas"]');
    }
    return output.join('\n');
};

const getHintText = (answer = '') => {
    const normalized = String(answer || '').trim();
    if (!normalized) return 'No hint available.';

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        return `Initial letters: ${words.map((word) => word[0]?.toUpperCase() || '').join(' ')} - ${words.length} words`;
    }

    return `Starts with "${normalized[0]?.toUpperCase() || ''}" - ${normalized.length} letters`;
};

const getItemCount = (data = {}) => {
    const arrays = ['flashcards', 'mcq', 'fill_blanks', 'yes_no', 'true_false', 'wh_questions'];
    let total = data.summary ? 1 : 0;
    arrays.forEach((key) => {
        if (Array.isArray(data[key])) total += data[key].length;
    });
    if (data.memory_map) total += 1;
    return total;
};

const MermaidViewer = ({ code, lightMode }) => {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState('');
    const [zoom, setZoom] = useState(1.15);
    const containerRef = useRef(null);
    const panZoomRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        const render = async () => {
            if (!code) return;
            try {
                if (!window.mermaid) {
                    await new Promise((resolve, reject) => {
                        const existing = document.getElementById('mermaid-script');
                        if (existing) {
                            if (window.mermaid) return resolve();
                            existing.addEventListener('load', resolve, { once: true });
                            existing.addEventListener('error', reject, { once: true });
                            return;
                        }
                        const script = document.createElement('script');
                        script.id = 'mermaid-script';
                        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }

                if (!window.svgPanZoom) {
                    await new Promise((resolve, reject) => {
                        const existing = document.getElementById('svg-pan-zoom-script');
                        if (existing) {
                            if (window.svgPanZoom) return resolve();
                            existing.addEventListener('load', resolve, { once: true });
                            existing.addEventListener('error', reject, { once: true });
                            return;
                        }
                        const script = document.createElement('script');
                        script.id = 'svg-pan-zoom-script';
                        script.src = 'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }

                window.mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'loose',
                    theme: lightMode ? 'default' : 'dark',
                });

                const diagram = sanitizeMindMap(code);
                const result = await window.mermaid.render(`mindmap-${Date.now()}`, diagram);
                if (mounted) {
                    setSvg(result.svg);
                    setError('');
                }
            } catch (_error) {
                if (mounted) {
                    setSvg('');
                    setError(_error?.message || 'Mind map rendering failed.');
                }
            }
        };

        render();
        return () => {
            mounted = false;
        };
    }, [code, lightMode]);

    useEffect(() => {
        if (!svg || !containerRef.current || !window.svgPanZoom) return undefined;

        const timer = window.setTimeout(() => {
            const svgElement = containerRef.current?.querySelector('svg');
            if (!svgElement) return;

            if (panZoomRef.current) {
                try {
                    panZoomRef.current.destroy();
                } catch (_error) {
                    // no-op
                }
            }

            panZoomRef.current = window.svgPanZoom(svgElement, {
                zoomEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.5,
                maxZoom: 5,
            });
        }, 120);

        return () => {
            window.clearTimeout(timer);
            if (panZoomRef.current) {
                try {
                    panZoomRef.current.destroy();
                } catch (_error) {
                    // no-op
                }
                panZoomRef.current = null;
            }
        };
    }, [svg]);

    const zoomOut = () => {
        if (panZoomRef.current) {
            panZoomRef.current.zoomOut();
            return;
        }
        setZoom((value) => Math.max(0.5, value - 0.15));
    };

    const zoomIn = () => {
        if (panZoomRef.current) {
            panZoomRef.current.zoomIn();
            return;
        }
        setZoom((value) => Math.min(3, value + 0.15));
    };

    const resetZoom = () => {
        if (panZoomRef.current) {
            panZoomRef.current.resetZoom();
            panZoomRef.current.fit();
            panZoomRef.current.center();
            return;
        }
        setZoom(1.15);
    };

    return (
        <div className={`rounded-3xl border overflow-hidden ${lightMode ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-white/10'}`}>
            <div className={`flex justify-end gap-2 p-3 border-b ${lightMode ? 'border-slate-200' : 'border-white/10'}`}>
                <button onClick={zoomOut} className={`p-2 rounded-xl ${lightMode ? 'bg-slate-100' : 'bg-white/10'}`}><ZoomOut size={15} /></button>
                <button onClick={zoomIn} className={`p-2 rounded-xl ${lightMode ? 'bg-slate-100' : 'bg-white/10'}`}><ZoomIn size={15} /></button>
                <button onClick={resetZoom} className={`p-2 rounded-xl ${lightMode ? 'bg-slate-100' : 'bg-white/10'}`}><RotateCcw size={15} /></button>
            </div>
            <div className="overflow-auto min-h-[420px] md:min-h-[560px] max-h-[75vh] p-4">
                {svg ? (
                    <div
                        ref={containerRef}
                        style={{ transform: panZoomRef.current ? 'scale(1)' : `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content' }}
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                ) : (
                    <div className="space-y-3">
                        <div className={`text-sm ${lightMode ? 'text-slate-500' : 'text-neutral-400'}`}>{error || 'Rendering mind map...'}</div>
                        {code ? (
                            <pre className={`rounded-2xl p-4 text-xs overflow-auto max-h-[22rem] whitespace-pre-wrap ${lightMode ? 'bg-slate-50 text-slate-700 border border-slate-200' : 'bg-black/20 text-neutral-200 border border-white/10'}`}>
                                {sanitizeMindMap(code)}
                            </pre>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

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
        } catch (_error) {
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
        } catch (err) {
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

                <section className={`rounded-[2rem] p-5 md:p-6 ${ui.card}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles size={20} /> Generated Study Materials</h2>
                            {activeName ? <p className={`mt-1 text-sm ${ui.muted}`}>Active material: {activeName}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={saveToLibrary} disabled={!hasGeneratedData || saveLoading || Boolean(activeId)} className="rounded-2xl px-4 py-3 bg-[linear-gradient(120deg,#7c3aed,#2563eb)] text-white font-semibold disabled:opacity-40 inline-flex items-center gap-2"><Save size={15} /> {activeId ? 'Saved' : (saveLoading ? 'Saving...' : 'Save')}</button>
                            <button onClick={exportPdf} disabled={!hasGeneratedData} className="rounded-2xl px-4 py-3 bg-[linear-gradient(120deg,#10b981,#14b8a6)] text-white font-semibold disabled:opacity-40 inline-flex items-center gap-2"><FileDown size={15} /> Export PDF</button>
                        </div>
                    </div>

                    <div className="mt-6 space-y-5">
                        {generated.summary ? <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.summary} ${lightMode ? 'border-amber-200' : 'border-white/10'}`}><h3 className="text-xl font-bold mb-3">Summary (1)</h3><div className={contentScrollClass}><p className="leading-7 whitespace-pre-wrap">{generated.summary}</p></div></section> : null}

                        {flashcards.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.flashcards} ${lightMode ? 'border-sky-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">Flashcards ({flashcards.length})</h3>
                                <div className={`${contentScrollClass} grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`}>
                                    {flashcards.map((item, index) => (
                                        <div key={index} className="group [perspective:1000px]">
                                            <div
                                                className="relative min-h-[180px] transition-transform duration-500 [transform-style:preserve-3d]"
                                                onMouseEnter={() => setFlashcardFlip((prev) => ({ ...prev, [index]: true }))}
                                                onMouseLeave={() => setFlashcardFlip((prev) => ({ ...prev, [index]: false }))}
                                                style={{ transform: flashcardFlip[index] ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                                            >
                                                <div className={`absolute inset-0 rounded-2xl p-4 [backface-visibility:hidden] ${ui.card}`}>
                                                    <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${ui.muted}`}>Question</p>
                                                    <p>{item.q}</p>
                                                </div>
                                                <div className={`absolute inset-0 rounded-2xl p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ${lightMode ? 'bg-cyan-50 border border-cyan-200 text-slate-900' : 'bg-cyan-500/10 border border-cyan-400/20 text-white'}`}>
                                                    <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${ui.muted}`}>Answer</p>
                                                    <p>{item.a}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {mcq.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.mcq} ${lightMode ? 'border-emerald-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">MCQ ({mcq.length})</h3>
                                <div className={`${contentScrollClass} space-y-4`}>
                                    {mcq.map((item, index) => {
                                        const feedback = mcqFeedback[index];
                                        return (
                                            <div key={index} className={`rounded-2xl p-4 ${ui.card}`}>
                                                <p className="font-semibold mb-3">{index + 1}. {item.question}</p>
                                                <div className="space-y-2">
                                                    {['A', 'B', 'C', 'D'].map((optionKey) => item.options?.[optionKey] ? (
                                                        <button
                                                            key={optionKey}
                                                            type="button"
                                                            onClick={() => setMcqFeedback((prev) => ({
                                                                ...prev,
                                                                [index]: {
                                                                    selected: optionKey,
                                                                    correct: String(item.correct_option || '').toUpperCase(),
                                                                    explanation: item.explanation || '',
                                                                },
                                                            }))}
                                                            className={`w-full text-left rounded-2xl px-4 py-3 border ${
                                                                feedback
                                                                    ? optionKey === feedback.correct
                                                                        ? 'border-emerald-400/40 bg-emerald-500/10'
                                                                        : optionKey === feedback.selected
                                                                            ? 'border-red-400/40 bg-red-500/10'
                                                                            : ui.input
                                                                    : ui.input
                                                            }`}
                                                        >
                                                            <strong>{optionKey}.</strong> {item.options[optionKey]}
                                                        </button>
                                                    ) : null)}
                                                </div>
                                                {feedback ? (
                                                    <div className={`mt-3 rounded-2xl p-3 ${feedback.selected === feedback.correct ? (lightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300') : (lightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-300')}`}>
                                                        <p className="font-semibold">{feedback.selected === feedback.correct ? 'Correct' : `Incorrect. Correct answer: ${feedback.correct}`}</p>
                                                        {feedback.explanation ? <p className="text-sm mt-1">{feedback.explanation}</p> : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {fillBlanks.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.fill_blanks} ${lightMode ? 'border-rose-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">Fill Blanks ({fillBlanks.length})</h3>
                                <div className={`${contentScrollClass} space-y-3`}>
                                    {fillBlanks.map((item, index) => {
                                        const feedback = fillFeedback[index];
                                        const typed = (guessInputs[`fill-${index}`] || '').trim().toLowerCase();
                                        const correct = String(item.answer || '').trim().toLowerCase();
                                        return (
                                            <div key={index} className={`rounded-2xl p-4 ${ui.card}`}>
                                                <p>{index + 1}. {item.question}</p>
                                                {renderQuestionInput(`fill-${index}`, 'Type your answer')}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button type="button" onClick={() => setFillFeedback((prev) => ({ ...prev, [index]: { correct: typed === correct, answer: item.answer } }))} className="rounded-2xl px-4 py-2 bg-[linear-gradient(120deg,#ec4899,#f97316)] text-white text-sm font-semibold">
                                                        Check Answer
                                                    </button>
                                                    <button type="button" onClick={() => setFillHints((prev) => ({ ...prev, [index]: !prev[index] }))} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${lightMode ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-white/5 text-amber-200 border border-white/10'}`}>
                                                        {fillHints[index] ? 'Hide Hint' : 'Show Hint'}
                                                    </button>
                                                </div>
                                                {fillHints[index] ? <div className={`mt-3 rounded-2xl p-3 text-sm ${lightMode ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-200 border border-amber-400/20'}`}>{getHintText(item.answer)}</div> : null}
                                                {feedback ? <div className={`mt-3 rounded-2xl p-3 ${feedback.correct ? (lightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300') : (lightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-300')}`}>{feedback.correct ? 'Correct' : `Correct answer: ${feedback.answer}`}</div> : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {trueFalse.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.true_false} ${lightMode ? 'border-indigo-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">True / False ({trueFalse.length})</h3>
                                <div className={`${contentScrollClass} space-y-3`}>
                                    {trueFalse.map((item, index) => {
                                        const feedback = tfFeedback[index];
                                        return (
                                            <div key={index} className={`rounded-2xl p-4 ${ui.card}`}>
                                                <p>{index + 1}. {item.question}</p>
                                                <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {['True', 'False'].map((choice) => (
                                                        <button key={choice} type="button" onClick={() => setTfFeedback((prev) => ({ ...prev, [index]: { selected: choice, answer: item.answer } }))} className={`rounded-2xl px-4 py-3 ${ui.input}`}>
                                                            {choice}
                                                        </button>
                                                    ))}
                                                </div>
                                                {feedback ? <div className={`mt-3 rounded-2xl p-3 ${String(feedback.selected).toLowerCase() === String(feedback.answer).toLowerCase() ? (lightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300') : (lightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-300')}`}>{String(feedback.selected).toLowerCase() === String(feedback.answer).toLowerCase() ? 'Correct' : `Correct answer: ${feedback.answer}`}</div> : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {yesNo.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.yes_no} ${lightMode ? 'border-fuchsia-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">Yes / No ({yesNo.length})</h3>
                                <div className={`${contentScrollClass} space-y-3`}>
                                    {yesNo.map((item, index) => {
                                        const feedback = ynFeedback[index];
                                        return (
                                            <div key={index} className={`rounded-2xl p-4 ${ui.card}`}>
                                                <p>{index + 1}. {item.question}</p>
                                                <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {['Yes', 'No'].map((choice) => (
                                                        <button key={choice} type="button" onClick={() => setYnFeedback((prev) => ({ ...prev, [index]: { selected: choice, answer: item.answer } }))} className={`rounded-2xl px-4 py-3 ${ui.input}`}>
                                                            {choice}
                                                        </button>
                                                    ))}
                                                </div>
                                                {feedback ? <div className={`mt-3 rounded-2xl p-3 ${String(feedback.selected).toLowerCase() === String(feedback.answer).toLowerCase() ? (lightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-300') : (lightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-300')}`}>{String(feedback.selected).toLowerCase() === String(feedback.answer).toLowerCase() ? 'Correct' : `Correct answer: ${feedback.answer}`}</div> : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {whQuestions.length ? (
                            <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.wh_questions} ${lightMode ? 'border-lime-200' : 'border-white/10'}`}>
                                <h3 className="text-xl font-bold mb-3">WH Questions ({whQuestions.length})</h3>
                                <div className={`${contentScrollClass} space-y-3`}>
                                    {whQuestions.map((item, index) => (
                                        <div key={index} className={`rounded-2xl p-4 ${ui.card}`}>
                                            <p>{index + 1}. {item.question}</p>
                                            {renderQuestionInput(`wh-${index}`, 'Write your response')}
                                            <button type="button" onClick={() => setWhReveal((prev) => ({ ...prev, [index]: true }))} className="mt-3 rounded-2xl px-4 py-2 bg-[linear-gradient(120deg,#84cc16,#10b981)] text-white text-sm font-semibold">
                                                Reveal Answer
                                            </button>
                                            {whReveal[index] ? <div className={`mt-3 rounded-2xl p-3 ${lightMode ? 'bg-lime-50 text-lime-700' : 'bg-lime-500/10 text-lime-300'}`}>{item.answer}</div> : null}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {generated.memory_map ? <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.memory_map} ${lightMode ? 'border-yellow-200' : 'border-white/10'}`}><h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Boxes size={18} /> Mind Map (1)</h3><MermaidViewer code={generated.memory_map} lightMode={lightMode} /></section> : null}
                    </div>
                </section>

                <section className={`rounded-[2rem] p-5 md:p-6 ${ui.card}`}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquareMore size={20} /> Tutor Chat</h2>
                            <label className={`hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${socraticMode ? (lightMode ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30') : (lightMode ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-neutral-400 border-white/10')}`}>
                                <input type="checkbox" className="hidden" checked={socraticMode} onChange={(e) => setSocraticMode(e.target.checked)} />
                                <BrainCircuit size={14} /> Socratic Mode
                            </label>
                        </div>
                        <span className={`hidden md:inline-flex text-xs px-3 py-1 rounded-full ${ui.badge}`}>
                            {activeId ? 'Saved chat history on' : 'Temporary chat mode'}
                        </span>
                    </div>
                    
                    <label className={`md:hidden flex mb-4 items-center gap-2 text-xs font-bold w-max px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${socraticMode ? (lightMode ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30') : (lightMode ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-neutral-400 border-white/10')}`}>
                         <input type="checkbox" className="hidden" checked={socraticMode} onChange={(e) => setSocraticMode(e.target.checked)} />
                         <BrainCircuit size={14} /> Socratic Mode
                    </label>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 px-1">
                        {chat.map((item, index) => (
                            <div key={index} className={`rounded-[2rem] p-5 border ${item.role === 'user' ? (lightMode ? 'ml-8 bg-sky-50 border-sky-200' : 'ml-8 bg-[linear-gradient(120deg,rgba(14,165,233,0.1),rgba(56,189,248,0.05))] border-sky-400/20') : (lightMode ? 'mr-8 bg-white border-slate-200 shadow-sm' : 'mr-8 bg-white/5 border-white/10')}`}>
                                <p className={`text-xs uppercase tracking-widest font-bold mb-2 ${ui.muted}`}>{item.role === 'user' ? 'You' : 'Tutor'}</p>
                                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{item.message}</p>
                                
                                {item.suggestedFollowups?.length ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {item.suggestedFollowups.map((fup, i) => (
                                            <button key={i} onClick={() => setChatInput(fup)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md ${lightMode ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-black/20 border-white/20 text-white hover:bg-white/10'}`}>
                                                {fup}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                        {!chat.length ? <p className={ui.muted}>Ask questions about the current material. If the material is saved, chat history is also stored.</p> : null}
                    </div>
                    {speechError ? <div className={`text-xs p-2 mb-2 rounded-lg ${lightMode ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'}`}>{speechError}</div> : null}
                    <div className="flex items-center gap-2">
                        <button onClick={toggleListen} title="Voice Dictation" className={`p-3 rounded-2xl transition-all duration-300 ${isListening ? 'bg-red-500 text-white animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(239,68,68,0.6)]' : ui.input}`}>
                            <Mic size={18} className={isListening ? 'animate-bounce' : ''} />
                        </button>
                        <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendChat(); } }} placeholder={isListening ? 'Listening... Speak now' : 'Ask a question about this material...'} className={`flex-1 rounded-2xl px-4 py-3 outline-none ${ui.input} ${isListening ? 'border-red-400 ring-2 ring-red-500/20' : ''}`} />
                        <button onClick={sendChat} disabled={chatLoading || !hasGeneratedData} className="rounded-2xl px-4 py-3 bg-[linear-gradient(120deg,#06b6d4,#2563eb)] text-white font-bold disabled:opacity-40">
                            {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                    {!activeId ? <p className={`text-xs mt-2 ${ui.muted}`}>Chat works immediately. Save the material if you want this chat thread persisted.</p> : null}
                </section>

                <section className={`rounded-[2rem] p-5 md:p-6 ${ui.card}`}>
                    <button onClick={() => setLibraryOpen((prev) => !prev)} className="w-full flex items-center justify-between gap-3">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><Library size={20} /> Library ({library.length})</h2>
                        <span className={`inline-flex items-center gap-2 text-sm ${ui.muted}`}>{libraryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}{libraryOpen ? 'Collapse' : 'Expand'}</span>
                    </button>
                    {libraryOpen ? (
                        <div className="grid gap-3 mt-4">
                            {library.map((item) => {
                                const parsed = resolveStoredData(item);
                                const expanded = Boolean(expandedLibraryItems[item.id]);
                                return (
                                    <div key={item.id} className={`rounded-3xl p-4 ${activeId === item.id ? (lightMode ? 'bg-sky-50 border border-sky-200' : 'bg-sky-500/10 border border-sky-400/30') : ui.card}`}>
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <h3 className="font-bold">{item.source_name || item.filename || `Material ${item.id}`}</h3>
                                                <p className={`text-sm mt-1 ${ui.muted}`}>{new Date(item.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-xs px-3 py-1 rounded-full ${ui.badge}`}>{getItemCount(parsed)} items</span>
                                                <button onClick={() => setExpandedLibraryItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${lightMode ? 'bg-slate-100 text-slate-900' : 'bg-white/10 text-white'}`}>
                                                    {expanded ? 'Hide Details' : 'Show Details'}
                                                </button>
                                                <button onClick={() => openMaterial(item)} className="rounded-2xl px-4 py-2 bg-[linear-gradient(120deg,#0ea5e9,#2563eb)] text-white text-sm font-semibold">
                                                    Open
                                                </button>
                                            </div>
                                        </div>
                                        {expanded ? (
                                            <div className={`mt-4 rounded-2xl p-4 ${lightMode ? 'bg-slate-50 border border-slate-200' : 'bg-black/20 border border-white/10'}`}>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {Object.keys(parsed).map((key) => (
                                                        <span key={key} className={`text-xs px-3 py-1 rounded-full ${ui.badge}`}>{TYPE_LABELS[key] || key}</span>
                                                    ))}
                                                </div>
                                                <p className={`text-sm ${ui.muted}`}>Use Open to restore the exact saved generated content.</p>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                            {!library.length ? <p className={ui.muted}>No saved materials yet.</p> : null}
                        </div>
                    ) : null}
                </section>

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
