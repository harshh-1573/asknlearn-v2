import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Timer } from 'lucide-react';

const ACTIVE_KEY = 'asknlearn_active_material';

const readActiveMaterial = () => {
    try {
        return JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || '{}');
    } catch {
        return {};
    }
};

const AIQuizPractice = () => {
    const navigate = useNavigate();
    const material = useMemo(() => readActiveMaterial(), []);
    const questions = Array.isArray(material?.data?.mcq) ? material.data.mcq : [];

    const [started, setStarted] = useState(false);
    const [timerMins, setTimerMins] = useState(10);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);

    React.useEffect(() => {
        if (!started || showResult) return undefined;
        const id = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setShowResult(true);
                    clearInterval(id);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [started, showResult]);

    if (!questions.length) {
        return (
            <div className="min-h-screen bg-[#05070f] text-white p-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                    <h2 className="text-3xl font-bold mb-3">No Quiz Found</h2>
                    <p className="text-neutral-400 mb-6">Generate/open a material with MCQ from AskNLearn first.</p>
                    <button onClick={() => navigate('/ai-upload')} className="px-5 py-3 rounded-xl bg-white text-black font-semibold">
                        Back to AskNLearn
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const score = questions.reduce((acc, q, idx) => {
        const correct = String(q.correct_option || '').toUpperCase();
        return acc + (answers[idx] === correct ? 1 : 0);
    }, 0);

    return (
        <div className="min-h-screen bg-[#05070f] text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/ai-upload')} className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6">
                    <ArrowLeft size={16} /> Back to AskNLearn
                </button>

                <div className="rounded-[2rem] bg-gradient-to-r from-emerald-500/90 to-indigo-500/90 p-8 mb-8">
                    <h1 className="text-4xl font-black">Quiz Practice Session</h1>
                    <p className="mt-2 text-white/85">{material?.sourceName || 'Active material'}</p>
                </div>

                {!started ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                        <h2 className="text-2xl font-bold mb-4">Configure Session</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/20 border border-white/10 rounded-2xl p-4">
                                <p className="text-sm text-neutral-400">Questions</p>
                                <p className="text-4xl font-black text-indigo-300">{questions.length}</p>
                            </div>
                            <div className="bg-black/20 border border-white/10 rounded-2xl p-4">
                                <p className="text-sm text-neutral-400">Timer (minutes)</p>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={timerMins}
                                    onChange={(e) => setTimerMins(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => { setStarted(true); setTimeLeft(timerMins * 60); }}
                            className="mt-6 px-6 py-3 rounded-xl bg-white text-black font-bold"
                        >
                            Start Practice
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <p className="text-sm text-neutral-300">Answer all questions and submit when ready.</p>
                            <div className={`px-3 py-2 rounded-full border inline-flex items-center gap-2 ${timeLeft < 60 ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'}`}>
                                <Timer size={14} /> {formatTime(timeLeft)}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {questions.map((q, idx) => {
                                const picked = answers[idx];
                                const correct = String(q.correct_option || '').toUpperCase();
                                return (
                                    <div key={idx} className="p-4 rounded-2xl border border-white/10 bg-black/20">
                                        <p className="font-semibold mb-3">{idx + 1}. {q.question}</p>
                                        {['A', 'B', 'C', 'D'].map((k) => q.options?.[k] ? (
                                            <button
                                                key={k}
                                                onClick={() => setAnswers((prev) => ({ ...prev, [idx]: k }))}
                                                className={`block w-full text-left p-2.5 rounded-lg border mb-2 ${picked === k ? 'bg-indigo-500/20 border-indigo-400/40' : 'bg-white/5 border-white/10'}`}
                                            >
                                                <span className="font-semibold mr-2">{k}.</span>{q.options[k]}
                                            </button>
                                        ) : null)}
                                        {showResult ? (
                                            <div className={`mt-2 text-sm ${picked === correct ? 'text-emerald-300' : 'text-red-300'}`}>
                                                {picked === correct
                                                    ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} /> Correct</span>
                                                    : <span className="inline-flex items-center gap-2"><XCircle size={14} /> Correct option: {correct}</span>}
                                            </div>
                                        ) : null}
                                        {showResult && q.explanation ? <p className="text-sm text-neutral-400 mt-1">{q.explanation}</p> : null}
                                    </div>
                                );
                            })}
                        </div>

                        {!showResult ? (
                            <button onClick={() => setShowResult(true)} className="mt-6 px-6 py-3 rounded-xl bg-emerald-500 font-bold">
                                Submit Quiz
                            </button>
                        ) : (
                            <div className="mt-6 p-4 rounded-2xl bg-indigo-500/20 border border-indigo-400/30">
                                <h3 className="text-2xl font-black">Score: {score}/{questions.length}</h3>
                                <p className="text-neutral-300 mt-1">Accuracy: {questions.length ? ((score / questions.length) * 100).toFixed(1) : '0.0'}%</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIQuizPractice;
