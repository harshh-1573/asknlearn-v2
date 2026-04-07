import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

const stripFences = (value = '') =>
    String(value).replace(/```mermaid/gi, '').replace(/```/g, '').trim();

/** Clean a node label — remove chars that break Mermaid */
const cleanLabel = (text = '') =>
    String(text)
        .replace(/[{}[\]<>`"]/g, '')
        .replace(/:/g, ' -')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 45);

/**
 * Robust sanitizeMindMap:
 * 1. Strips fences & normalises whitespace
 * 2. Extracts root label
 * 3. Uses RELATIVE indentation (min indent = branch level) so it works
 *    regardless of whether the AI uses 2, 4, or 6 spaces per level
 * 4. Caps at 6 branches × 3 children = 19 nodes max
 */
const sanitizeMindMap = (value = '') => {
    const raw = stripFences(value)
        .replace(/\r/g, '')
        .replace(/\t/g, '    ')
        .trim();
    if (!raw) return '';

    const lines = raw.split('\n');
    let rootLabel = 'Study Topic';

    // ── Pass 1: collect all non-header lines with their raw indent count ─────
    const entries = []; // { indent: number, label: string }

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^mindmap$/i.test(trimmed)) continue;

        // Measure leading spaces
        const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;

        // Strip list markers
        let label = trimmed
            .replace(/^[-*+]\s+/, '')
            .replace(/^\d+[.)]\s+/, '')
            .replace(/^#+\s+/, '');

        // Root node patterns: root((Label)) or ((Label))
        if (/^root\s*\(\(/i.test(label)) {
            rootLabel = cleanLabel(label.replace(/^root\s*\(\(/i, '').replace(/\)\)\s*$/, ''));
            continue;
        }
        if (/^\(\(.*\)\)$/.test(label)) {
            rootLabel = cleanLabel(label.replace(/^\(\(/, '').replace(/\)\)$/, ''));
            continue;
        }
        if (/^root\s*(\[.*\])?\s*$/i.test(label)) continue;

        label = cleanLabel(label);
        if (!label) continue;

        entries.push({ indent, label });
    }

    if (!entries.length) {
        // Nothing parsed — minimal fallback
        return `mindmap\n  root((${cleanLabel(rootLabel)}))\n    Key Concepts`;
    }

    // ── Pass 2: determine branch depth vs child depth ────────────────────────
    // The MINIMUM indent among all entries is the "branch" level.
    const minIndent = Math.min(...entries.map(e => e.indent));

    // Improved Root Detection: If the first entry is at the minimum indentation
    // and we still have the default root label, use the first entry as the root.
    let startIndex = 0;
    if (rootLabel === 'Study Topic' && entries[0].indent === minIndent) {
        rootLabel = entries[0].label;
        startIndex = 1;
    }

    // ── Pass 3: build capped output ──────────────────────────────────────────
    const MAX_BRANCHES = 6;
    const MAX_CHILDREN = 3;

    const out = ['mindmap', `  root((${cleanLabel(rootLabel)}))`];

    let branchCount = 0;
    let childCount = 0;

    for (let i = startIndex; i < entries.length; i++) {
        const { indent, label } = entries[i];
        if (indent <= minIndent) {
            // Branch-level node
            if (branchCount >= MAX_BRANCHES) break;
            out.push(`    ${label}`);
            branchCount++;
            childCount = 0;
        } else {
            // Child node
            if (branchCount === 0 || childCount >= MAX_CHILDREN) continue;
            out.push(`      ${label}`);
            childCount++;
        }
    }

    return out.join('\n');
};

const MermaidViewer = ({ code, lightMode }) => {

    const [svg, setSvg] = useState('');
    const [error, setError] = useState('');
    const [zoom, setZoom] = useState(1.0);
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
                    mindmap: {
                        padding: 20,
                    },
                    themeVariables: lightMode ? {} : {
                        primaryColor: '#1e293b',
                        primaryTextColor: '#e2e8f0',
                        primaryBorderColor: '#334155',
                        lineColor: '#64748b',
                    },
                });

                const diagram = sanitizeMindMap(code);
                const result = await window.mermaid.render(`mindmap-${Date.now()}`, diagram);

                if (mounted) {
                    setSvg(result.svg);
                    setError('');
                }
            } catch (error) {
                if (mounted) {
                    setSvg('');
                    setError(error?.message || 'Mind map rendering failed.');
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
                } catch {
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
                } catch {
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
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content' }}
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

export default MermaidViewer;
