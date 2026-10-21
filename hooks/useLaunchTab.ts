import { useCallback, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_LAUNCH_TAB, LAUNCH_TAB_KEY, LaunchTab, parseLaunchTab } from '@/services/launchTab';

/**
 * The stored launch tab, read synchronously so the entry redirect can use it
 * before the first frame. A store that cannot be read falls back to Films.
 */
export const readLaunchTab = (): LaunchTab => {
    try {
        return parseLaunchTab(Storage.getItemSync(LAUNCH_TAB_KEY));
    } catch (err) {
        console.warn('Could not read the launch tab:', err);
        return DEFAULT_LAUNCH_TAB;
    }
};

/** The launch tab for the Settings rows: current value and a setter that persists. */
export const useLaunchTab = () => {
    const [launchTab, setLaunchTabState] = useState<LaunchTab>(readLaunchTab);

    const setLaunchTab = useCallback((tab: LaunchTab) => {
        setLaunchTabState(tab);
        Storage.setItem(LAUNCH_TAB_KEY, tab).catch((err) => console.warn('Could not save the launch tab:', err));
    }, []);

    return { launchTab, setLaunchTab };
};
