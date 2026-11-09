import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { syncWidgets } from '@/services/widgetSync';

/**
 * Keeps the home screen and Lock Screen widgets showing the current roll:
 * once when the app opens, and each time it leaves the foreground, which is
 * the moment the widgets can come back into view.
 */
export default function WidgetSync() {
    const db = useSQLiteContext();

    useEffect(() => {
        syncWidgets(db);
        const subscription = AppState.addEventListener('change', (state) => {
            if (state !== 'active') syncWidgets(db);
        });
        return () => subscription.remove();
    }, [db]);

    return null;
}
