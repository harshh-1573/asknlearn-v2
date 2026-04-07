import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bot, Boxes, Loader2, Send, Sparkles, Volume2 } from 'lucide-react';

const API = 'http://localhost:5000';

const WorkspaceChat = () => {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    const [chatHistory, setChatHistory] = useState([
        { role: 'assistant', text: 'Welcome to your Multi-Document Workspace! I am now analyzing and cross-referencing your selected files. What would you like to know?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isChatLoading]);

    useEffect(() => {
        const fetchWorkspaceMaterials = async () => {
            try {
                const ids = JSON.parse(sessionStorage.getItem('workspace_materials') || '[]');
                if (!ids.length) {
                    navigate('/dashboard');
                    return;
                }
                const res = await axios.post(`${API}/api/ai/workspace-materials`, { materialIds: ids });
                setMaterials(res.data.materials || []);
            } catch (err) {
                console.error('Failed to load workspace materials:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchWorkspaceMaterials();
    }, [navigate]);

    const handleSpeak = (text) => {
        if (!('speechSynthesis' in window)) return alert('Web Speech API is not supported in your browser.');
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatLoading(true);

        try {
            // Merge massive context
            const combinedSourceText = materials.map(m => `--- DOCUMENT: ${m.source_name || m.filename} ---\n${m.content || ''}`).join('\n\n');
            const combinedJson = materials.map(m => `--- DATA: ${m.source_name || m.filename} ---\n${m.content_json || '{}'}`).join('\n\n');

            const payload = {
                userId: localStorage.getItem('userId') || '0',
                materialId: null, // Signals backend that this is a workspace hybrid chat
                question: userMsg,
                sourceText: combinedSourceText,
                generatedJson: { context: combinedJson },
                history: chatHistory.slice(-6),
                language: 'English',
                socraticMode: false
            };

            const res = await axios.post(`${API}/api/ai/chat`, payload);

            const aiLines = res.data.answer || "I didn't quite get that.";
            setChatHistory(prev => [...prev, { role: 'assistant', text: aiLines }]);

        } catch {
            setChatHistory(prev => [...prev, { role: 'assistant', text: 'Connection failed. Please check if the AI microservice is running.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070f] flex items-center justify-center text-white">
                <Loader2 className="animate-spin text-sky-500 mb-4" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070f] text-white flex flex-col font-sans">
            <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070f]/80 backdrop-blur-xl p-4 md:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <Boxes className="text-sky-500" /> Multi-Document Workspace
                        </h1>
                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{materials.length} Sources Active</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar scroll-smooth relative">
                <div className="max-w-4xl mx-auto pb-32">
                    <div className="flex flex-wrap gap-2 mb-8">
                        {materials.map(m => (
                            <span key={m.id} className="text-xs px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
                                {m.source_name || m.filename || `Document ${m.id}`}
                            </span>
                        ))}
                    </div>

                    <div className="space-y-6">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeInUp_0.4s_ease-out]`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className="mt-1 shrink-0">
                                        {msg.role === 'user' ? (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-0.5 shadow-lg"><div className="w-full h-full bg-black/20 rounded-full"></div></div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center shadow-lg"><Bot size={16} /></div>
                                        )}
                                    </div>
                                    <div className={`p-4 md:p-5 rounded-2xl relative group ${
                                        msg.role === 'user'
                                            ? 'bg-[linear-gradient(120deg,#0ea5e9,#6366f1)] text-white rounded-tr-sm shadow-[0_5px_15px_rgba(14,165,233,0.3)]'
                                            : 'bg-white/5 border border-white/10 text-neutral-200 rounded-tl-sm'
                                    }`}>
                                        <div className="whitespace-pre-wrap leading-relaxed space-y-3 prose prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 text-[15px]">
                                            {msg.text}
                                        </div>
                                        {msg.role === 'assistant' && (
                                            <button onClick={() => handleSpeak(msg.text)} className="absolute -right-8 top-2 p-1.5 text-neutral-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-all bg-white/5 rounded-full shadow-lg">
                                                <Volume2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start animate-[fadeInUp_0.4s_ease-out]">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0 shadow-lg"><Sparkles size={16} className="animate-pulse" /></div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 rounded-tl-sm flex gap-2 items-center">
                                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#05070f] via-[#05070f] to-transparent pointer-events-none z-20">
                <div className="max-w-4xl mx-auto pointer-events-auto">
                    <form onSubmit={handleSendMessage} className="relative group">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask across all active documents..."
                            className="w-full bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-6 pr-14 outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all shadow-2xl"
                            disabled={isChatLoading}
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isChatLoading}
                            className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-lg shadow-sky-500/30"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceChat;
