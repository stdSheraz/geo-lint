export type ILocationPoint = {
    lat: number;
    lng: number;
    ts: number;
    accuracy?: number;
    speed?: number;
    bearing?: number;
    alt?: number;
    source?: string;
    isMocked?: boolean;
};

export interface ILastLocationPoint {
    lat: number;
    lng: number;
    ts: number;
    seq?: number
}