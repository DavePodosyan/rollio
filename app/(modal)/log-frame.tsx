import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { getInCameraRolls, logFrameHref, resolveLogRoll } from '@/services/widgetRoll';

/**
 * Where the widgets' Log Frame link lands (rollio:///log-frame). It looks up
 * the rolls in the camera right now and hands over to the new-frame form for
 * the right one, or to the new-film form when no roll is loaded. The link
 * carries at most the roll a widget is set to (?filmId=), never a frame
 * number, so a widget that has not redrawn yet still logs to the right frame;
 * and if that roll has left the camera, the latest roll takes its place.
 */
export default function LogFrameFromWidget() {
    const db = useSQLiteContext();
    const { filmId } = useLocalSearchParams<{ filmId?: string }>();

    useEffect(() => {
        let current = true;
        getInCameraRolls(db)
            .then((rolls) => { if (current) router.replace(logFrameHref(resolveLogRoll(rolls, filmId))); })
            .catch((err) => {
                console.warn('Could not find the current roll:', err);
                if (current) router.replace('/(tabs)/films');
            });
        return () => { current = false; };
    }, [db, filmId]);

    return <View style={{ flex: 1 }} />;
}
