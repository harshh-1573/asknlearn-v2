import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const ACTIVE_KEY = 'asknlearn_active_material';

const readActiveMaterial = () => {
    try {
        return JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || '{}');
    } catch (_error) {
        return {};
    }
};

const AIFlashcardsPractice = () => {
    const navigate = useNavigate();
    const material = useMemo(readActiveMaterial, []);
    const cards = Array.isArray(material?.data?.flashcards) ? material.data.flashcards : [];
    const [index, setIndex] = useState(0);

    if (!cards.length) {
        return (
            <div className="min-h-screen bg-[#05070f] text-white p-8 flex items-center justify-center">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
                    <h2 className="text-3xl font-bold mb-3">No Flashcards Found</h2>
                    <p className="text-neutral-400 mb-6">Generate/open a material with flashcards from AskNLearn first.</p>
                    <button onClick={() => navigate('/ai-upload')} className="px-5 py-3 rounded-xl bg-white text-black font-semibold">
                        Back to AskNLearn
                    </button>
                </div>
            </div>
        );
    }

    const card = cards[index];

    return (
        <div className="min-h-screen bg-[#05070f] text-white p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/ai-upload')} className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6">
                    <ArrowLeft size={16} /> Back to AskNLearn
                </button>

                <div className="rounded-[2rem] bg-gradient-to-r from-fuchsia-500/90 to-indigo-500/90 p-8 mb-8">
                    <h1 className="text-4xl font-black">Flashcards Practice</h1>
                    <p className="mt-2 text-white/85">{material?.sourceName || 'Active material'}</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 min-h-[420px] flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-neutral-400 mb-4">Card {index + 1} / {cards.length}</p>
                        <div className="group [perspective:1000px]">
                            <div className="relative min-h-[250px] transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                <div className="absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 p-8 md:p-12 flex items-center justify-center text-center [backface-visibility:hidden]">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] text-neutral-300 mb-4">Question</p>
                                        <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed">{card?.q}</h2>
                                    </div>
                                </div>
                                <div className="absolute inset-0 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12 flex items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-4">Answer</p>
                                        <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed">{card?.a}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-between items-center mt-8">
                        <button
                            onClick={() => { setIndex((i) => Math.max(0, i - 1)); }}
                            disabled={index === 0}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-40 inline-flex items-center gap-2"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="px-4 py-2 rounded-xl bg-indigo-500/80 inline-flex items-center gap-2 text-sm">
                            <RotateCcw size={16} /> Hover Card To Flip
                        </div>
                        <button
                            onClick={() => { setIndex((i) => Math.min(cards.length - 1, i + 1)); }}
                            disabled={index === cards.length - 1}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-40 inline-flex items-center gap-2"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIFlashcardsPractice;
