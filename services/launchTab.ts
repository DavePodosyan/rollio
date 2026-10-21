// Which tab the app opens on. Pure so it runs under Node for tests; the
// key-value store read and the Settings row live in hooks/useLaunchTab.ts.

/** Key-value store key holding the tab the app opens on. */
export const LAUNCH_TAB_KEY = 'launch_tab';

/** In the order the Settings rows list them. */
export const LAUNCH_TABS = ['films', 'light_meter'] as const;

export type LaunchTab = (typeof LAUNCH_TABS)[number];

export const DEFAULT_LAUNCH_TAB: LaunchTab = 'films';

/** A stored value, or null when nothing is stored, to a tab; anything unknown is the default. */
export const parseLaunchTab = (stored: string | null): LaunchTab => (
    (LAUNCH_TABS as readonly string[]).includes(stored ?? '') ? (stored as LaunchTab) : DEFAULT_LAUNCH_TAB
);

/** Route of the tab inside the tab group, for the entry redirect. */
export const launchTabHref = (tab: LaunchTab) => `/(tabs)/${tab}` as const;
