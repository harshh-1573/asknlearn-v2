import React from 'react';
import { ChevronDown, ChevronUp, Library } from 'lucide-react';
import { TYPE_LABELS, getItemCount, resolveStoredData } from './constants';

const LibraryPanel = ({
    ui,
    lightMode,
    library,
    libraryOpen,
    setLibraryOpen,
    expandedLibraryItems,
    setExpandedLibraryItems,
    activeId,
    openMaterial,
}) => (
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
);

export default LibraryPanel;
