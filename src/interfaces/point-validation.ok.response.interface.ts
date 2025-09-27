export interface IPointValidationOkResponse {
    ok: true;
    distanceM: number;
    speedKmh: number;
    reason: "ok";
}