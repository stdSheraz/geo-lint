import type { Reason } from "../types/reason.type";

export interface IPointValidationBadResponse {
    ok: false,
    reason: Reason
}