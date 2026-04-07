export const TYPE_LABELS = {
    summary: 'Summary',
    flashcards: 'Flashcards',
    mcq: 'MCQ',
    fill_blanks: 'Fill Blanks',
    yes_no: 'Yes / No',
    true_false: 'True / False',
    memory_map: 'Mind Map',
    wh_questions: 'WH Questions',
};

export const SECTION_STYLES = {
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
        } catch {
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

export const resolveStoredData = (item = {}) => {
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

export const getHintText = (answer = '') => {
    const normalized = String(answer || '').trim();
    if (!normalized) return 'No hint available.';

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        return `Initial letters: ${words.map((word) => word[0]?.toUpperCase() || '').join(' ')} - ${words.length} words`;
    }

    return `Starts with "${normalized[0]?.toUpperCase() || ''}" - ${normalized.length} letters`;
};

export const getItemCount = (data = {}) => {
    const arrays = ['flashcards', 'mcq', 'fill_blanks', 'yes_no', 'true_false', 'wh_questions'];
    let total = data.summary ? 1 : 0;
    arrays.forEach((key) => {
        if (Array.isArray(data[key])) total += data[key].length;
    });
    if (data.memory_map) total += 1;
    return total;
};
