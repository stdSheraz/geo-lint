export interface IValidationOptions {
    accuracyMax?: number;
    minStepM?: number;
    maxSpeedKmh?: number;
    requireIncreasingTimestamp?: boolean;
    futureSkewMs?: number;
    pastSkewMs?: number;
    countryCode?: string;
    skewByCountryMs?: Record<string, number>;
    pastSkewByCountryMs?: Record<string, number>;
    now?: () => number;
}

export type Defaulted = Required<Pick<IValidationOptions, 'accuracyMax' | 'minStepM' | 'maxSpeedKmh' | 'requireIncreasingTimestamp' | 'futureSkewMs'>>;