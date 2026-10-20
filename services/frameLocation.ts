// Pure helpers for the per-frame location feature. No Expo or React Native
// imports so this runs under Node for tests; permission, GPS and geocoding
// live in hooks/useFrameLocation.ts.

/** A captured position, before it becomes frame columns. */
export type FrameFix = {
    latitude: number;
    longitude: number;
    /** Horizontal accuracy in metres; null when unknown. */
    accuracy: number | null;
    /** Reverse-geocoded label; null when none could be found. */
    place: string | null;
};

/** The four location columns of a frame row. */
export type LocationFields = {
    latitude: number | null;
    longitude: number | null;
    location_accuracy: number | null;
    place: string | null;
};

/** Key-value store key remembering the last Save Location choice ('1' / '0'). */
export const LOCATION_CHOICE_KEY = 'frame_location_enabled';

/** "Finding location…" turns into "Waiting for GPS" after this long without a fix. */
export const FINDING_TIMEOUT_MS = 10000;

/** A frame saved while still waiting keeps listening for a fix this long. */
export const LATE_FILL_TIMEOUT_MS = 60000;

/** A cached position older than this is not shown while the real fix comes in. */
export const LAST_KNOWN_MAX_AGE_MS = 120000;

const roundTo = (value: number, decimals: number): number => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

/** Six decimals: about 0.1 m, more than any phone GPS resolves. */
export const roundCoordinate = (value: number): number => roundTo(value, 6);

export const roundAccuracy = (value: number | null | undefined): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? roundTo(value, 1) : null;

export const hasLocation = (
    frame: { latitude?: number | null; longitude?: number | null } | null | undefined
): boolean => typeof frame?.latitude === 'number' && typeof frame?.longitude === 'number';

/** Display form, four decimals: "40.1872, 44.5152". */
export const formatCoordinates = (latitude: number, longitude: number): string =>
    `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

type GeocodeLike = {
    street?: string | null;
    name?: string | null;
    city?: string | null;
    region?: string | null;
    subregion?: string | null;
};

/**
 * A short label from a reverse-geocode result: street or placemark name,
 * joined with the city when there is one; the city or region alone otherwise.
 */
export const placeLabel = (geocode: GeocodeLike | null | undefined): string | null => {
    if (!geocode) return null;
    const first = geocode.street || geocode.name || null;
    const second = geocode.city || null;
    const parts = [first, second].filter((p): p is string => !!p);
    if (parts.length > 0) return parts.join(', ');
    return geocode.subregion || geocode.region || null;
};

/**
 * Deep link for the platform's maps app. Android's `geo:` query uses
 * parentheses as delimiters, so they are encoded in the label as well.
 */
export const mapsUrl = (args: {
    latitude: number;
    longitude: number;
    label: string;
    platform: 'ios' | 'android' | 'web';
}): string => {
    const ll = `${args.latitude},${args.longitude}`;
    const label = encodeURIComponent(args.label).replace(/\(/g, '%28').replace(/\)/g, '%29');
    switch (args.platform) {
        case 'ios':
            return `maps://?ll=${ll}&q=${label}`;
        case 'android':
            return `geo:${ll}?q=${ll}(${label})`;
        default:
            return `https://www.google.com/maps/search/?api=1&query=${ll}`;
    }
};

export const fixToFields = (fix: FrameFix | null): LocationFields =>
    fix
        ? { latitude: fix.latitude, longitude: fix.longitude, location_accuracy: fix.accuracy, place: fix.place }
        : { latitude: null, longitude: null, location_accuracy: null, place: null };

/**
 * The row's subtitle in its fixed state: the place (or the coordinates when
 * there is none), followed by the accuracy when it is known.
 */
export const fixedSubtitle = (fix: FrameFix, strings: { accuracy: (meters: number) => string }): string => {
    const parts = [fix.place ?? formatCoordinates(fix.latitude, fix.longitude)];
    if (fix.accuracy !== null) parts.push(strings.accuracy(Math.round(fix.accuracy)));
    return parts.join(' · ');
};
