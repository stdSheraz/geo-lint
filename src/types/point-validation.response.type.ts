import type { IPointValidationBadResponse } from "../interfaces/point-validation.bad.response.interface";
import type { IPointValidationOkResponse } from "../interfaces/point-validation.ok.response.interface";

export type PointValidationResponse = IPointValidationOkResponse | IPointValidationBadResponse;