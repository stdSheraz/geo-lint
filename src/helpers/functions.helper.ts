export function toNum(v: unknown, fallback: number): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = Number(v.trim());
        if (Number.isFinite(n)) return n;
    }
    return fallback;
}