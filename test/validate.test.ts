import { describe, it, expect } from 'vitest';
import { validatePoint, validateBatch, pathDistanceM } from '../src';

describe('geo-lint core', () => {
    it('accepts first point', () => {
        const r = validatePoint({ lat: 25.28, lng: 51.52, ts: Date.now(), accuracy: 10 });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.distanceM).toBe(0);
    });

    it('rejects out-of-bounds', () => {
        const r = validatePoint({ lat: 999, lng: 0, ts: Date.now() });
        expect(r.ok).toBe(false);
    });

    it('computes path distance', () => {
        const d = pathDistanceM([
            { lat: 25.276987, lng: 51.520008 },
            { lat: 25.285447, lng: 51.531040 },
        ]);
        expect(d).toBeGreaterThan(0);
    });

    it('batch accumulates and returns last', () => {
        const t0 = Date.now();
        const res = validateBatch(
            [
                { lat: 25.28, lng: 51.52, ts: t0 },
                { lat: 25.28001, lng: 51.52001, ts: t0 + 2000 },   // short-step → reject
                { lat: 25.29, lng: 51.53, ts: t0 + 20_000 }  // ~1.5 km in 20s → ~270 km/h
            ],
            undefined,
            { maxSpeedKmh: 400 } // relax for this test only
        );
        expect(res.accepted.length).toBe(2);
        expect(res.rejected.length).toBe(1);
        expect(res.cumulativeDistanceM).toBeGreaterThan(0);
        expect(res.last).toBeDefined();
    });
});

describe('skew & options behavior', () => {
    const NOW = 1_700_000_000_000; // fixed "now" to make tests deterministic

    it('rejects too-far-in-future using default futureSkewMs', () => {
        const r = validatePoint(
            { lat: 25.28, lng: 51.52, ts: NOW + 31_000 }, // 31s in the future
            undefined,
            { futureSkewMs: 30_000, now: () => NOW }
        );
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('too-far-in-future');
    });

    it('allows future point within country override', () => {
        const r = validatePoint(
            { lat: 25.28, lng: 51.52, ts: NOW + 90_000 }, // 90s future
            undefined,
            {
                countryCode: 'QA',
                futureSkewMs: 30_000, // default
                skewByCountryMs: { QA: 120_000 }, // country override
                now: () => NOW,
            } as any
        );
        expect(r.ok).toBe(true);
    });

    it('rejects too-far-in-past when pastSkewMs configured', () => {
        const r = validatePoint(
            { lat: 25.28, lng: 51.52, ts: NOW - 120_000 }, // 2 min old
            undefined,
            { pastSkewMs: 60_000, now: () => NOW }
        );
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('too-far-in-past');
    });

    it('coerces numeric string options (e.g., minStepM)', () => {
        const last = { lat: 25.28, lng: 51.52, ts: NOW - 2000 };
        // ~1–2 m move → should be rejected when minStepM = "3"
        const r = validatePoint(
            { lat: 25.28001, lng: 51.52001, ts: NOW, accuracy: 5 },
            last,
            { minStepM: '3', now: () => NOW } as any // pass as string; validator coerces
        );
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toBe('short-step');
    });

    it('respects pastSkewByCountryMs override', () => {
        const r = validatePoint(
            { lat: 25.28, lng: 51.52, ts: NOW - 6 * 60_000 }, // 6 min old
            undefined,
            {
                countryCode: 'MR',
                pastSkewMs: 60_000, // default
                pastSkewByCountryMs: { MR: 10 * 60_000 }, // 10 min allowed in MR
                now: () => NOW,
            } as any
        );
        expect(r.ok).toBe(true);
    });
});
