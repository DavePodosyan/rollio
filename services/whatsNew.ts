// What's New content and the rule for when the sheet shows. Pure so it runs
// under Node for tests; persistence and navigation live in hooks/useWhatsNew.ts.

export type WhatsNewItem = {
    /** SF Symbol name (iOS). */
    sf: string;
    /** Material icon name (Android). */
    md: string;
    titleKey: string;
    bodyKey: string;
};

export type WhatsNewRelease = {
    version: string;
    items: WhatsNewItem[];
};

/** Key-value store key holding the marketing version the user last saw the sheet for. */
export const WHATS_NEW_KEY = 'whats_new_last_seen_version';

/**
 * Stand-in "last seen" for users who already had data before the sheet
 * existed (no stored version, but rolls in the database): they see every
 * release in the list.
 */
export const FIRST_TRACKED_VERSION = '0.0.0';

/** Newest release first. Add an entry per release worth announcing. */
export const WHATS_NEW: WhatsNewRelease[] = [
    {
        version: '2.3.0',
        items: [
            { sf: 'mappin.and.ellipse', md: 'location-on', titleKey: 'whatsNew.releases.2_3_0.location.title', bodyKey: 'whatsNew.releases.2_3_0.location.body' },
            { sf: 'sun.max', md: 'light-mode', titleKey: 'whatsNew.releases.2_3_0.launchTab.title', bodyKey: 'whatsNew.releases.2_3_0.launchTab.body' },
        ],
    },
    {
        version: '2.2.0',
        items: [
            { sf: 'icloud.and.arrow.up', md: 'cloud-upload', titleKey: 'whatsNew.releases.2_2_0.backup.title', bodyKey: 'whatsNew.releases.2_2_0.backup.body' },
            { sf: 'doc.richtext', md: 'description', titleKey: 'whatsNew.releases.2_2_0.export.title', bodyKey: 'whatsNew.releases.2_2_0.export.body' },
            { sf: 'gearshape', md: 'settings', titleKey: 'whatsNew.releases.2_2_0.settings.title', bodyKey: 'whatsNew.releases.2_2_0.settings.body' },
        ],
    },
];

/** Numeric dotted-version comparison; missing parts count as 0. */
export const compareVersions = (a: string, b: string): number => {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
    const length = Math.max(pa.length, pb.length);
    for (let i = 0; i < length; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

/**
 * Items the user has not seen: every release newer than `lastSeen` and not
 * newer than the running app, newest first. Empty on a fresh install
 * (`lastSeen` null), since there is nothing to compare against.
 */
export const itemsSince = (
    lastSeen: string | null,
    current: string,
    releases: WhatsNewRelease[] = WHATS_NEW
): WhatsNewItem[] => {
    if (lastSeen === null) return [];
    return [...releases]
        .filter((r) => compareVersions(r.version, lastSeen) > 0 && compareVersions(r.version, current) <= 0)
        .sort((a, b) => compareVersions(b.version, a.version))
        .flatMap((r) => r.items);
};
