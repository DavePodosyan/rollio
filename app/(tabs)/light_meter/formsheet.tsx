import { APERTURE_OPTIONS, ISO_OPTIONS, SHUTTER_SPEED_OPTIONS } from "@/utils/cameraSettings";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Stack, useLocalSearchParams, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo, type ReactNode } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    PlatformColor,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
    ScrollView
} from "react-native";
import * as Haptics from 'expo-haptics';
import { Film } from "@/types";
import { useFilms } from "@/hooks/useFilms";
import { useIsFocused } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
// ────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const VERTICAL_PADDING = ITEM_HEIGHT; // Padding to allow first/last items to center
const BOTTOM_SHEET_COMPACT_DETENT = 0.52;
const NATIVE_COMPACT_DETENT = 0.45;
const BOTTOM_SHEET_FILM_LIST_DETENT = 0.55;
const BOTTOM_SHEET_SELECTED_FILM_DETENT = 0.8;
const NATIVE_FILM_LIST_DETENT = 0.85;

const platformColor = (iosName: string, androidName: string) => (
    PlatformColor(Platform.OS === 'ios' ? iosName : androidName)
);

const sheetColors = {
    label: platformColor('label', '@android:color/primary_text_light'),
    secondaryLabel: platformColor('secondaryLabel', '@android:color/secondary_text_light'),
    tertiarySystemFill: platformColor('tertiarySystemFill', '@android:color/darker_gray'),
    separator: platformColor('separator', '@android:color/darker_gray'),
    systemOrange: platformColor('systemOrange', '@android:color/holo_orange_light'),
};

const getSheetColors = (colorScheme: ReturnType<typeof useColorScheme>) => {
    const isDark = colorScheme === 'dark';

    if (Platform.OS === 'android') {
        return {
            label: isDark ? '#f7f7fb' : '#100528',
            secondaryLabel: isDark ? '#a9a9b3' : '#6f6f78',
            tertiarySystemFill: isDark ? 'rgba(28, 28, 30, 0.66)' : 'rgba(236, 236, 242, 0.72)',
            separator: isDark ? '#3a3a3c' : '#d7d7df',
            systemOrange: '#ffb340',
        };
    }

    return sheetColors;
};

const materialIconNames = {
    'xmark': 'close',
    'gear': 'settings',
    'lock.fill': 'lock',
    'lock.open.fill': 'lock-open',
    'xmark.circle.fill': 'cancel',
    'sun.max.fill': 'wb-sunny',
    'moon.fill': 'nightlight',
} as const;

type SheetIconName = keyof typeof materialIconNames;

function SheetIcon({
    name,
    style,
    tintColor,
}: {
    name: SheetIconName;
    style: { width: number; height: number; marginRight?: number };
    tintColor: string | ReturnType<typeof PlatformColor>;
}) {
    if (Platform.OS === 'android') {
        return (
            <MaterialIcons
                name={materialIconNames[name]}
                size={Math.max(style.width, style.height)}
                color={tintColor}
                style={style.marginRight ? { marginRight: style.marginRight } : undefined}
            />
        );
    }

    return <SymbolView name={name} style={style} tintColor={tintColor} />;
}

// Full stop shutter speeds (standard photographic stops)
// Uses the same format as SHUTTER_SPEED_OPTIONS (0.5 = 1/2 second)
const FULL_STOP_SHUTTER_SPEEDS = [
    "30", "15", "8", "4", "2", "1", "0.5", "1/4", "1/8", "1/15",
    "1/30", "1/60", "1/125", "1/250", "1/500", "1/1000", "1/2000", "1/4000", "1/8000"
];

// ────────────────────────────────────────────────
// Normalization helpers
// ────────────────────────────────────────────────

// Convert shutter speed string to seconds for comparison
const shutterToSeconds = (shutter: string): number => {
    if (shutter === "Auto") return Infinity;
    if (shutter.includes("/")) {
        const [num, denom] = shutter.split("/").map(Number);
        return num / denom;
    }
    return Number(shutter);
};

// Find closest aperture option (returns the string option)
// Favors wider aperture (lower f-number = more light) when between two close options
const findClosestAperture = (targetValue: number): string => {
    const options = APERTURE_OPTIONS.filter(a => a !== "Auto");
    let closest = options[0];
    let minDiff = Math.abs(Number(closest) - targetValue);

    for (const opt of options) {
        const optValue = Number(opt);
        const diff = Math.abs(optValue - targetValue);
        // If differences are within 15% of each other, prefer wider aperture (lower f-number)
        const threshold = minDiff * 0.15;
        if (diff < minDiff - threshold) {
            minDiff = diff;
            closest = opt;
        } else if (diff <= minDiff + threshold && optValue < Number(closest)) {
            // Nearly equal distance - prefer the wider aperture (overexposure)
            minDiff = diff;
            closest = opt;
        }
    }
    return closest;
};

// Find closest shutter speed option (input is in seconds, returns the string option)
// Favors slower shutter (more exposure time) when between two close options
// Accepts optional options array to support full stops only mode
const findClosestShutter = (targetSeconds: number, options?: string[]): string => {
    const shutterOptions = options ?? SHUTTER_SPEED_OPTIONS.filter(s => s !== "Auto");
    let closest = shutterOptions[0];
    let closestSeconds = shutterToSeconds(closest);
    let minDiff = Math.abs(closestSeconds - targetSeconds);

    for (const opt of shutterOptions) {
        const optSeconds = shutterToSeconds(opt);
        const diff = Math.abs(optSeconds - targetSeconds);
        // If differences are within 15% of each other, prefer slower shutter (more exposure)
        const threshold = minDiff * 0.15;
        if (diff < minDiff - threshold) {
            minDiff = diff;
            closest = opt;
            closestSeconds = optSeconds;
        } else if (diff <= minDiff + threshold && optSeconds > closestSeconds) {
            // Nearly equal distance - prefer the slower shutter (overexposure)
            minDiff = diff;
            closest = opt;
            closestSeconds = optSeconds;
        }
    }
    return closest;
};

// Find closest ISO option
const findClosestIso = (targetValue: number): number => {
    let closest = ISO_OPTIONS[0];
    let minDiff = Math.abs(closest - targetValue);

    for (const opt of ISO_OPTIONS) {
        const diff = Math.abs(opt - targetValue);
        if (diff < minDiff) {
            minDiff = diff;
            closest = opt;
        }
    }
    return closest;
};

// Normalize from raw param values
const normalizeAperture = (rawValue: string | undefined): string => {
    if (!rawValue) return "2.8";
    const numValue = Number(rawValue);
    if (isNaN(numValue)) return "2.8";
    return findClosestAperture(numValue);
};

const normalizeShutter = (rawValue: string | undefined, useFullStops: boolean = true): string => {
    if (!rawValue) return "1/125";
    const numValue = Number(rawValue);
    if (isNaN(numValue)) return "1/125";
    // Use full stops by default since that's the initial setting
    return findClosestShutter(numValue, useFullStops ? FULL_STOP_SHUTTER_SPEEDS : undefined);
};

const normalizeIso = (rawValue: string | undefined): number => {
    if (!rawValue) return 100;
    const numValue = Number(rawValue);
    if (isNaN(numValue)) return 100;
    return findClosestIso(numValue);
};

// ────────────────────────────────────────────────
// Exposure calculation helpers
// ────────────────────────────────────────────────

// Calculate shutter speed (in seconds) for given aperture, ISO, and target EV
const calculateShutter = (aperture: number, iso: number, targetEV: number): number => {
    // EV = log2(N²/t) - log2(ISO/100)
    // Solving for t: t = N² / (2^(EV + log2(ISO/100)))
    return (aperture ** 2) / Math.pow(2, targetEV + Math.log2(iso / 100));
};

// Calculate aperture for given shutter, ISO, and target EV
const calculateAperture = (shutterSeconds: number, iso: number, targetEV: number): number => {
    // EV = log2(N²/t) - log2(ISO/100)
    // Solving for N: N = sqrt(t * 2^(EV + log2(ISO/100)))
    return Math.sqrt(shutterSeconds * Math.pow(2, targetEV + Math.log2(iso / 100)));
};

// Picker identifiers
type ActivePicker = 'aperture' | 'shutter' | 'iso' | null;

// ────────────────────────────────────────────────

export type LightMeterReadingParams = {
    title?: string;
    ev?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
    image?: string;
};

type LightMeterReadingSheetProps = LightMeterReadingParams & {
    presentation?: 'native-sheet' | 'bottom-sheet';
    headerHeight?: number;
    onClose?: () => void;
    onSheetDetentChange?: (detent: number) => void;
};

const normalizeParam = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value;
};

export function LightMeterReadingSheet({
    title,
    ev,
    aperture: initialAperture,
    shutterSpeed: initialShutter,
    iso: initialIsoStr,
    image,
    presentation = 'native-sheet',
    headerHeight = 0,
    onClose,
    onSheetDetentChange,
}: LightMeterReadingSheetProps) {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const dynamicSheetColors = useMemo(() => getSheetColors(colorScheme), [colorScheme]);
    // Mirrors the previous `title = "Light Meter Reading"` default param, moved
    // here since a default param can't call the useTranslation() hook above it.
    const resolvedTitle = title || t('lightMeterSheet.defaultTitle');
    const isGlassAvailable = isLiquidGlassAvailable();
    const isBottomSheetPresentation = presentation === 'bottom-sheet';
    const compactSheetDetent = isBottomSheetPresentation ? BOTTOM_SHEET_COMPACT_DETENT : NATIVE_COMPACT_DETENT;
    const closeSheet = onClose ?? (() => router.back());
    const setSheetDetent = useCallback((detent: number) => {
        if (presentation === 'native-sheet') {
            navigation.setOptions({
                sheetAllowedDetents: [detent]
            });
            return;
        }

        onSheetDetentChange?.(detent);
    }, [navigation, onSheetDetentChange, presentation]);

    //log the params for debugging
    // useEffect(() => {
    //     console.log("FormSheet params:", { title, ev, initialAperture, initialShutter, initialIsoStr, image });
    // }, [title, ev, initialAperture, initialShutter, initialIsoStr, image]);

    // Normalize incoming raw values to closest available options
    const initialApertureStr = normalizeAperture(initialAperture);
    const initialShutterStr = normalizeShutter(initialShutter);
    const initialIsoNum = normalizeIso(initialIsoStr);

    const [selectedAperture, setSelectedAperture] = useState(initialApertureStr);
    const [selectedShutter, setSelectedShutter] = useState(initialShutterStr);
    const [selectedIso, setSelectedIso] = useState(initialIsoNum);

    console.log(selectedAperture, selectedShutter, selectedIso);


    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [showFullStopsOnly, setShowFullStopsOnly] = useState(true);

    const { films } = useFilms();
    const isFocused = useIsFocused();

    // Selected film for saving frame (null = none selected, showing film list)
    const [selectedFilm, setSelectedFilm] = useState<Film | null>(null);

    // Track if we navigated away (to reset state on return)
    const hasNavigatedAway = useRef(false);

    // Reset state when returning from new-frame modal
    useEffect(() => {
        if (isFocused && hasNavigatedAway.current) {
            // Clear selection and collapse sheet when returning
            setSelectedFilm(null);
            setLockedPicker(null);
            setIsSheetExpanded(false);
            setSheetDetent(compactSheetDetent);
            hasNavigatedAway.current = false;
        }
    }, [compactSheetDetent, isFocused, setSheetDetent]);

    // Which picker is locked (only one can be locked at a time)
    type LockedPicker = 'aperture' | 'shutter' | 'iso' | null;
    const [lockedPicker, setLockedPicker] = useState<LockedPicker>(null);

    // When a film is selected, ISO is force-locked and other locks are disabled
    const isFilmMode = selectedFilm !== null;

    // Target EV to maintain when adjusting values
    const targetEV = Number(ev) || 0;

    // Calculate current EV from selected settings and compare to target
    // EV = log2(N²/t) - log2(ISO/100)
    // Positive exposureDiff = overexposed, Negative = underexposed
    const exposureDiff = useMemo(() => {
        const aperture = Number(selectedAperture);
        const shutterSec = shutterToSeconds(selectedShutter);
        const iso = selectedIso;

        // Calculate the EV that the current settings would produce
        const currentEV = Math.log2((aperture ** 2) / shutterSec) - Math.log2(iso / 100);

        // Difference: negative means underexposed, positive means overexposed
        // (if current EV is higher than target, we're letting in less light = underexposed)
        // EV is inverse to exposure: higher EV = less light
        return targetEV - currentEV;
    }, [selectedAperture, selectedShutter, selectedIso, targetEV]);

    // Track which picker is currently being scrolled by the user
    const activePickerRef = useRef<ActivePicker>(null);

    // For haptics: track last "ticked" item index during scroll
    const lastTickedApertureIdx = useRef(-1);
    const lastTickedShutterIdx = useRef(-1);
    const lastTickedIsoIdx = useRef(-1);

    // Flag to ignore scroll events during programmatic scrolling (starts true for initial render)
    const isProgrammaticScroll = useRef(true);

    // FlatList refs for programmatic scrolling
    const apertureRef = useRef<FlatList>(null);
    const shutterRef = useRef<FlatList>(null);
    const isoRef = useRef<FlatList>(null);

    // Refs to track current values (avoids stale closure issues)
    const currentAperture = useRef(initialApertureStr);
    const currentShutter = useRef(initialShutterStr);
    const currentIso = useRef(initialIsoNum);

    // Clear programmatic scroll flag after initial mount
    useEffect(() => {
        const timer = setTimeout(() => {
            isProgrammaticScroll.current = false;
            // Initialize tick refs to current positions
            lastTickedApertureIdx.current = APERTURE_OPTIONS.filter(a => a !== "Auto").indexOf(initialApertureStr);
            // Use full stops since that's the default
            lastTickedShutterIdx.current = FULL_STOP_SHUTTER_SPEEDS.indexOf(initialShutterStr);
            lastTickedIsoIdx.current = ISO_OPTIONS.indexOf(initialIsoNum);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Scroll to center items on mount (initialScrollIndex doesn't support viewPosition)
    useLayoutEffect(() => {
        const timer = setTimeout(() => {
            const apertureIdx = APERTURE_OPTIONS.filter(a => a !== "Auto").indexOf(initialApertureStr);
            // Use the initial shutter options (full stops since that's the default)
            const initialShutterOptions = FULL_STOP_SHUTTER_SPEEDS;
            const shutterIdx = initialShutterOptions.indexOf(initialShutterStr);
            const isoIdx = ISO_OPTIONS.indexOf(initialIsoNum);

            if (apertureIdx >= 0 && apertureRef.current) {
                apertureRef.current.scrollToIndex({ index: apertureIdx, animated: false, viewPosition: 0.5 });
            }
            if (shutterIdx >= 0 && shutterRef.current) {
                shutterRef.current.scrollToIndex({ index: shutterIdx, animated: false, viewPosition: 0.5 });
            }
            if (isoIdx >= 0 && isoRef.current) {
                isoRef.current.scrollToIndex({ index: isoIdx, animated: false, viewPosition: 0.5 });
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [initialApertureStr, initialShutterStr, initialIsoNum]);

    // Keep refs in sync with state
    useEffect(() => { currentAperture.current = selectedAperture; }, [selectedAperture]);
    useEffect(() => { currentShutter.current = selectedShutter; }, [selectedShutter]);
    useEffect(() => { currentIso.current = selectedIso; }, [selectedIso]);

    useEffect(() => {
        if (presentation === 'native-sheet') {
            navigation.setOptions({
                title: title || t('lightMeterSheet.fallbackTitle'),
            });
        }
    }, [navigation, presentation, title, t]);

    // Scroll to initial values
    // useEffect(() => {
    //     const tryScroll = (
    //         ref: React.RefObject<FlatList>,
    //         options: string[],
    //         target: string,
    //         animated = false
    //     ) => {
    //         const idx = options.indexOf(target);
    //         if (idx >= 0 && ref.current) {
    //             ref.current.scrollToIndex({ index: idx, animated, viewPosition: 0.5 });
    //         }
    //     };

    //     tryScroll(apertureRef, APERTURE_OPTIONS.filter(a => a !== "Auto"), initialApertureStr);
    //     tryScroll(shutterRef, SHUTTER_SPEED_OPTIONS.filter(s => s !== "Auto"), initialShutterStr);

    //     const isoStrArr = ISO_OPTIONS.map(String);
    //     const isoIdx = isoStrArr.indexOf(initialIsoNum.toString());
    //     if (isoIdx >= 0 && isoRef.current) {
    //         isoRef.current.scrollToIndex({ index: isoIdx, animated: false, viewPosition: 0.5 });
    //     }

    //     // Initialize tick refs to prevent haptic on initial scroll
    //     lastTickedApertureIdx.current = APERTURE_OPTIONS.filter(a => a !== "Auto").indexOf(initialApertureStr);
    //     lastTickedShutterIdx.current = SHUTTER_SPEED_OPTIONS.filter(s => s !== "Auto").indexOf(initialShutterStr);
    //     lastTickedIsoIdx.current = isoIdx;
    // }, []);

    // ────────────────────────────────────────────────
    // Linked Exposure Handlers
    // ────────────────────────────────────────────────

    // Get min/max values for each setting
    const apertureOptions = APERTURE_OPTIONS.filter(a => a !== "Auto");

    // Filter shutter options based on full stops setting
    const shutterOptions = useMemo(() => {
        if (showFullStopsOnly) {
            return FULL_STOP_SHUTTER_SPEEDS;
        }
        return SHUTTER_SPEED_OPTIONS.filter(s => s !== "Auto");
    }, [showFullStopsOnly]);

    const minAperture = Number(apertureOptions[0]); // smallest f-number (widest)
    const maxAperture = Number(apertureOptions[apertureOptions.length - 1]); // largest f-number
    const minShutterSeconds = useMemo(() => shutterToSeconds(shutterOptions[shutterOptions.length - 1]), [shutterOptions]); // fastest
    const maxShutterSeconds = useMemo(() => shutterToSeconds(shutterOptions[0]), [shutterOptions]); // slowest
    const minIso = ISO_OPTIONS[0];
    const maxIso = ISO_OPTIONS[ISO_OPTIONS.length - 1];

    // Track previous showFullStopsOnly value to detect changes
    const prevShowFullStopsOnly = useRef(showFullStopsOnly);
    // Track the shutter value before options change (to avoid stale closure issues)
    const shutterBeforeToggle = useRef(selectedShutter);

    // Update shutterBeforeToggle only when NOT in a toggle transition
    useEffect(() => {
        if (prevShowFullStopsOnly.current === showFullStopsOnly) {
            shutterBeforeToggle.current = selectedShutter;
        }
    }, [selectedShutter, showFullStopsOnly]);

    // When full stops toggle changes, snap current shutter to nearest available option
    useEffect(() => {
        if (prevShowFullStopsOnly.current !== showFullStopsOnly) {
            // IMMEDIATELY block scroll handler from updating selection
            isProgrammaticScroll.current = true;

            // Use the value from before the toggle, not the potentially corrupted current state
            const previousShutter = shutterBeforeToggle.current;
            prevShowFullStopsOnly.current = showFullStopsOnly;

            // Check if previous shutter is in the new options list
            if (!shutterOptions.includes(previousShutter)) {
                // Snap to nearest available option
                const previousShutterSec = shutterToSeconds(previousShutter);
                const newShutter = findClosestShutter(previousShutterSec, shutterOptions);
                setSelectedShutter(newShutter);
                shutterBeforeToggle.current = newShutter;

                // Scroll to the new position after a brief delay to allow FlatList to update
                setTimeout(() => {
                    const idx = shutterOptions.indexOf(newShutter);
                    if (idx >= 0 && shutterRef.current) {
                        lastTickedShutterIdx.current = idx;
                        shutterRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
                        setTimeout(() => {
                            isProgrammaticScroll.current = false;
                        }, 350);
                    } else {
                        isProgrammaticScroll.current = false;
                    }
                }, 100);
            } else {
                // Current value is valid, just scroll to it in the new list
                setSelectedShutter(previousShutter); // Ensure state matches
                setTimeout(() => {
                    const idx = shutterOptions.indexOf(previousShutter);
                    if (idx >= 0 && shutterRef.current) {
                        lastTickedShutterIdx.current = idx;
                        shutterRef.current.scrollToIndex({ index: idx, animated: false, viewPosition: 0.5 });
                        setTimeout(() => {
                            isProgrammaticScroll.current = false;
                        }, 100);
                    } else {
                        isProgrammaticScroll.current = false;
                    }
                }, 50);
            }
        }
    }, [showFullStopsOnly, shutterOptions]);

    // Scroll a FlatList to a specific value
    const scrollToValue = useCallback((
        ref: React.RefObject<FlatList | null>,
        options: string[],
        value: string,
        tickRef: React.MutableRefObject<number>
    ) => {
        const idx = options.indexOf(value);
        if (idx >= 0 && ref.current) {
            isProgrammaticScroll.current = true;
            tickRef.current = idx; // Prevent haptic when programmatically scrolling
            ref.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
            // Clear flag after animation completes (approximate timing)
            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 350);
        }
    }, []);

    // Calculate ISO needed for given aperture, shutter, and target EV
    const calculateIso = useCallback((aperture: number, shutterSec: number, ev: number): number => {
        // EV = log2(N²/t) - log2(ISO/100)
        // Solving for ISO: ISO = 100 * 2^(log2(N²/t) - EV)
        return 100 * Math.pow(2, Math.log2((aperture ** 2) / shutterSec) - ev);
    }, []);

    // Toggle lock for a picker (tapping same lock unlocks, tapping different lock switches)
    // When in film mode, locks are disabled (ISO is auto-locked to film ISO)
    const toggleLock = useCallback((picker: 'aperture' | 'shutter' | 'iso') => {
        if (isFilmMode) return; // Locks disabled in film mode
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        setLockedPicker(current => current === picker ? null : picker);
    }, [isFilmMode]);

    // Called when user FINISHES scrolling aperture
    // Priority: adjust shutter (if not locked), then ISO (if not locked)
    const onApertureScrollEnd = useCallback(() => {
        if (activePickerRef.current !== 'aperture') return;

        const aperture = Number(currentAperture.current);
        const shutter = currentShutter.current;
        const iso = currentIso.current;
        const shutterSec = shutterToSeconds(shutter);

        // Determine which values we can adjust
        const canAdjustShutter = lockedPicker !== 'shutter';
        const canAdjustIso = lockedPicker !== 'iso';

        if (canAdjustShutter) {
            // Primary: adjust shutter
            let idealShutterSec = calculateShutter(aperture, iso, targetEV);
            const shutterHitLimit = idealShutterSec < minShutterSeconds || idealShutterSec > maxShutterSeconds;
            const clampedShutterSec = Math.max(minShutterSeconds, Math.min(maxShutterSeconds, idealShutterSec));
            const newShutter = findClosestShutter(clampedShutterSec, shutterOptions);
            const actualShutterSec = shutterToSeconds(newShutter);

            // If shutter was clamped and ISO is not locked, adjust ISO
            let newIso = iso;
            if (shutterHitLimit && canAdjustIso) {
                const neededIso = calculateIso(aperture, actualShutterSec, targetEV);
                newIso = findClosestIso(Math.max(minIso, Math.min(maxIso, neededIso)));
            }

            if (newShutter !== shutter) {
                setSelectedShutter(newShutter);
                scrollToValue(shutterRef, shutterOptions, newShutter, lastTickedShutterIdx);
            }
            if (newIso !== iso) {
                setSelectedIso(newIso);
                scrollToValue(isoRef, ISO_OPTIONS.map(String), String(newIso), lastTickedIsoIdx);
            }
        } else if (canAdjustIso) {
            // Shutter is locked, adjust ISO only
            const neededIso = calculateIso(aperture, shutterSec, targetEV);
            const newIso = findClosestIso(Math.max(minIso, Math.min(maxIso, neededIso)));
            if (newIso !== iso) {
                setSelectedIso(newIso);
                scrollToValue(isoRef, ISO_OPTIONS.map(String), String(newIso), lastTickedIsoIdx);
            }
        }
        // If both are locked, do nothing (can't maintain EV)

        activePickerRef.current = null;
    }, [targetEV, scrollToValue, shutterOptions, minShutterSeconds, maxShutterSeconds, minIso, maxIso, calculateIso, lockedPicker]);

    // Called when user FINISHES scrolling shutter
    // Priority: adjust aperture (if not locked), then ISO (if not locked)
    const onShutterScrollEnd = useCallback(() => {
        if (activePickerRef.current !== 'shutter') return;

        const aperture = currentAperture.current;
        const shutterSec = shutterToSeconds(currentShutter.current);
        const iso = currentIso.current;

        // Determine which values we can adjust
        const canAdjustAperture = lockedPicker !== 'aperture';
        const canAdjustIso = lockedPicker !== 'iso';

        if (canAdjustAperture) {
            // Primary: adjust aperture
            let idealAperture = calculateAperture(shutterSec, iso, targetEV);
            const apertureHitLimit = idealAperture < minAperture || idealAperture > maxAperture;
            const clampedAperture = Math.max(minAperture, Math.min(maxAperture, idealAperture));
            const newAperture = findClosestAperture(clampedAperture);
            const actualAperture = Number(newAperture);

            // If aperture was clamped and ISO is not locked, adjust ISO
            let newIso = iso;
            if (apertureHitLimit && canAdjustIso) {
                const neededIso = calculateIso(actualAperture, shutterSec, targetEV);
                newIso = findClosestIso(Math.max(minIso, Math.min(maxIso, neededIso)));
            }

            if (newAperture !== aperture) {
                setSelectedAperture(newAperture);
                scrollToValue(apertureRef, apertureOptions, newAperture, lastTickedApertureIdx);
            }
            if (newIso !== iso) {
                setSelectedIso(newIso);
                scrollToValue(isoRef, ISO_OPTIONS.map(String), String(newIso), lastTickedIsoIdx);
            }
        } else if (canAdjustIso) {
            // Aperture is locked, adjust ISO only
            const neededIso = calculateIso(Number(aperture), shutterSec, targetEV);
            const newIso = findClosestIso(Math.max(minIso, Math.min(maxIso, neededIso)));
            if (newIso !== iso) {
                setSelectedIso(newIso);
                scrollToValue(isoRef, ISO_OPTIONS.map(String), String(newIso), lastTickedIsoIdx);
            }
        }
        // If both are locked, do nothing

        activePickerRef.current = null;
    }, [targetEV, scrollToValue, apertureOptions, minAperture, maxAperture, minIso, maxIso, calculateIso, lockedPicker]);

    // Called when user FINISHES scrolling ISO
    // Priority: adjust shutter (if not locked), then aperture (if not locked)
    const onIsoScrollEnd = useCallback(() => {
        if (activePickerRef.current !== 'iso') return;

        const aperture = currentAperture.current;
        const shutter = currentShutter.current;
        const iso = currentIso.current;

        // Determine which values we can adjust
        const canAdjustShutter = lockedPicker !== 'shutter';
        const canAdjustAperture = lockedPicker !== 'aperture';

        if (canAdjustShutter) {
            // Primary: adjust shutter
            let idealShutterSec = calculateShutter(Number(aperture), iso, targetEV);
            const shutterHitLimit = idealShutterSec < minShutterSeconds || idealShutterSec > maxShutterSeconds;
            const clampedShutterSec = Math.max(minShutterSeconds, Math.min(maxShutterSeconds, idealShutterSec));
            const newShutter = findClosestShutter(clampedShutterSec, shutterOptions);
            const actualShutterSec = shutterToSeconds(newShutter);

            // If shutter was clamped and aperture is not locked, adjust aperture
            let newAperture = aperture;
            if (shutterHitLimit && canAdjustAperture) {
                const neededAperture = calculateAperture(actualShutterSec, iso, targetEV);
                const clampedAp = Math.max(minAperture, Math.min(maxAperture, neededAperture));
                newAperture = findClosestAperture(clampedAp);
            }

            if (newShutter !== shutter) {
                setSelectedShutter(newShutter);
                scrollToValue(shutterRef, shutterOptions, newShutter, lastTickedShutterIdx);
            }
            if (newAperture !== aperture) {
                setSelectedAperture(newAperture);
                scrollToValue(apertureRef, apertureOptions, newAperture, lastTickedApertureIdx);
            }
        } else if (canAdjustAperture) {
            // Shutter is locked, adjust aperture only
            const shutterSec = shutterToSeconds(shutter);
            const neededAperture = calculateAperture(shutterSec, iso, targetEV);
            const clampedAp = Math.max(minAperture, Math.min(maxAperture, neededAperture));
            const newAperture = findClosestAperture(clampedAp);
            if (newAperture !== aperture) {
                setSelectedAperture(newAperture);
                scrollToValue(apertureRef, apertureOptions, newAperture, lastTickedApertureIdx);
            }
        }
        // If both are locked, do nothing

        activePickerRef.current = null;
    }, [targetEV, scrollToValue, apertureOptions, shutterOptions, minAperture, maxAperture, minShutterSeconds, maxShutterSeconds, lockedPicker]);

    // ────────────────────────────────────────────────
    // Scroll Handlers (haptics + live value update)
    // ────────────────────────────────────────────────

    // Haptic feedback when scrolling past item boundaries
    // Updates selection live during scroll (visual only, no linked calc)
    const createScrollHandler = useCallback(
        <T extends string | number>(
            tickRef: React.MutableRefObject<number>,
            data: string[],
            setter: React.Dispatch<React.SetStateAction<T>>,
            isNumeric = false
        ) =>
            (event: { nativeEvent: { contentOffset: { y: number } } }) => {
                // Ignore scroll events during programmatic scrolling
                if (isProgrammaticScroll.current) return;

                const offsetY = event.nativeEvent.contentOffset.y;
                const currentIdx = Math.round(offsetY / ITEM_HEIGHT);

                const clampedIdx = Math.max(0, Math.min(currentIdx, data.length - 1));

                if (clampedIdx !== tickRef.current && clampedIdx >= 0) {
                    Haptics.selectionAsync().catch(() => { });
                    tickRef.current = clampedIdx;

                    // Update selection live (visual feedback only)
                    const value = data[clampedIdx];
                    if (isNumeric) {
                        setter(Number(value) as T);
                    } else {
                        setter(value as T);
                    }
                }
            },
        []
    );

    const handleApertureScroll = createScrollHandler(lastTickedApertureIdx, APERTURE_OPTIONS.filter(a => a !== "Auto"), setSelectedAperture);
    const handleShutterScroll = useMemo(() => createScrollHandler(lastTickedShutterIdx, shutterOptions, setSelectedShutter), [shutterOptions]);
    const handleIsoScroll = createScrollHandler(lastTickedIsoIdx, ISO_OPTIONS.map(String), setSelectedIso, true);

    const expandSheetForm = () => {

        setIsSheetExpanded(true);

        Haptics.selectionAsync().catch(() => { });

        setSheetDetent(isBottomSheetPresentation ? BOTTOM_SHEET_FILM_LIST_DETENT : NATIVE_FILM_LIST_DETENT);
    }

    const closeFilmSelector = useCallback(() => {
        setIsSheetExpanded(false);
        setSheetDetent(compactSheetDetent);
        Haptics.selectionAsync().catch(() => { });
    }, [compactSheetDetent, setSheetDetent]);

    const handleSettingsPress = useCallback(() => {
        if (Platform.OS !== 'android') {
            setShowFullStopsOnly(prev => !prev);
            return;
        }

        Alert.alert(
            t('shared.settings'),
            showFullStopsOnly ? t('lightMeterSheet.stopsToggle.fullStopsOnlyMessage') : t('lightMeterSheet.stopsToggle.halfThirdStopsMessage'),
            [
                {
                    text: showFullStopsOnly ? t('lightMeterSheet.stopsToggle.showHalfThird') : t('lightMeterSheet.stopsToggle.showFullStopsOnly'),
                    onPress: () => {
                        setShowFullStopsOnly(prev => !prev);
                        Haptics.selectionAsync().catch(() => { });
                    },
                },
                { text: t('shared.cancel'), style: 'cancel' },
            ]
        );
    }, [showFullStopsOnly, t]);

    // Handle selecting a film - locks ISO to film's ISO and recalculates exposure
    const handleSelectFilm = useCallback((film: Film) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });

        // Set the selected film
        setSelectedFilm(film);

        // Find closest ISO option to the film's ISO
        const filmIso = findClosestIso(film.iso);

        // If the current ISO is different from film ISO, recalculate exposure
        if (filmIso !== selectedIso) {
            // Calculate new shutter for the film's ISO
            const aperture = Number(selectedAperture);
            let idealShutterSec = calculateShutter(aperture, filmIso, targetEV);

            const shutterHitLimit = idealShutterSec < minShutterSeconds || idealShutterSec > maxShutterSeconds;
            const clampedShutterSec = Math.max(minShutterSeconds, Math.min(maxShutterSeconds, idealShutterSec));
            const newShutter = findClosestShutter(clampedShutterSec, shutterOptions);
            const actualShutterSec = shutterToSeconds(newShutter);

            // If shutter hit limit, adjust aperture
            let newAperture = selectedAperture;
            if (shutterHitLimit) {
                const neededAperture = calculateAperture(actualShutterSec, filmIso, targetEV);
                const clampedAp = Math.max(minAperture, Math.min(maxAperture, neededAperture));
                newAperture = findClosestAperture(clampedAp);
            }

            // Update the values and scroll the wheels
            setSelectedIso(filmIso);
            scrollToValue(isoRef, ISO_OPTIONS.map(String), String(filmIso), lastTickedIsoIdx);

            if (newShutter !== selectedShutter) {
                setSelectedShutter(newShutter);
                scrollToValue(shutterRef, shutterOptions, newShutter, lastTickedShutterIdx);
            }
            if (newAperture !== selectedAperture) {
                setSelectedAperture(newAperture);
                scrollToValue(apertureRef, apertureOptions, newAperture, lastTickedApertureIdx);
            }
        }

        // Lock ISO (it's now fixed to film ISO)
        setLockedPicker('iso');
        setSheetDetent(isBottomSheetPresentation ? BOTTOM_SHEET_SELECTED_FILM_DETENT : NATIVE_FILM_LIST_DETENT);
    }, [selectedIso, selectedAperture, selectedShutter, targetEV, scrollToValue,
        minShutterSeconds, maxShutterSeconds, minAperture, maxAperture,
        apertureOptions, isBottomSheetPresentation, setSheetDetent, shutterOptions]);

    // Clear selected film and go back to film list
    const handleClearFilmSelection = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        setSelectedFilm(null);
        setLockedPicker(null); // Unlock ISO so user can adjust again
        // Collapse the sheet and reset expanded state
        setIsSheetExpanded(false);
        setSheetDetent(compactSheetDetent);
    }, [compactSheetDetent, setSheetDetent]);

    // Save the frame to the selected film
    const handleSaveFrame = useCallback(() => {
        if (!selectedFilm) return;

        // Mark that we're navigating away so state resets on return
        hasNavigatedAway.current = true;
        setSheetDetent(0.65);
        router.push({
            pathname: '/new-frame',
            params: {
                filmId: String(selectedFilm.id),
                iso: String(selectedFilm.iso),
                frameCount: String(selectedFilm.frame_count),
                aperture: selectedAperture,
                shutterSpeed: selectedShutter,
                image: image,
            }
        });
    }, [selectedFilm, selectedAperture, selectedShutter, image, setSheetDetent]);

    // Mark active picker on scroll start
    const onApertureScrollBegin = useCallback(() => { activePickerRef.current = 'aperture'; }, []);
    const onShutterScrollBegin = useCallback(() => { activePickerRef.current = 'shutter'; }, []);
    const onIsoScrollBegin = useCallback(() => { activePickerRef.current = 'iso'; }, []);

    // Per-column render to avoid cross-highlight bug
    const createRenderItem = useCallback(
        (currentValue: string | number, prefix?: string, suffix?: string) =>
            ({ item }: { item: string }) => {
                const isSelected = item === currentValue.toString();

                return (
                    <View style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}>
                        <Text
                            style={[
                                styles.wheelText,
                                { color: dynamicSheetColors.label },
                                isSelected ? styles.wheelTextSelected : styles.wheelTextDimmed,
                            ]}
                        >
                            {prefix && <Text>{prefix}</Text>}
                            {item}
                            {suffix && <Text>{suffix}</Text>}
                        </Text>
                    </View>
                );
            },
        [dynamicSheetColors.label]
    );

    const apertureRender = createRenderItem(selectedAperture, t('lightMeterSheet.apertureWheelPrefix'));
    const shutterRender = createRenderItem(selectedShutter, "", t('lightMeterSheet.shutterWheelSuffix'));
    const isoRender = createRenderItem(selectedIso);
    const exposureBadgeColor = exposureDiff > 0 ? '#D96C00' : '#0066CC';
    const exposureBadgeBackground = isBottomSheetPresentation
        ? exposureBadgeColor
        : exposureDiff > 0
            ? 'rgba(255, 149, 0, 0.15)'
            : 'rgba(0, 122, 255, 0.15)';
    const exposureBadgeTextColor = isBottomSheetPresentation ? '#FFFFFF' : '#ffffff';
    const wheelSurfaceBackgroundColor = isBottomSheetPresentation
        ? colorScheme === 'dark' ? '#2c2c2e' : '#ececf2'
        : isGlassAvailable ? 'transparent' : dynamicSheetColors.tertiarySystemFill;
    const saveFrameButtonBackground = isBottomSheetPresentation
        ? '#0A84FF'
        : isGlassAvailable ? 'transparent' : dynamicSheetColors.tertiarySystemFill;
    const saveFrameButtonTextColor = isBottomSheetPresentation || isGlassAvailable
        ? '#fff'
        : dynamicSheetColors.label;
    const renderWheelSurface = useCallback((isLocked: boolean, isInteractive: boolean, children: ReactNode) => {
        const style = [
            styles.wheelGlass,
            isLocked && styles.wheelGlassLocked,
            { backgroundColor: wheelSurfaceBackgroundColor },
        ];

        if (isBottomSheetPresentation) {
            return <View style={style}>{children}</View>;
        }

        return (
            <GlassView
                style={style}
                glassEffectStyle="clear"
                isInteractive={isInteractive}
            >
                {children}
            </GlassView>
        );
    }, [isBottomSheetPresentation, wheelSurfaceBackgroundColor]);
    const FilmListScrollView = isBottomSheetPresentation ? GestureScrollView : ScrollView;
    const filmSelectorHeader = (
        <Text style={{
            fontFamily: 'LufgaRegular',
            fontSize: 13,
            color: dynamicSheetColors.secondaryLabel,
            marginBottom: 8,
            marginLeft: 4,
            textAlign: 'center'
        }}>
            {t('lightMeterSheet.selectFilmPrompt')}
        </Text>
    );
    const filmSelectorEmpty = (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{
                fontFamily: 'LufgaRegular',
                fontSize: 16,
                color: dynamicSheetColors.secondaryLabel,
                textAlign: 'center'
            }}>
                {t('lightMeterSheet.noFilmsAvailable')}
            </Text>
        </View>
    );
    const renderFilmSelectorRow = (film: Film, index: number) => (
        <TouchableOpacity key={film.id} onPress={() => handleSelectFilm(film)}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: index === films.length - 1 ? 0 : 1,
                borderBottomColor: dynamicSheetColors.separator
            }}>
                <View>
                    <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: dynamicSheetColors.label }}>{film.title}</Text>
                    <Text style={{ fontFamily: 'LufgaRegular', fontSize: 14, color: dynamicSheetColors.secondaryLabel }}>{t('lightMeterSheet.filmRowIso', { iso: film.iso })}</Text>
                </View>
                <View>
                    <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: dynamicSheetColors.label }}>{film.frame_count}/{film.expected_shots}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            {presentation === 'native-sheet' ? (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button icon="xmark" onPress={closeSheet} />
                    </Stack.Toolbar>

                    <Stack.Toolbar placement="right" >
                        <Stack.Toolbar.Menu icon="gear">
                            <Stack.Toolbar.MenuAction
                                icon={!showFullStopsOnly ? "checkmark.circle.fill" : "circle"}
                                onPress={() => setShowFullStopsOnly(prev => !prev)}
                            >
                                {t('lightMeterSheet.stopsToggle.showHalfThird')}
                            </Stack.Toolbar.MenuAction>
                        </Stack.Toolbar.Menu>
                    </Stack.Toolbar>
                </>
            ) : (
                <View style={styles.inlineHeader}>
                    <Pressable onPress={closeSheet} hitSlop={12} style={styles.inlineHeaderButton}>
                        <SheetIcon name="xmark" style={styles.inlineHeaderIcon} tintColor={dynamicSheetColors.label} />
                    </Pressable>
                    <Text style={[styles.inlineHeaderTitle, { color: dynamicSheetColors.label }]}>{resolvedTitle}</Text>
                    <Pressable
                        onPress={handleSettingsPress}
                        hitSlop={12}
                        style={styles.inlineHeaderButton}
                    >
                        <SheetIcon name="gear" style={styles.inlineHeaderIcon} tintColor={dynamicSheetColors.label} />
                    </Pressable>
                </View>
            )}

            <View style={styles.container}>
                {/* Content area wrapper - indicator is absolutely positioned within */}
                <View style={{
                    flex: 1,
                    position: 'absolute',
                    top: isBottomSheetPresentation ? -4 : headerHeight - 18,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                }}>
                    {/* Exposure indicator - absolutely positioned to avoid layout shifts */}
                    {Math.abs(exposureDiff) >= 0.1 && (
                        <View style={{
                            // position: 'absolute',
                            alignItems: 'center'
                        }}>
                            <GlassView
                                isInteractive={false}
                                tintColor={exposureDiff > 0 ? '#ff9500' : '#007aff'}
                                style={{
                                    // minWidth: 100,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingVertical: isBottomSheetPresentation ? 4 : 2,
                                    paddingHorizontal: isBottomSheetPresentation ? 10 : 8,
                                    backgroundColor: exposureBadgeBackground,
                                    borderRadius: 14,
                                }}>
                                <SheetIcon
                                    name={exposureDiff > 0 ? 'sun.max.fill' : 'moon.fill'}
                                    style={{ width: 8, height: 8, marginRight: 3 }}
                                    tintColor={exposureBadgeTextColor}
                                />
                                <Text style={{
                                    fontFamily: 'LufgaMedium',
                                    fontSize: isBottomSheetPresentation ? 11 : 10,
                                    color: exposureBadgeTextColor
                                }}>
                                    {exposureDiff > 0
                                        ? t('lightMeterSheet.exposureDiff.over', { diff: exposureDiff.toFixed(1) })
                                        : t('lightMeterSheet.exposureDiff.under', { diff: exposureDiff.toFixed(1) })}
                                </Text>
                            </GlassView>
                        </View>
                    )}
                </View>
                <GlassContainer
                    spacing={12}
                    style={[
                        styles.wheelsContainer,
                        presentation === 'bottom-sheet' && styles.wheelsContainerCompact,
                    ]}
                >
                    {/* Aperture */}
                    <View style={styles.wheelColumn}>
                        <Text style={[styles.label, { color: dynamicSheetColors.label }]}>{t('shared.aperture')}</Text>
                        {renderWheelSurface(lockedPicker === 'aperture', lockedPicker !== 'aperture',
                            <FlatList
                                ref={apertureRef}
                                data={APERTURE_OPTIONS.filter(a => a !== "Auto")}
                                renderItem={apertureRender}
                                keyExtractor={(item) => item}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="normal"
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={lockedPicker !== 'aperture'}
                                contentContainerStyle={{ paddingVertical: VERTICAL_PADDING }}
                                getItemLayout={(_, index) => ({
                                    length: ITEM_HEIGHT,
                                    offset: VERTICAL_PADDING + ITEM_HEIGHT * index,
                                    index,
                                })}
                                initialScrollIndex={APERTURE_OPTIONS.filter(a => a !== "Auto").indexOf(selectedAperture) || 0}
                                onScroll={handleApertureScroll}
                                onScrollBeginDrag={onApertureScrollBegin}
                                onMomentumScrollEnd={onApertureScrollEnd}
                                onScrollEndDrag={(e) => {
                                    // If no momentum, trigger end immediately
                                    if (e.nativeEvent.velocity?.y === 0) onApertureScrollEnd();
                                }}
                                scrollEventThrottle={16}
                                style={{ height: CONTAINER_HEIGHT }}
                            />
                        )}
                        {!isFilmMode && (
                            <Pressable onPress={() => toggleLock('aperture')} style={styles.lockButton}>
                                <SheetIcon
                                    name={lockedPicker === 'aperture' ? 'lock.fill' : 'lock.open.fill'}
                                    style={styles.lockIcon}
                                    tintColor={lockedPicker === 'aperture' ? dynamicSheetColors.label : dynamicSheetColors.secondaryLabel}
                                />
                            </Pressable>
                        )}
                    </View>

                    {/* Shutter */}
                    <View style={styles.wheelColumn}>
                        <Text style={[styles.label, { color: dynamicSheetColors.label }]}>{t('lightMeterSheet.columnLabels.shutter')}</Text>
                        {renderWheelSurface(lockedPicker === 'shutter', lockedPicker !== 'shutter',
                            <FlatList
                                ref={shutterRef}
                                data={shutterOptions}
                                renderItem={shutterRender}
                                keyExtractor={(item) => item}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="normal"
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={lockedPicker !== 'shutter'}
                                contentContainerStyle={{ paddingVertical: VERTICAL_PADDING }}
                                getItemLayout={(_, index) => ({
                                    length: ITEM_HEIGHT,
                                    offset: VERTICAL_PADDING + ITEM_HEIGHT * index,
                                    index,
                                })}
                                initialScrollIndex={Math.max(0, shutterOptions.indexOf(selectedShutter))}
                                onScroll={handleShutterScroll}
                                onScrollBeginDrag={onShutterScrollBegin}
                                onMomentumScrollEnd={onShutterScrollEnd}
                                onScrollEndDrag={(e) => {
                                    if (e.nativeEvent.velocity?.y === 0) onShutterScrollEnd();
                                }}
                                scrollEventThrottle={16}
                                style={{ height: CONTAINER_HEIGHT }}
                            />
                        )}
                        {!isFilmMode && (
                            <Pressable onPress={() => toggleLock('shutter')} style={styles.lockButton}>
                                <SheetIcon
                                    name={lockedPicker === 'shutter' ? 'lock.fill' : 'lock.open.fill'}
                                    style={styles.lockIcon}
                                    tintColor={lockedPicker === 'shutter' ? dynamicSheetColors.label : dynamicSheetColors.secondaryLabel}
                                />
                            </Pressable>
                        )}
                    </View>

                    {/* ISO */}
                    <View style={styles.wheelColumn}>
                        <Text style={[styles.label, { color: dynamicSheetColors.label }]}>{t('shared.iso')}{isFilmMode ? t('lightMeterSheet.columnLabels.isoFilmSuffix') : ''}</Text>
                        {renderWheelSurface(lockedPicker === 'iso', lockedPicker !== 'iso',
                            <FlatList
                                ref={isoRef}
                                data={ISO_OPTIONS.map(String)}
                                renderItem={isoRender}
                                keyExtractor={(item) => item}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate={"normal"}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={lockedPicker !== 'iso'}
                                contentContainerStyle={{ paddingVertical: VERTICAL_PADDING }}
                                getItemLayout={(_, index) => ({
                                    length: ITEM_HEIGHT,
                                    offset: VERTICAL_PADDING + ITEM_HEIGHT * index,
                                    index,
                                })}
                                initialScrollIndex={ISO_OPTIONS.map(String).indexOf(selectedIso.toString()) || 0}
                                onScroll={handleIsoScroll}
                                onScrollBeginDrag={onIsoScrollBegin}
                                onMomentumScrollEnd={onIsoScrollEnd}
                                onScrollEndDrag={(e) => {
                                    if (e.nativeEvent.velocity?.y === 0) onIsoScrollEnd();
                                }}
                                scrollEventThrottle={16}
                                style={{ height: CONTAINER_HEIGHT }}
                            />
                        )}
                        {!isFilmMode && (
                            <Pressable onPress={() => toggleLock('iso')} style={styles.lockButton}>
                                <SheetIcon
                                    name={lockedPicker === 'iso' ? 'lock.fill' : 'lock.open.fill'}
                                    style={styles.lockIcon}
                                    tintColor={lockedPicker === 'iso' ? dynamicSheetColors.label : dynamicSheetColors.secondaryLabel}
                                />
                            </Pressable>
                        )}
                        {isFilmMode && (
                            <View style={styles.lockButton}>
                                <SheetIcon
                                    name="lock.fill"
                                    style={styles.lockIcon}
                                    tintColor={dynamicSheetColors.systemOrange}
                                />
                            </View>
                        )}
                    </View>
                </GlassContainer>

                {!isSheetExpanded && (
                    <View style={[
                        { alignItems: 'center' },
                        isBottomSheetPresentation && styles.compactSaveAction,
                    ]}>
                        <TouchableOpacity onPress={() => expandSheetForm()}>
                            <Text style={{ color: dynamicSheetColors.label, fontFamily: 'LufgaRegular', marginTop: 18 }}>
                                {t('lightMeterSheet.saveToFrame')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isSheetExpanded && !selectedFilm && isBottomSheetPresentation && (
                    <Modal
                        visible
                        transparent
                        animationType="slide"
                        onRequestClose={closeFilmSelector}
                    >
                        <View style={styles.filmSelectorModalBackdrop}>
                            <View style={[
                                styles.filmSelectorModal,
                                { backgroundColor: colorScheme === 'dark' ? '#111113' : '#f7f7fb' },
                            ]}>
                                <View style={styles.filmSelectorModalHeader}>
                                    <Pressable onPress={closeFilmSelector} hitSlop={12} style={styles.inlineHeaderButton}>
                                        <SheetIcon name="xmark" style={styles.inlineHeaderIcon} tintColor={dynamicSheetColors.label} />
                                    </Pressable>
                                    <Text style={[styles.filmSelectorModalTitle, { color: dynamicSheetColors.label }]}>
                                        {t('lightMeterSheet.selectFilmTitle')}
                                    </Text>
                                    <View style={styles.inlineHeaderButton} />
                                </View>

                                <FlatList
                                    data={films}
                                    keyExtractor={(film) => String(film.id)}
                                    renderItem={({ item, index }) => renderFilmSelectorRow(item, index)}
                                    ListHeaderComponent={films.length > 0 ? filmSelectorHeader : null}
                                    ListEmptyComponent={filmSelectorEmpty}
                                    contentContainerStyle={styles.filmSelectorModalContent}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator
                                />
                            </View>
                        </View>
                    </Modal>
                )}

                {isSheetExpanded && !selectedFilm && !isBottomSheetPresentation && (
                    <View style={styles.filmListViewport}>
                        <FilmListScrollView
                            style={styles.filmListScroll}
                            contentContainerStyle={{ paddingBottom: 132 }}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            scrollEnabled
                            showsVerticalScrollIndicator
                        >
                            {films.length > 0 ? (
                                <>
                                    {filmSelectorHeader}
                                    {films.map((film, index) => renderFilmSelectorRow(film, index))}
                                </>
                            ) : filmSelectorEmpty}

                        </FilmListScrollView>
                    </View>
                )}

                {isSheetExpanded && selectedFilm && (
                    <View style={{ marginTop: 32 }}>
                        {/* Selected film card */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 20,
                            backgroundColor: dynamicSheetColors.tertiarySystemFill,
                            borderRadius: 24,
                        }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: dynamicSheetColors.label }}>
                                    {selectedFilm.title}
                                </Text>
                                <Text style={{ fontFamily: 'LufgaRegular', fontSize: 14, color: dynamicSheetColors.secondaryLabel }}>
                                    {t('lightMeterSheet.selectedFilmSummary', {
                                        iso: selectedFilm.iso,
                                        frameNumber: selectedFilm.frame_count + 1,
                                        totalFrames: selectedFilm.expected_shots,
                                    })}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleClearFilmSelection} style={{}}>
                                <SheetIcon
                                    name="xmark.circle.fill"
                                    style={{ width: 24, height: 24 }}
                                    tintColor={dynamicSheetColors.secondaryLabel}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Hint about adjustments */}
                        <Text style={{
                            fontFamily: 'LufgaRegular',
                            fontSize: 13,
                            color: dynamicSheetColors.secondaryLabel,
                            marginTop: 12,
                            textAlign: 'center'
                        }}>
                            {t('lightMeterSheet.isoLockedHint')}
                        </Text>

                        {/* Save button */}
                        <Pressable
                            onPress={handleSaveFrame}
                            style={({ pressed }) => ({
                                borderRadius: 24,
                                marginTop: 64,
                                opacity: pressed ? 0.82 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                            })}
                            android_ripple={{
                                color: 'rgba(255,255,255,0.22)',
                                borderless: false,
                            }}
                        >
                            <GlassView
                                isInteractive={true}
                                tintColor='#0091ff'
                                style={{
                                    padding: 16,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    backgroundColor: saveFrameButtonBackground,
                                    overflow: 'hidden',
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'LufgaMedium',
                                    fontSize: 17,
                                    color: saveFrameButtonTextColor,
                                }}>
                                    {t('lightMeterSheet.saveFrame')}
                                </Text>
                            </GlassView>
                        </Pressable>
                    </View>
                )}

            </View>
        </>
    );
}

export default function FormSheet() {
    const params = useLocalSearchParams<LightMeterReadingParams>();
    const headerHeight = useHeaderHeight();

    return (
        <LightMeterReadingSheet
            title={normalizeParam(params.title)}
            ev={normalizeParam(params.ev)}
            aperture={normalizeParam(params.aperture)}
            shutterSpeed={normalizeParam(params.shutterSpeed)}
            iso={normalizeParam(params.iso)}
            image={normalizeParam(params.image)}
            presentation="native-sheet"
            headerHeight={headerHeight}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "rgba(240,240,245,0.92)",
        paddingHorizontal: 20,
    },
    inlineHeader: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    inlineHeaderButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineHeaderIcon: {
        width: 24,
        height: 24,
    },
    inlineHeaderTitle: {
        flex: 1,
        textAlign: 'center',
        color: sheetColors.label,
        fontFamily: 'LufgaMedium',
        fontSize: 18,
        lineHeight: 23,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    wheelsContainer: {
        marginTop: 85,
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: -4,
    },
    wheelsContainerCompact: {
        marginTop: 44,
    },
    wheelColumn: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 4,
    },
    label: {
        fontSize: 14,
        fontFamily: "LufgaRegular",
        color: sheetColors.label,
        marginBottom: 12,
    },
    wheelGlass: {
        borderRadius: 24,
        // overflow: "hidden",
        width: "100%",
        height: CONTAINER_HEIGHT,
        justifyContent: "center",
    },
    wheelGlassLocked: {
        opacity: 0.5,
    },
    wheelItem: {
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    wheelItemSelected: {
        // backgroundColor: "rgba(100,100,255,0.12)",
    },
    wheelText: {
        fontSize: 20,
        fontFamily: "LufgaMedium",
        fontWeight: "500",
        color: sheetColors.label,
        includeFontPadding: false,
    },
    wheelTextSelected: {
        fontSize: 24,
    },
    wheelTextDimmed: {
        opacity: 0.4,
    },
    lockButton: {
        marginTop: 4,
        padding: 8,
    },
    lockIcon: {
        width: 20,
        height: 20,
    },
    compactSaveAction: {
        marginBottom: 36,
    },
    filmListViewport: {
        flex: 1,
        minHeight: 0,
        marginTop: 12,
        overflow: 'hidden',
    },
    filmListScroll: {
        flex: 1,
    },
    filmSelectorModalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.28)',
    },
    filmSelectorModal: {
        height: '82%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    filmSelectorModalHeader: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    filmSelectorModalTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: 'LufgaMedium',
        fontSize: 18,
        lineHeight: 23,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    filmSelectorModalContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 64,
    },
});
