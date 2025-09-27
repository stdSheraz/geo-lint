import type { Reason } from "../types/reason.type";
import type { ILastLocationPoint, ILocationPoint } from "./location-point.interface";

export interface IBatchResponse {
    accepted: Array<ILocationPoint & { distanceM: number; speedKmh: number; cumulativeDistanceM: number }>;
    rejected: Array<ILocationPoint & { reason: Reason }>;
    cumulativeDistanceM: number;
    last?: ILastLocationPoint;
}