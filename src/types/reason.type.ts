export type Reason =
    | 'ok'
    | 'out-of-bounds'
    | 'mock-location'
    | 'low-accuracy'
    | 'non-increasing-timestamp'
    | 'too-far-in-future'
    | 'short-step'
    | 'impossible-speed'
    | 'within-accuracy-noise';