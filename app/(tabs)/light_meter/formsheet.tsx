import { APERTURE_OPTIONS, ISO_OPTIONS, SHUTTER_SPEED_OPTIONS } from "@/utils/cameraSettings";
import { GlassContainer, GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from "react";
import {
    FlatList,
    PlatformColor,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from "react-native";
import * as Haptics from 'expo-haptics';
import { Film } from "@/types";
import { useFilms } from "@/hooks/useFilms";
import { useIsFocused } from "@react-navigation/native";
import { ContextMenu, Host, Switch } from "@expo/ui/swift-ui";
import { useHeaderHeight } from "@react-navigation/elements";
// ────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const VERTICAL_PADDING = ITEM_HEIGHT; // Padding to allow first/last items to center

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

export default function FormSheet() {
    const { title = "Light Meter Reading", ev, aperture: initialAperture, shutterSpeed: initialShutter, iso: initialIsoStr, image } =
        useLocalSearchParams<{
            title?: string;
            ev?: string;
            aperture?: string;
            shutterSpeed?: string;
            iso?: string;
            image?: string;
        }>();

    const navigation = useNavigation();
    const headerHeight = useHeaderHeight();
    const isGlassAvailable = isLiquidGlassAvailable();

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

    useEffect(() => {

        navigation.setOptions({
            headerRight: () => (
                <View style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }}>
                    <Host matchContents>
                        <ContextMenu>

                            <ContextMenu.Items>
                                <Switch
                                    label="Show half/third stops"
                                    value={!showFullStopsOnly}
                                    variant="switch"
                                    onValueChange={(value) => {
                                        setShowFullStopsOnly(!value);
                                        Haptics.selectionAsync().catch(() => { });
                                    }}
                                />
                            </ContextMenu.Items>


                            <ContextMenu.Trigger>
                                <SymbolView name="gear" size={26} tintColor={PlatformColor('label')} />
                            </ContextMenu.Trigger>
                        </ContextMenu>
                    </Host>
                </View>
            ),
        })
    }, [navigation, showFullStopsOnly]);

    // Reset state when returning from new-frame modal
    useEffect(() => {
        if (isFocused && hasNavigatedAway.current) {
            // Clear selection and collapse sheet when returning
            setSelectedFilm(null);
            setLockedPicker(null);
            setIsSheetExpanded(false);
            navigation.setOptions({
                sheetAllowedDetents: [0.45]
            });
            hasNavigatedAway.current = false;
        }
    }, [isFocused, navigation]);

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
        navigation.setOptions({
            title: title || "Exposure Settings",
        });
    }, [navigation, title]);

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

        navigation.setOptions({
            sheetAllowedDetents: [0.85]
        })
    }

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
    }, [selectedIso, selectedAperture, selectedShutter, targetEV, scrollToValue,
        minShutterSeconds, maxShutterSeconds, minAperture, maxAperture,
        apertureOptions, shutterOptions]);

    // Clear selected film and go back to film list
    const handleClearFilmSelection = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        setSelectedFilm(null);
        setLockedPicker(null); // Unlock ISO so user can adjust again
        // Collapse the sheet and reset expanded state
        setIsSheetExpanded(false);
        navigation.setOptions({
            sheetAllowedDetents: [0.45]
        });
    }, [navigation]);

    // Save the frame to the selected film
    const handleSaveFrame = useCallback(() => {
        if (!selectedFilm) return;

        // Mark that we're navigating away so state resets on return
        hasNavigatedAway.current = true;
        navigation.setOptions({
            sheetAllowedDetents: [0.65]
        });
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
    }, [selectedFilm, selectedAperture, selectedShutter, image]);

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
        []
    );

    const apertureRender = createRenderItem(selectedAperture, "ƒ/");
    const shutterRender = createRenderItem(selectedShutter, "", "s");
    const isoRender = createRenderItem(selectedIso);

    return (
        <View style={styles.container}>
            {/* Content area wrapper - indicator is absolutely positioned within */}
            <View style={{ flex: 1, position: 'relative' }}>
                {/* Exposure indicator - absolutely positioned to avoid layout shifts */}
                {Math.abs(exposureDiff) >= 0.3 && (
                    <View style={{
                        position: 'absolute',
                        top: headerHeight - 18,
                        left: 0,
                        right: 0,
                        zIndex: 10,
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
                                paddingVertical: 2,
                                paddingHorizontal: 8,
                                backgroundColor: exposureDiff > 0
                                    ? 'rgba(255, 149, 0, 0.15)'
                                    : 'rgba(0, 122, 255, 0.15)',
                                borderRadius: 14,
                            }}>
                            <SymbolView
                                name={exposureDiff > 0 ? 'sun.max.fill' : 'moon.fill'}
                                style={{ width: 8, height: 8, marginRight: 3 }}
                                tintColor="#ffffff"
                            />
                            <Text style={{
                                fontFamily: 'LufgaMedium',
                                fontSize: 10,
                                color: '#ffffff'
                            }}>
                                {exposureDiff > 0 ? '+' : ''}{exposureDiff.toFixed(1)} EV {exposureDiff > 0 ? 'over' : 'under'}
                            </Text>
                        </GlassView>
                    </View>
                )}
            </View>
            <GlassContainer spacing={12} style={styles.wheelsContainer}>
                {/* Aperture */}
                <View style={styles.wheelColumn}>
                    <Text style={styles.label}>Aperture</Text>
                    <GlassView
                        style={[styles.wheelGlass, lockedPicker === 'aperture' && styles.wheelGlassLocked, {
                            backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill')
                        }]}
                        glassEffectStyle="clear"
                        isInteractive={lockedPicker !== 'aperture'}
                    >
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
                    </GlassView>
                    {!isFilmMode && (
                        <Pressable onPress={() => toggleLock('aperture')} style={styles.lockButton}>
                            <SymbolView
                                name={lockedPicker === 'aperture' ? 'lock.fill' : 'lock.open.fill'}
                                style={styles.lockIcon}
                                tintColor={lockedPicker === 'aperture' ? PlatformColor('label') : PlatformColor('secondaryLabel')}
                            />
                        </Pressable>
                    )}
                </View>

                {/* Shutter */}
                <View style={styles.wheelColumn}>
                    <Text style={styles.label}>Shutter</Text>
                    <GlassView style={[styles.wheelGlass, lockedPicker === 'shutter' && styles.wheelGlassLocked, {
                        backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill')

                    }]} glassEffectStyle="clear" isInteractive={lockedPicker !== 'shutter'}>
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
                    </GlassView>
                    {!isFilmMode && (
                        <Pressable onPress={() => toggleLock('shutter')} style={styles.lockButton}>
                            <SymbolView
                                name={lockedPicker === 'shutter' ? 'lock.fill' : 'lock.open.fill'}
                                style={styles.lockIcon}
                                tintColor={lockedPicker === 'shutter' ? PlatformColor('label') : PlatformColor('secondaryLabel')}
                            />
                        </Pressable>
                    )}
                </View>

                {/* ISO */}
                <View style={styles.wheelColumn}>
                    <Text style={styles.label}>ISO{isFilmMode ? ' (Film)' : ''}</Text>
                    <GlassView style={[styles.wheelGlass, lockedPicker === 'iso' && styles.wheelGlassLocked, {
                        backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill')

                    }]} glassEffectStyle="clear" isInteractive={lockedPicker !== 'iso'}>
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
                    </GlassView>
                    {!isFilmMode && (
                        <Pressable onPress={() => toggleLock('iso')} style={styles.lockButton}>
                            <SymbolView
                                name={lockedPicker === 'iso' ? 'lock.fill' : 'lock.open.fill'}
                                style={styles.lockIcon}
                                tintColor={lockedPicker === 'iso' ? PlatformColor('label') : PlatformColor('secondaryLabel')}
                            />
                        </Pressable>
                    )}
                    {isFilmMode && (
                        <View style={styles.lockButton}>
                            <SymbolView
                                name="lock.fill"
                                style={styles.lockIcon}
                                tintColor={PlatformColor('systemOrange')}
                            />
                        </View>
                    )}
                </View>
            </GlassContainer>

            {!isSheetExpanded && (
                <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => expandSheetForm()}>
                        <Text style={{ color: PlatformColor('label'), fontFamily: 'LufgaRegular', marginTop: 18 }}>
                            Save to Frame
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {isSheetExpanded && !selectedFilm && (
                <ScrollView
                    style={{ marginTop: 12, flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 132 }}
                >
                    {films.length > 0 ? (
                        <>
                            <Text style={{
                                fontFamily: 'LufgaRegular',
                                fontSize: 13,
                                color: PlatformColor('secondaryLabel'),
                                marginBottom: 8,
                                marginLeft: 4,
                                textAlign: 'center'
                            }}>
                                Select a film to save this reading
                            </Text>

                            {films.map((film, index) => (
                                <TouchableOpacity key={film.id} onPress={() => handleSelectFilm(film)}>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: 16,
                                        borderBottomWidth: index === films.length - 1 ? 0 : 1,
                                        borderBottomColor: PlatformColor('separator')
                                    }}>
                                        <View>
                                            <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: PlatformColor('label') }}>{film.title}</Text>
                                            <Text style={{ fontFamily: 'LufgaRegular', fontSize: 14, color: PlatformColor('secondaryLabel') }}>ISO {film.iso}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: PlatformColor('label') }}>{film.frame_count}/{film.expected_shots}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    ) : (
                        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <Text style={{
                                fontFamily: 'LufgaRegular',
                                fontSize: 16,
                                color: PlatformColor('secondaryLabel'),
                                textAlign: 'center'
                            }}>
                                No films available.{'\n'}Create a film first to save readings.
                            </Text>
                        </View>
                    )}

                </ScrollView>
            )}

            {isSheetExpanded && selectedFilm && (
                <View style={{ marginTop: 32 }}>
                    {/* Selected film card */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 20,
                        backgroundColor: PlatformColor('tertiarySystemFill'),
                        borderRadius: 24,
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, color: PlatformColor('label') }}>
                                {selectedFilm.title}
                            </Text>
                            <Text style={{ fontFamily: 'LufgaRegular', fontSize: 14, color: PlatformColor('secondaryLabel') }}>
                                ISO {selectedFilm.iso} • Frame {selectedFilm.frame_count + 1}/{selectedFilm.expected_shots}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClearFilmSelection} style={{}}>
                            <SymbolView
                                name="xmark.circle.fill"
                                style={{ width: 24, height: 24 }}
                                tintColor={PlatformColor('secondaryLabel')}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Hint about adjustments */}
                    <Text style={{
                        fontFamily: 'LufgaRegular',
                        fontSize: 13,
                        color: PlatformColor('secondaryLabel'),
                        marginTop: 12,
                        textAlign: 'center'
                    }}>
                        ISO locked to film. Adjust aperture or shutter if needed.
                    </Text>

                    {/* Save button */}
                    <Pressable
                        onPress={handleSaveFrame}
                        style={{
                            // padding: 16,
                            borderRadius: 12,
                            marginTop: 64,
                        }}>
                        <GlassView
                            isInteractive={true}
                            tintColor='#0091ff'
                            style={{
                                padding: 16,
                                borderRadius: 24,
                                alignItems: 'center',
                                backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill')

                            }}
                        >
                            <Text style={{
                                fontFamily: 'LufgaMedium',
                                fontSize: 17,
                                color: isGlassAvailable ? '#fff' : PlatformColor('label'),
                            }}>
                                Save Frame
                            </Text>
                        </GlassView>
                    </Pressable>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: "rgba(240,240,245,0.92)",
        paddingHorizontal: 20,
    },
    wheelsContainer: {
        marginTop: 85,
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: -4,
    },
    wheelColumn: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 4,
    },
    label: {
        fontSize: 14,
        fontFamily: "LufgaRegular",
        color: PlatformColor('label'),
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
        color: PlatformColor("label"),
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
});