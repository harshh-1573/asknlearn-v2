import React from 'react';
import { Boxes, FileDown, Save, Sparkles, Volume2 } from 'lucide-react';
import MermaidViewer from './MermaidViewer';
import { SECTION_STYLES, getHintText } from './constants';

const GeneratedSections = ({
    ui,
    lightMode,
    activeName,
    saveToLibrary,
    hasGeneratedData,
    saveLoading,
    activeId,
    exportPdf,
    generated,
    flashcards,
    flashcardFlip,
    setFlashcardFlip,
    handleSpeak,
    contentScrollClass,
    mcq,
    mcqFeedback,
    setMcqFeedback,
    fillBlanks,
    fillFeedback,
    setFillFeedback,
    fillHints,
    setFillHints,
    guessInputs,
    renderQuestionInput,
    trueFalse,
    tfFeedback,
    setTfFeedback,
    yesNo,
    ynFeedback,
    setYnFeedback,
    whQuestions,
    whReveal,
    setWhReveal,
}) => (
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
            {generated.summary ? <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.summary} ${lightMode ? 'border-amber-200' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold">Summary (1)</h3>
                    <button onClick={() => handleSpeak(generated.summary)} className="p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-full transition-colors" title="Read Aloud">
                        <Volume2 size={18} />
                    </button>
                </div>
                <div className={contentScrollClass}><p className="leading-7 whitespace-pre-wrap">{generated.summary}</p></div>
            </section> : null}

            {flashcards.length ? (
                <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.flashcards} ${lightMode ? 'border-sky-200' : 'border-white/10'}`}>
                    <h3 className="text-xl font-bold mb-3">Flashcards ({flashcards.length})</h3>
                    <div className={`${contentScrollClass} grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`}>
                        {flashcards.map((item, index) => (
                            <div
                                key={index}
                                className="group flex flex-col gap-3"
                                onMouseEnter={() => setFlashcardFlip((prev) => ({ ...prev, [index]: true }))}
                                onMouseLeave={() => setFlashcardFlip((prev) => ({ ...prev, [index]: false }))}
                            >
                                <div className="[perspective:1000px] cursor-pointer">
                                    <div
                                        className="relative min-h-[160px] transition-transform duration-500 [transform-style:preserve-3d]"
                                        style={{ transform: flashcardFlip[index] ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                                    >
                                        <div className={`absolute inset-0 rounded-2xl p-4 [backface-visibility:hidden] ${ui.card}`}>
                                            <p className={`text-xs uppercase tracking-[0.2em] mb-2 pr-6 ${ui.muted}`}>Question</p>
                                            <p className="pr-4 leading-relaxed font-medium">{item.q}</p>
                                        </div>
                                        <div className={`absolute inset-0 rounded-2xl p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ${lightMode ? 'bg-cyan-50 border border-cyan-200 text-slate-900' : 'bg-cyan-500/10 border border-cyan-400/20 text-white'}`}>
                                            <p className={`text-xs uppercase tracking-[0.2em] mb-2 pr-6 ${ui.muted}`}>Answer</p>
                                            <p className="pr-4 leading-relaxed font-medium">{item.a}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center px-2 opacity-10 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => handleSpeak(item.q)}
                                        className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors ${lightMode ? 'text-slate-500 hover:text-[#7c3aed]' : 'text-neutral-400 hover:text-[#7c3aed]'}`}
                                        title="Speak Question"
                                    >
                                        <Volume2 size={12} /> Question
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSpeak(item.a)}
                                        className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest transition-colors ${lightMode ? 'text-slate-500 hover:text-cyan-500' : 'text-neutral-400 hover:text-cyan-400'}`}
                                        title="Speak Answer"
                                    >
                                        <Volume2 size={12} /> Answer
                                    </button>
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

            {generated.memory_map ? (
                <section className={`rounded-[1.5rem] border p-5 bg-gradient-to-br ${SECTION_STYLES.memory_map} ${lightMode ? 'border-yellow-200' : 'border-white/10'}`}>
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Boxes size={18} /> Mind Map (1)</h3>
                    <MermaidViewer code={generated.memory_map} lightMode={lightMode} />
                </section>
            ) : null}
        </div>
    </section>
);

export default GeneratedSections;
