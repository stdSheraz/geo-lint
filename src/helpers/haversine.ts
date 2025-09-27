import type { Location } from "../types/location.type";

const R = 6371000;
const toRad = (x: number): number => x * Math.PI / 180;

export function haversineM(a: Location, b: Location): number {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

export function inBounds(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function pathDistanceM(points: Array<Location>): number {
    if (!points || points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
    return total;
}