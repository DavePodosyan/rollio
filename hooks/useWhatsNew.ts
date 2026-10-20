import { useEffect } from 'react';
import * as Application from 'expo-application';
import Storage from 'expo-sqlite/kv-store';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { FIRST_TRACKED_VERSION, WHATS_NEW_KEY, itemsSince } from '@/services/whatsNew';

// Let the first screen settle before a sheet slides over it.
const PRESENT_DELAY_MS = 700;

/**
 * Opens the What's New sheet once after an update. A fresh install (no stored
 * version and no rolls) records the current version silently; a library that
 * predates the stored version counts as an update. The sheet marks itself
 * seen when it opens.
 */
export const useWhatsNew = () => {
    const db = useSQLiteContext();
    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        (async () => {
            const current = Application.nativeApplicationVersion;
            if (!current) return;
            let lastSeen = await Storage.getItem(WHATS_NEW_KEY);
            if (cancelled) return;
            if (lastSeen === null) {
                const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM films');
                if (cancelled) return;
                if ((row?.n ?? 0) === 0) {
                    await Storage.setItem(WHATS_NEW_KEY, current);
                    return;
                }
                lastSeen = FIRST_TRACKED_VERSION;
            }
            if (itemsSince(lastSeen, current).length === 0) return;
            timer = setTimeout(() => {
                if (!cancelled) router.push({ pathname: '/(modal)/whats-new', params: { since: lastSeen } });
            }, PRESENT_DELAY_MS);
        })().catch((err) => console.warn("Could not check What's New:", err));
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [db]);
};
