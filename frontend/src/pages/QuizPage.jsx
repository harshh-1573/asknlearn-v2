import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    ChevronLeft, ChevronRight, CheckCircle2, XCircle,
    Award, Lightbulb, Timer as TimerIcon, Activity, Trophy, RotateCcw
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const SUBJECT_NAMES = {
    1: 'Operating Systems',
    2: 'DBMS',
    3: 'Computer Networks',
    4: 'DSA',
    5: 'OOPs',
    6: 'Programming',
};

const getCorrectOptionKey = (question) => {
    if (!question?.correct_answer) return null;

    const normalizedAnswer = String(question.correct_answer).trim().toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(normalizedAnswer)) {
        return normalizedAnswer;
    }

    return ['a', 'b', 'c', 'd'].find((key) => {
        const optionValue = question[`option_${key}`];
        return String(optionValue || '').trim().toLowerCase() === normalizedAnswer;
    }) || null;
};

const QuizPage = () => {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const { state } = useLocation();

    const limit = state?.limit || 10;
    const initialTimer = (state?.timer || 10) * 60;
    const subjectName = state?.subjectName || SUBJECT_NAMES[Number(subjectId)] || 'Quiz Assessment';

    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [isAnswered, setIsAnswered] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(initialTimer);
    const [quizSessionId] = useState(uuidv4());

    const timerRef = useRef(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/questions/${subjectId}?limit=${limit}`);
                const nextQuestions = Array.isArray(res.data) ? res.data : [];
                setQuestions(nextQuestions);

                if (!nextQuestions.length) {
                    setError('No questions were found for this subject yet.');
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
                setError(
                    err.response?.data?.error ||
                    'Unable to load quiz questions right now. Please try again.'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [subjectId, limit]);

    useEffect(() => {
        if (loading || showResults || !questions.length) return undefined;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [loading, showResults, questions.length]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleOptionSelect = (optionKey) => {
        if (isAnswered) return;

        const currentQ = questions[currentIdx];
        const correctOptionKey = getCorrectOptionKey(currentQ);
        const isCorrect = optionKey === correctOptionKey;

        if (isCorrect) setScore((prev) => prev + 1);

        setSelectedAnswers({
            ...selectedAnswers,
            [currentIdx]: {
                question_id: currentQ.question_id,
                selected_option: optionKey.toUpperCase(),
                selected_value: currentQ[`option_${optionKey}`],
                is_correct: isCorrect,
            },
        });
        setIsAnswered(true);
    };

    const handleSubmitQuiz = async () => {
        clearInterval(timerRef.current);
        setShowResults(true);

        try {
            const userId = localStorage.getItem('userId');
            const resultsArray = Object.values(selectedAnswers);

            if (!resultsArray.length) return;

            await axios.post('http://localhost:5000/api/submit-quiz', {
                userId,
                subjectId,
                quizSessionId,
                results: resultsArray,
            });
        } catch (err) {
            console.error('Failed to save scorecard:', err);
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx((prev) => prev + 1);
            setIsAnswered(false);
        } else {
            handleSubmitQuiz();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white mb-6"></div>
                <p className="text-neutral-400 font-light tracking-wide">Initializing your assessment...</p>
            </div>
        );
    }

    if (error && !questions.length) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 blur-[140px] rounded-full pointer-events-none"></div>
                <div className="max-w-xl w-full bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-10 text-center relative z-10">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Quiz Unavailable</h2>
                    <p className="text-neutral-400 mb-8 leading-relaxed">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/cs-quiz-master')}
                            className="bg-white text-black hover:bg-neutral-200 py-3 px-6 rounded-xl font-bold transition-all"
                        >
                            Back to CS Quiz Master
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 px-6 rounded-xl font-bold transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showResults) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 relative overflow-hidden">
                <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none"></div>

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                            <div>
                                <div className="mx-auto md:mx-0 w-20 h-20 bg-gradient-to-tr from-blue-500 to-violet-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(59,130,246,0.5)]">
                                    <Award className="text-white" size={40} />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Assessment Complete</h2>
                                <p className="text-neutral-400 text-sm uppercase tracking-widest">{subjectName}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:min-w-[420px]">
                                <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3"><Trophy size={16} /> Score</div>
                                    <div className="text-4xl font-black text-indigo-300">{score}/{questions.length}</div>
                                </div>
                                <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3"><Activity size={16} /> Accuracy</div>
                                    <div className="text-4xl font-black text-indigo-300">
                                        {questions.length ? Math.round((score / questions.length) * 100) : 0}%
                                    </div>
                                </div>
                                <div className="bg-black/30 rounded-2xl p-5 border border-white/5">
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3"><TimerIcon size={16} /> Timer</div>
                                    <div className="text-4xl font-black text-indigo-300">{Math.round(initialTimer / 60)}m</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                            <button
                                onClick={() => navigate('/cs-quiz-master')}
                                className="bg-white text-black hover:bg-neutral-200 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} /> Back to CS Quiz Master
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 px-6 rounded-xl font-bold transition-all"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold tracking-tight">Answer Review</h3>
                        {questions.map((question, index) => {
                            const answer = selectedAnswers[index];
                            const correctOptionKey = getCorrectOptionKey(question);
                            const selectedKey = answer?.selected_option?.toLowerCase();

                            return (
                                <div key={question.question_id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div>
                                            <p className="text-neutral-500 text-xs uppercase tracking-[0.2em] mb-2">Question {index + 1}</p>
                                            <h4 className="text-xl font-semibold leading-relaxed">{question.question_text}</h4>
                                        </div>
                                        {answer?.is_correct ? (
                                            <span className="text-emerald-400 text-sm font-bold">Correct</span>
                                        ) : (
                                            <span className="text-red-400 text-sm font-bold">Incorrect</span>
                                        )}
                                    </div>

                                    <div className="grid gap-3 mb-5">
                                        {['a', 'b', 'c', 'd'].map((key) => {
                                            const isCorrect = key === correctOptionKey;
                                            const isSelected = key === selectedKey;
                                            let style = 'bg-white/5 border-white/10 text-neutral-300';

                                            if (isCorrect) {
                                                style = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
                                            } else if (isSelected) {
                                                style = 'bg-red-500/10 border-red-500/40 text-red-300';
                                            }

                                            return (
                                                <div key={key} className={`border rounded-2xl p-4 ${style}`}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="font-medium">
                                                            {key.toUpperCase()}. {question[`option_${key}`]}
                                                        </span>
                                                        <div className="shrink-0">
                                                            {isCorrect && <CheckCircle2 size={18} className="text-emerald-400" />}
                                                            {!isCorrect && isSelected && <XCircle size={18} className="text-red-400" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                        <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                            <div className="text-neutral-500 uppercase tracking-[0.2em] text-xs mb-2">Your Answer</div>
                                            <div className="text-white font-medium">
                                                {answer ? `${answer.selected_option}. ${answer.selected_value}` : 'Not answered'}
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                            <div className="text-neutral-500 uppercase tracking-[0.2em] text-xs mb-2">Correct Answer</div>
                                            <div className="text-emerald-300 font-medium">
                                                {correctOptionKey ? `${correctOptionKey.toUpperCase()}. ${question[`option_${correctOptionKey}`]}` : 'Unavailable'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">
                                            <Lightbulb size={14} /> Explanation
                                        </div>
                                        <p className="text-neutral-300 text-sm leading-relaxed">
                                            {question.explanation || 'No additional explanation available for this question.'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    const q = questions[currentIdx];
    const correctOptionKey = getCorrectOptionKey(q);
    const selectedKey = selectedAnswers[currentIdx]?.selected_option?.toLowerCase();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans relative overflow-hidden">
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-3xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={() => navigate('/cs-quiz-master')} className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium tracking-wide">
                        <ChevronLeft size={16} /> Quit
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                            <Activity size={14} className="text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-300">
                                {currentIdx + 1} <span className="text-neutral-600">/ {questions.length}</span>
                            </span>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-colors ${timeLeft < 60 ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-neutral-300'}`}>
                            <TimerIcon size={14} />
                            <span className="font-mono text-sm font-medium">
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="w-full h-1 bg-neutral-900 rounded-full mb-12 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500 ease-out"
                        style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl md:text-3xl font-medium leading-relaxed tracking-tight mb-10">
                        {q.question_text}
                    </h2>

                    <div className="grid gap-3">
                        {['a', 'b', 'c', 'd'].map((key) => {
                            const optionValue = q[`option_${key}`];
                            const isCorrect = key === correctOptionKey;
                            const isUserPick = key === selectedKey;

                            let baseStyle = 'border-white/5 bg-white/5 hover:bg-white/10 text-neutral-300';
                            if (isAnswered) {
                                if (isCorrect) baseStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                                else if (isUserPick) baseStyle = 'border-red-500/50 bg-red-500/10 text-red-400';
                                else baseStyle = 'border-white/5 bg-transparent text-neutral-600 opacity-50';
                            }

                            return (
                                <button
                                    key={key}
                                    disabled={isAnswered}
                                    onClick={() => handleOptionSelect(key)}
                                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex justify-between items-center group ${baseStyle}`}
                                >
                                    <span className="text-base font-medium">{key.toUpperCase()}. {optionValue}</span>
                                    <div className="flex items-center ml-4 shrink-0">
                                        {isAnswered && isCorrect && <CheckCircle2 size={20} className="text-emerald-500" />}
                                        {isAnswered && isUserPick && !isCorrect && <XCircle size={20} className="text-red-500" />}
                                        {!isAnswered && <div className="w-5 h-5 rounded-full border border-neutral-600 group-hover:border-neutral-400 transition-colors"></div>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {isAnswered && (
                        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">
                                <Lightbulb size={14} /> Explanation
                            </div>
                            <p className="text-neutral-300 text-sm leading-relaxed">
                                {q.explanation || 'No additional explanation available for this question.'}
                            </p>
                        </div>
                    )}
                </div>

                {isAnswered && (
                    <div className="flex justify-end mt-8 pb-12 animate-in fade-in duration-300">
                        <button
                            onClick={nextQuestion}
                            className="bg-white text-black hover:bg-neutral-200 px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                        >
                            {currentIdx === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizPage;
