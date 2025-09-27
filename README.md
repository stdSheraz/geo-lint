# geo-lint

Fast, zero-dependency GPS **point validation** + **path distance** utilities for ride-hailing and tracking apps.

- ✅ Bounds, accuracy, timestamp, short-step & speed/jump checks
- ✅ Batch accumulation with accepted/rejected separation
- ✅ Path distance in meters for arrays of lat/lng
- ✅ Optional country-specific clock skew policy (future/past)
- ✅ Works great with Firebase/Redis pipelines

---

## Install

```bash
npm i geo-lint
# or
yarn add geo-lint
# or
pnpm add geo-lint
```

**ESM (recommended):**

```ts
import {
	validatePoint,
	validateBatch,
	pathDistanceM,
	haversineM,
	inBounds,
} from "geo-lint";
```

**CommonJS:**

```js
const {
	validatePoint,
	validateBatch,
	pathDistanceM,
	haversineM,
	inBounds,
} = require("geo-lint");
```

---

## Quick start

```ts
import { validatePoint } from "geo-lint";

// First point in a trip (no previous point → distance/speed are 0)
const first = validatePoint({
	lat: 25.28,
	lng: 51.52,
	ts: Date.now(),
	accuracy: 10,
});
// -> { ok: true, reason: 'ok', distanceM: 0, speedKmh: 0 }

if (!first.ok) console.log("invalid:", first.reason);

// Next point (validated against the last accepted)
const last = { lat: 25.28, lng: 51.52, ts: Date.now() - 5000 };
const next = validatePoint(
	{ lat: 25.281, lng: 51.521, ts: Date.now(), accuracy: 15 },
	last,
	{ accuracyMax: 50, minStepM: 3, maxSpeedKmh: 170 }
);
// -> { ok: true, reason: 'ok', distanceM: <m>, speedKmh: <km/h> }
```

---

## Batch accumulation

```ts
import { validateBatch } from "geo-lint";

const t0 = Date.now();
const points = [
	{ lat: 25.28, lng: 51.52, ts: t0 },
	{ lat: 25.28001, lng: 51.52001, ts: t0 + 2000 }, // tiny hop → rejected as "short-step"
	{ lat: 25.281, lng: 51.521, ts: t0 + 20_000 }, // realistic move → accepted
];

const res = validateBatch(points);
/*
{
  accepted: [
    { ...point0, distanceM: 0,   speedKmh: 0,   cumulativeDistanceM: 0 },
    { ...point2, distanceM: 150, speedKmh: 27,  cumulativeDistanceM: 150 },
  ],
  rejected: [{ ...point1, reason: 'short-step' }],
  cumulativeDistanceM: 150,
  last: { lat: 25.281, lng: 51.521, ts: t0 + 20_000 }
}
*/
```

---

## Country-specific skew (future/past timestamps)

`Date.now()` and device `ts` should both be **epoch ms (UTC)**. You can still vary how much skew you tolerate **per country** (e.g., poor connectivity regions).

```ts
import { validatePoint } from "geo-lint";

const NOW = Date.now();
const result = validatePoint(
	{ lat: 25.28, lng: 51.52, ts: NOW + 90_000 }, // 90s in future
	undefined,
	{
		// global defaults (fallbacks)
		futureSkewMs: 30_000, // reject if >30s ahead by default
		pastSkewMs: 5 * 60_000, // reject if >5m old (optional)

		// choose policy by country
		countryCode: "QA", // ISO code
		skewByCountryMs: { QA: 120_000, EG: 60_000 }, // per-country future skew
		pastSkewByCountryMs: { MR: 10 * 60_000 }, // per-country past skew

		// optional test clock injector (number or () => number)
		now: () => NOW,
	}
);
// here, QA allows 120s future → ok
```

---

## Path distance for arrays

```ts
import { pathDistanceM } from "geo-lint";

const meters = pathDistanceM([
	{ lat: 25.276987, lng: 51.520008 },
	{ lat: 25.285447, lng: 51.53104 },
]);

console.log(meters); // > 0
```

---

## API

### `validatePoint(point, last?, opts?) → ValidationResult`

Validates a single point. If `last` is absent, accepts as the first point (`distanceM=0`, `speedKmh=0`).

**`ValidationResult`**

- **OK** → `{ ok: true, reason: 'ok', distanceM: number, speedKmh: number }`
- **Invalid** → `{ ok: false, reason: Reason }`

**`Reason`**

```
'out-of-bounds' |
'mock-location' |
'low-accuracy' |
'non-increasing-timestamp' |
'too-far-in-future' |
'too-far-in-past' |
'short-step' |
'impossible-speed' |
'within-accuracy-noise'
```

---

### `validateBatch(points, initial?, opts?) → BatchResult`

Validates an ordered sequence, accumulates distance, and returns accepted/rejected lists.

**`initial`** (optional)

```ts
{
  last?: { lat: number; lng: number; ts: number };
  cumulativeDistanceM?: number;
}
```

**`BatchResult`**

```ts
{
  accepted: Array<Point & { distanceM: number; speedKmh: number; cumulativeDistanceM: number }>;
  rejected: Array<Point & { reason: Reason }>;
  cumulativeDistanceM: number;
  last?: { lat: number; lng: number; ts: number };
}
```

---

### `pathDistanceM([{lat,lng}, ...]) → number`

Sums Haversine distance over an ordered path (2D).

### `haversineM(a, b) → number`

Haversine distance in meters between two lat/lng points.

### `inBounds(lat, lng) → boolean`

Quick lat/lng bounds check (−90..90, −180..180).

---

## Options

```ts
type IValidationOptions = {
	accuracyMax?: number; // default 50 (m) → reject if accuracy > this
	minStepM?: number; // default 3 (m)  → ignore micro-jitter
	maxSpeedKmh?: number; // default 170    → reject impossible jumps
	requireIncreasingTimestamp?: boolean; // default true
	futureSkewMs?: number; // default 30_000 → future tolerance
	pastSkewMs?: number; // optional       → past tolerance

	// Country policy (ISO code)
	countryCode?: string; // e.g., 'QA', 'EG', 'MR'
	skewByCountryMs?: Record<string, number>; // future skew per country
	pastSkewByCountryMs?: Record<string, number>; // past skew per country

	// Optional clock injector (tests/determinism)
	now?: number | (() => number);
};
```

**Tips**

- Use **epoch ms** (UTC) for all timestamps.
- For city car trips: `{ accuracyMax: 50, minStepM: 3, maxSpeedKmh: 150–170 }`
- For bikes/scooters: `{ accuracyMax: 30–50, minStepM: 1–2, maxSpeedKmh: 40–80 }`
- For background-tolerant: `{ accuracyMax: 80–100, minStepM: 5 }`

---

## Testing

```bash
npm run dev   # watch mode (vitest)
npm test      # single run
```

Use `opts.now: () => fixedNumber` in tests for deterministic time-based checks.

---

## Versioning

- Follows semver.
- Breaking changes bump **major**.
- See Git tags/releases for changelog.

---

## License

MIT © Open Source Contributors
