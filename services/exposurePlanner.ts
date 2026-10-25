// Pure helpers for the Exposure Planner: the EV ruler's range, the scene a
// given EV falls in, EV formatting, which column gives way when the EV
// changes, and the exposure arithmetic the reading sheet uses. No React or
// Expo imports so this runs unchanged under the Node test harness.

export const EV_PLANNER_MIN = -3;
export const EV_PLANNER_MAX = 17;
export const EV_PLANNER_DEFAULT = 15;

const THIRD = 1 / 3;

/** Round to the nearest third so values from the ruler compare equal. */
const toThird = (value: number): number => Math.round(value * 3) / 3;

/** Every ruler tick, in thirds of a stop from darkest to brightest. */
export const EV_PLANNER_VALUES: number[] = Array.from(
    { length: (EV_PLANNER_MAX - EV_PLANNER_MIN) * 3 + 1 },
    (_, i) => toThird(EV_PLANNER_MIN + i * THIRD),
);

export type SceneKey =
    | 'snow' | 'sun' | 'hazySun' | 'brightOvercast' | 'overcast' | 'heavyOvercast'
    | 'sunset' | 'afterSunset' | 'brightInterior' | 'litStreet' | 'homeInterior'
    | 'dimInterior' | 'candlelight' | 'distantLights' | 'nightSkyline' | 'moonlight';

export type ExposureScene = {
    key: SceneKey;
    /** The whole stop (EV100) the band is centred on. */
    ev: number;
    /** SF Symbol name (iOS). */
    sf: string;
    /** Material Icons name (Android). */
    md: string;
};

/** Brightest first. Each band spans ±½ stop around `ev`; the ends are open. */
export const EV_SCENES: ExposureScene[] = [
    { key: 'snow', ev: 16, sf: 'snowflake', md: 'ac-unit' },
    { key: 'sun', ev: 15, sf: 'sun.max.fill', md: 'wb-sunny' },
    { key: 'hazySun', ev: 14, sf: 'sun.haze.fill', md: 'brightness-5' },
    { key: 'brightOvercast', ev: 13, sf: 'cloud.sun.fill', md: 'wb-cloudy' },
    { key: 'overcast', ev: 12, sf: 'cloud.fill', md: 'cloud' },
    { key: 'heavyOvercast', ev: 11, sf: 'smoke.fill', md: 'filter-drama' },
    { key: 'sunset', ev: 10, sf: 'sunset.fill', md: 'wb-twilight' },
    { key: 'afterSunset', ev: 9, sf: 'sun.horizon.fill', md: 'brightness-4' },
    { key: 'brightInterior', ev: 8, sf: 'lightbulb.fill', md: 'lightbulb' },
    { key: 'litStreet', ev: 7, sf: 'building.2.fill', md: 'location-city' },
    { key: 'homeInterior', ev: 6, sf: 'house.fill', md: 'home' },
    { key: 'dimInterior', ev: 5, sf: 'lamp.table.fill', md: 'light' },
    { key: 'candlelight', ev: 4, sf: 'flame.fill', md: 'local-fire-department' },
    { key: 'distantLights', ev: 3, sf: 'sparkles', md: 'auto-awesome' },
    { key: 'nightSkyline', ev: 2, sf: 'moon.stars.fill', md: 'nights-stay' },
    { key: 'moonlight', ev: 1, sf: 'moon.fill', md: 'bedtime' },
];

/** The band an EV falls in: the first (brightest) scene whose lower edge it reaches. */
export function sceneForEv(ev: number): ExposureScene {
    const value = toThird(ev);
    for (const scene of EV_SCENES) {
        if (value >= scene.ev - 0.5 - 1e-9) return scene;
    }
    return EV_SCENES[EV_SCENES.length - 1];
}

/** "15", "12⅓", "12⅔", "-1⅓", "-⅔", "0". */
export function formatEv(ev: number): string {
    const thirds = Math.round(ev * 3);
    const sign = thirds < 0 ? '-' : '';
    const whole = Math.floor(Math.abs(thirds) / 3);
    const rest = Math.abs(thirds) % 3;
    const fraction = rest === 1 ? '⅓' : rest === 2 ? '⅔' : '';
    if (whole === 0 && fraction) return `${sign}${fraction}`;
    return `${sign}${whole}${fraction}`;
}

export type PlannerColumn = 'aperture' | 'shutter' | 'iso';

/**
 * When the target EV changes, exactly one column gives way: the shutter,
 * unless it is the locked one, in which case the aperture. ISO is a property
 * of the film and never moves on an EV change.
 */
export function columnToMoveForEv(locked: PlannerColumn | null, filmMode: boolean): 'shutter' | 'aperture' {
    if (filmMode) return 'shutter';
    return locked === 'shutter' ? 'aperture' : 'shutter';
}

// EV = log2(N²/t) − log2(ISO/100)

export function evFor(aperture: number, shutterSeconds: number, iso: number): number {
    return Math.log2((aperture ** 2) / shutterSeconds) - Math.log2(iso / 100);
}

/** Shutter (seconds) for an aperture and ISO at a target EV: t = N² / 2^(EV + log2(ISO/100)). */
export function calculateShutter(aperture: number, iso: number, targetEV: number): number {
    return (aperture ** 2) / Math.pow(2, targetEV + Math.log2(iso / 100));
}

/** Aperture for a shutter and ISO at a target EV: N = sqrt(t · 2^(EV + log2(ISO/100))). */
export function calculateAperture(shutterSeconds: number, iso: number, targetEV: number): number {
    return Math.sqrt(shutterSeconds * Math.pow(2, targetEV + Math.log2(iso / 100)));
}

/** ISO for an aperture and shutter at a target EV: ISO = 100 · 2^(log2(N²/t) − EV). */
export function calculateIso(aperture: number, shutterSeconds: number, targetEV: number): number {
    return 100 * Math.pow(2, Math.log2((aperture ** 2) / shutterSeconds) - targetEV);
}
