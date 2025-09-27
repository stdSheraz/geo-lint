import type { IBatchResponse } from "../interfaces/batch.response.interface";
import type { ILastLocationPoint, ILocationPoint } from "../interfaces/location-point.interface";
import type { Defaulted, IValidationOptions } from "../interfaces/validation-options.interface";
import type { PointValidationResponse } from "../types/point-validation.response.type";
import { toNum } from "./functions.helper";
import { haversineM, inBounds } from "./haversine";

// validate point
export function validatePoint(
    currentPoint: ILocationPoint,
    lastPoint?: ILastLocationPoint,
    opts: IValidationOptions = {}
): PointValidationResponse {
    const accuracyMax = toNum((opts as any).accuracyMax, 50);
    const minStepM = toNum((opts as any).minStepM, 3);
    const maxSpeedKmh = toNum((opts as any).maxSpeedKmh, 170);
    const requireIncTs = (opts as any).requireIncreasingTimestamp ?? true;
    const cc = (opts as any).countryCode?.toString().toUpperCase();
    const skewByCountryMs = (opts as any).skewByCountryMs as Record<string, string | number> | undefined;
    const pastSkewByCountryMs = (opts as any).pastSkewByCountryMs as Record<string, string | number> | undefined;
    const countryFutureRaw = cc ? skewByCountryMs?.[cc] : undefined;
    const futureSkewMs = toNum((countryFutureRaw ?? (opts as any).futureSkewMs), 30_000);
    const countryPastRaw = cc ? pastSkewByCountryMs?.[cc] : undefined;
    const pastSkewMsVal = toNum((countryPastRaw ?? (opts as any).pastSkewMs), NaN);
    const pastSkewMs = Number.isFinite(pastSkewMsVal) ? pastSkewMsVal : undefined;

    const now = (opts?.now ?? Date.now)();

    // bounds & mock
    if (!inBounds(currentPoint.lat, currentPoint.lng)) return { ok: false, reason: 'out-of-bounds' };
    if ((currentPoint as any).isMocked) return { ok: false, reason: 'mock-location' };

    // ts as number
    const tsNum = toNum((currentPoint as any).ts, NaN);
    if (!Number.isFinite(tsNum)) return { ok: false, reason: 'non-increasing-timestamp' };

    // future / past skew
    if (tsNum - now > futureSkewMs) return { ok: false, reason: 'too-far-in-future' };
    if (typeof pastSkewMs === 'number' && now - tsNum > pastSkewMs) return { ok: false, reason: 'too-far-in-past' as any };

    // accuracy
    if (typeof (currentPoint as any).accuracy === 'number' && (currentPoint as any).accuracy > accuracyMax) return { ok: false, reason: 'low-accuracy' };

    // first point   
    if (!lastPoint) return { ok: true, reason: 'ok', distanceM: 0, speedKmh: 0 };

    // time order
    const dtSec = (tsNum - lastPoint.ts) / 1000;
    if (requireIncTs && dtSec <= 0) return { ok: false, reason: 'non-increasing-timestamp' };

    // distance / noise / speed
    const d = haversineM({ lat: lastPoint.lat, lng: lastPoint.lng }, { lat: currentPoint.lat, lng: currentPoint.lng });
    if (d < minStepM) return { ok: false, reason: 'short-step' };

    if (typeof (currentPoint as any).accuracy === 'number' && d < (currentPoint as any).accuracy) {
        return { ok: false, reason: 'within-accuracy-noise' };
    }

    const speedKmh = dtSec > 0 ? (d / 1000) / (dtSec / 3600) : Infinity;
    if (speedKmh > maxSpeedKmh) return { ok: false, reason: 'impossible-speed' };

    return { ok: true, reason: 'ok', distanceM: d, speedKmh };

}


/** Validate+accumulate over an ordered batch. */
export function validateBatch(
    points: ILocationPoint[],
    initial?: { last?: ILastLocationPoint; cumulativeDistanceM?: number },
    opts?: IValidationOptions
): IBatchResponse {
    const accepted: IBatchResponse['accepted'] = [];
    const rejected: IBatchResponse['rejected'] = [];
    let cum = initial?.cumulativeDistanceM ?? 0;
    let last = initial?.last;

    for (const point of points) {
        const res = validatePoint(point, last, opts);
        if (!res.ok) {
            rejected.push({ ...point, reason: res.reason });
            continue;
        }
        cum += res.distanceM;
        accepted.push({ ...point, distanceM: res.distanceM, speedKmh: res.speedKmh, cumulativeDistanceM: cum });
        last = { lat: point.lat, lng: point.lng, ts: point.ts };
    }
    return { accepted, rejected, cumulativeDistanceM: cum, last };
}