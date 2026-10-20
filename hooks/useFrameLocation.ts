import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';
import { useSQLiteContext } from 'expo-sqlite';
import { useTranslation } from 'react-i18next';

import { updateFrame } from '@/services/database';
import { cancelLateFill, scheduleLateFill } from '@/services/lateFill';
import {
    FINDING_TIMEOUT_MS,
    LAST_KNOWN_MAX_AGE_MS,
    LOCATION_CHOICE_KEY,
    fixToFields,
    hasLocation,
    mapsUrl,
    placeLabel,
    roundAccuracy,
    roundCoordinate,
    type FrameFix,
    type LocationFields,
} from '@/services/frameLocation';
import type { Frame } from '@/types';

export type LocationStatus = 'off' | 'finding' | 'waiting' | 'fixed';

/** One position request. `cancelled` only stops it from touching React state. */
type Capture = {
    promise: Promise<FrameFix | null>;
    cancelled: boolean;
    /** Set by fillWhenReady so unmount does not cancel it. */
    claimed: boolean;
};

const toFix = (position: Location.LocationObject): FrameFix => ({
    latitude: roundCoordinate(position.coords.latitude),
    longitude: roundCoordinate(position.coords.longitude),
    accuracy: roundAccuracy(position.coords.accuracy),
    place: null,
});

/** Best effort: no network or no result simply means no place name. */
const lookUpPlace = async (fix: FrameFix): Promise<string | null> => {
    try {
        const [first] = await Location.reverseGeocodeAsync({ latitude: fix.latitude, longitude: fix.longitude });
        return placeLabel(first);
    } catch {
        return null;
    }
};

const rememberChoice = (enabled: boolean) => {
    Storage.setItem(LOCATION_CHOICE_KEY, enabled ? '1' : '0').catch((err) => console.warn('Could not remember the location choice:', err));
};

/**
 * Owns the Save Location row's state for the frame form: the remembered
 * choice, permission, the GPS fix, its place name, and the late fill for a
 * frame saved before the fix arrived.
 */
export const useFrameLocation = ({ mode, frame }: { mode: 'new' | 'edit'; frame: Frame | null }) => {
    const db = useSQLiteContext();
    const { t } = useTranslation();

    const [ready, setReady] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [fix, setFix] = useState<FrameFix | null>(null);
    const [waiting, setWaiting] = useState(false);

    const enabledRef = useRef(false);
    const fixRef = useRef<FrameFix | null>(null);
    const captureRef = useRef<Capture | null>(null);
    const findingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        enabledRef.current = enabled;
        fixRef.current = fix;
    }, [enabled, fix]);

    const stopCapture = useCallback(() => {
        if (captureRef.current && !captureRef.current.claimed) {
            captureRef.current.cancelled = true;
        }
        captureRef.current = null;
        if (findingTimerRef.current) {
            clearTimeout(findingTimerRef.current);
            findingTimerRef.current = null;
        }
    }, []);

    const startCapture = useCallback(() => {
        stopCapture();
        setFix(null);
        setWaiting(false);

        const capture: Capture = { promise: Promise.resolve(null), cancelled: false, claimed: false };
        captureRef.current = capture;

        // Applied for the cached position first, then again for the real fix.
        let generation = 0;
        const apply = (next: FrameFix) => {
            if (capture.cancelled) return;
            const mine = ++generation;
            setFix(next);
            setWaiting(false);
            if (findingTimerRef.current) {
                clearTimeout(findingTimerRef.current);
                findingTimerRef.current = null;
            }
            lookUpPlace(next).then((place) => {
                if (capture.cancelled || mine !== generation || !place) return;
                setFix((current) => (current ? { ...current, place } : current));
            });
        };

        findingTimerRef.current = setTimeout(() => {
            if (!capture.cancelled) setWaiting(true);
        }, FINDING_TIMEOUT_MS);

        Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })
            .then((position) => {
                if (position && generation === 0) apply(toFix(position));
            })
            .catch(() => undefined);

        capture.promise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then((position) => toFix(position))
            .catch((err) => {
                console.warn('Could not get the current position:', err);
                return null;
            });
        capture.promise.then((result) => {
            if (result) apply(result);
        });
    }, [stopCapture]);

    // Edit mode: seed from the stored frame once it has loaded (state adjusted
    // during render, keyed on the frame id, as React recommends for props).
    const [seededFrameId, setSeededFrameId] = useState<number | null>(null);
    if (mode === 'edit' && frame && frame.id !== seededFrameId) {
        setSeededFrameId(frame.id);
        if (hasLocation(frame)) {
            setEnabled(true);
            setFix({
                latitude: frame.latitude as number,
                longitude: frame.longitude as number,
                accuracy: frame.location_accuracy,
                place: frame.place,
            });
        }
        setReady(true);
    }

    // New mode: the remembered choice. A remembered "on" only takes effect
    // while permission is still granted; it never prompts on its own.
    useEffect(() => {
        if (mode !== 'new') return;
        let cancelled = false;
        (async () => {
            try {
                const remembered = (await Storage.getItem(LOCATION_CHOICE_KEY)) === '1';
                if (cancelled) return;
                if (remembered) {
                    const permission = await Location.getForegroundPermissionsAsync();
                    if (cancelled) return;
                    if (permission.granted) {
                        setEnabled(true);
                        startCapture();
                    }
                }
            } catch (err) {
                console.warn('Could not read the location choice:', err);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mode, startCapture]);

    useEffect(() => stopCapture, [stopCapture]);

    const showPermissionAlert = useCallback((canAskAgain: boolean) => {
        Alert.alert(
            t('newFrame.location.permission.title'),
            t('newFrame.location.permission.message'),
            [
                ...(canAskAgain ? [] : [{ text: t('shared.settings'), onPress: () => Linking.openSettings() }]),
                { text: t('shared.ok'), style: 'cancel' as const },
            ],
            { cancelable: true }
        );
    }, [t]);

    const toggle = useCallback(async (next: boolean) => {
        if (!next) {
            stopCapture();
            setFix(null);
            setWaiting(false);
            setEnabled(false);
            rememberChoice(false);
            return;
        }
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (!permission.granted) {
                showPermissionAlert(permission.canAskAgain);
                return;
            }
        } catch (err) {
            console.warn('Could not request location permission:', err);
            return;
        }
        setEnabled(true);
        rememberChoice(true);
        startCapture();
    }, [showPermissionAlert, startCapture, stopCapture]);

    const fields = useCallback((): LocationFields => fixToFields(enabledRef.current ? fixRef.current : null), []);

    /**
     * Called right after a frame is saved with `saved` (what `fields()`
     * returned at save time). Any older pending fill for that frame is
     * dropped: a re-save, with or without a location, supersedes it. If the
     * frame was saved without coordinates while the row is on, the pending
     * request is kept alive for a while and its fix written onto the row
     * when it arrives. Runs past the form's unmount; the database connection
     * is app-wide.
     */
    const fillWhenReady = useCallback((frameId: number, saved: LocationFields) => {
        cancelLateFill(frameId);
        const capture = captureRef.current;
        if (!enabledRef.current || hasLocation(saved) || !capture) return;
        capture.claimed = true;
        scheduleLateFill(frameId, capture.promise, async (late) => {
            const place = await lookUpPlace(late);
            await updateFrame(db, frameId, fixToFields({ ...late, place }));
        });
    }, [db]);

    /** Deleting a frame drops any fill still waiting for it. */
    const cancelFill = useCallback((frameId: number) => cancelLateFill(frameId), []);

    const openInMaps = useCallback(async (label: string) => {
        const current = fixRef.current;
        if (!current) return;
        const base = { latitude: current.latitude, longitude: current.longitude, label };
        try {
            await Linking.openURL(mapsUrl({ ...base, platform: Platform.OS === 'android' ? 'android' : 'ios' }));
        } catch {
            try {
                await Linking.openURL(mapsUrl({ ...base, platform: 'web' }));
            } catch {
                Alert.alert(t('shared.error'), t('newFrame.location.openMapsError'));
            }
        }
    }, [t]);

    const status: LocationStatus = !enabled ? 'off' : fix ? 'fixed' : waiting ? 'waiting' : 'finding';

    return { ready, enabled, status, fix, toggle, fields, fillWhenReady, cancelFill, openInMaps };
};
