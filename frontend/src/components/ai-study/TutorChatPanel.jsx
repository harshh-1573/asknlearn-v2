import React from 'react';
import { BrainCircuit, Loader2, MessageSquareMore, Mic, Send } from 'lucide-react';

const TutorChatPanel = ({
    ui,
    lightMode,
    socraticMode,
    setSocraticMode,
    activeId,
    chat,
    setChatInput,
    speechError,
    toggleListen,
    isListening,
    chatInput,
    sendChat,
    chatLoading,
    hasGeneratedData,
}) => (
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
);

export default TutorChatPanel;
