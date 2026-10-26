import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, PlatformColor, ActivityIndicator, Alert, BackHandler, Linking, Animated, useColorScheme, useWindowDimensions } from 'react-native';
import { Camera, Point, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useIsFocused } from "expo-router/react-navigation";
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router, Stack } from 'expo-router';
import { calculateEV100 } from '@/utils/calculations';
import * as Haptics from 'expo-haptics';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler'
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LightMeterReadingParams, LightMeterReadingSheet } from './formsheet';
import { useSharedValue } from 'react-native-reanimated';
import { ExifTags, read as readExif } from '@lodev09/react-native-exify';
import { Image as ExpoImage } from 'expo-image';
import { File, FileMode } from 'expo-file-system';
import { deleteTempFile } from '@/utils/ImageService';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';

const platformColor = (iosName: string, androidName: string) => (
    PlatformColor(Platform.OS === 'ios' ? iosName : androidName)
);

const lightMeterColors = {
    label: platformColor('label', '?android:attr/textColorPrimary'),
    tertiaryLabel: platformColor('tertiaryLabel', '?android:attr/textColorTertiary'),
    tertiarySystemFill: platformColor('tertiarySystemFill', '?android:attr/colorControlHighlight'),
    systemBackground: platformColor('systemBackground', '?android:attr/windowBackground'),
    systemBlue: platformColor('systemBlue', '?android:attr/colorAccent'),
    systemRed: platformColor('systemRed', '@android:color/holo_red_light'),
};

const getPhotoUri = (path: string) => path.startsWith('file://') ? path : `file://${path}`;

const toNumber = (value: unknown): number | undefined => {
    if (Array.isArray(value) && value.length === 1) {
        return toNumber(value[0]);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const rationalParts = value.split('/');

        if (rationalParts.length === 2) {
            const numerator = Number(rationalParts[0]);
            const denominator = Number(rationalParts[1]);

            if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

const calculateIsoForEV100 = (fNumber: number, exposureTime: number, ev100: number) => (
    100 * ((fNumber ** 2) / exposureTime) / Math.pow(2, ev100)
);

const getSettingsEV100 = (fNumber: number, exposureTime: number, iso: number) => (
    calculateEV100(fNumber, exposureTime, iso)
);

const readFileHead = async (uri: string, length: number) => {
    const file = new File(uri);
    const handle = file.open(FileMode.ReadOnly);

    try {
        return await handle.readBytes(Math.min(length, file.size));
    } finally {
        handle.close();
    }
};

const readJpegExifIso = async (path: string) => {
    try {
        const bytes = await readFileHead(getPhotoUri(path), 65536);

        const u16be = (offset: number) => (bytes[offset] << 8) | bytes[offset + 1];
        let offset = 2;
        let tiffOffset = -1;

        while (offset + 10 < bytes.length && bytes[offset] === 0xff) {
            const marker = bytes[offset + 1];
            const segmentLength = u16be(offset + 2);

            if (marker === 0xda) {
                break;
            }

            if (
                marker === 0xe1 &&
                bytes[offset + 4] === 0x45 &&
                bytes[offset + 5] === 0x78 &&
                bytes[offset + 6] === 0x69 &&
                bytes[offset + 7] === 0x66 &&
                bytes[offset + 8] === 0 &&
                bytes[offset + 9] === 0
            ) {
                tiffOffset = offset + 10;
                break;
            }

            offset += 2 + segmentLength;
        }

        if (tiffOffset < 0) {
            return undefined;
        }

        const littleEndian = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
        const read16 = (absoluteOffset: number) => littleEndian
            ? bytes[absoluteOffset] | (bytes[absoluteOffset + 1] << 8)
            : (bytes[absoluteOffset] << 8) | bytes[absoluteOffset + 1];
        const read32 = (absoluteOffset: number) => littleEndian
            ? bytes[absoluteOffset] | (bytes[absoluteOffset + 1] << 8) | (bytes[absoluteOffset + 2] << 16) | (bytes[absoluteOffset + 3] << 24)
            : (bytes[absoluteOffset] << 24) | (bytes[absoluteOffset + 1] << 16) | (bytes[absoluteOffset + 2] << 8) | bytes[absoluteOffset + 3];
        const readIFDEntries = (relativeOffset: number) => {
            const directoryOffset = tiffOffset + relativeOffset;
            const entryCount = read16(directoryOffset);

            return Array.from({ length: entryCount }, (_, index) => directoryOffset + 2 + (index * 12));
        };
        const readShortValue = (entryOffset: number, count: number) => {
            if (count === 1) {
                return read16(entryOffset + 8);
            }

            const valuesOffset = tiffOffset + read32(entryOffset + 8);
            return read16(valuesOffset);
        };

        const ifd0Entries = readIFDEntries(read32(tiffOffset + 4));
        const exifEntry = ifd0Entries.find(entryOffset => read16(entryOffset) === 0x8769);
        const exifIFDOffset = exifEntry ? read32(exifEntry + 8) : undefined;

        if (!exifIFDOffset) {
            return undefined;
        }

        const isoEntry = readIFDEntries(exifIFDOffset).find(entryOffset => read16(entryOffset) === 0x8827);

        if (!isoEntry || read16(isoEntry + 2) !== 3) {
            return undefined;
        }

        return readShortValue(isoEntry, read32(isoEntry + 4));
    } catch (error) {
        console.warn('Raw EXIF ISO read failed:', error);
        return undefined;
    }
};

const getExposureDebugTags = (exif: Record<string, unknown> | undefined) => {
    if (!exif) {
        return undefined;
    }

    return {
        Make: exif.Make,
        Model: exif.Model,
        FNumber: exif.FNumber,
        ApertureValue: exif.ApertureValue,
        ExposureTime: exif.ExposureTime,
        ShutterSpeedValue: exif.ShutterSpeedValue,
        ISOSpeedRatings: exif.ISOSpeedRatings,
        ISO: exif.ISO,
        ExposureIndex: exif.ExposureIndex,
        BrightnessValue: exif.BrightnessValue,
        ExposureBiasValue: exif.ExposureBiasValue,
        ExposureMode: exif.ExposureMode,
        ExposureProgram: exif.ExposureProgram,
        MeteringMode: exif.MeteringMode,
        FocalLength: exif.FocalLength,
        FocalLengthIn35mmFilm: exif.FocalLengthIn35mmFilm ?? exif.FocalLenIn35mmFilm,
        PixelXDimension: exif.PixelXDimension,
        PixelYDimension: exif.PixelYDimension,
    };
};

const getExposureSettings = (exif: Record<string, unknown> | undefined, isoOverride?: number) => {
    if (!exif) {
        return null;
    }

    const fNumber = toNumber(exif.FNumber)
        ?? (toNumber(exif.ApertureValue) !== undefined ? Math.pow(2, toNumber(exif.ApertureValue)! / 2) : undefined);
    const exposureTime = toNumber(exif.ExposureTime)
        ?? (toNumber(exif.ShutterSpeedValue) !== undefined ? 1 / Math.pow(2, toNumber(exif.ShutterSpeedValue)!) : undefined);
    const brightnessValue = toNumber(exif.BrightnessValue);
    const brightnessEV100 = brightnessValue !== undefined
        ? brightnessValue + 5
        : undefined;
    const derivedIsoFromBrightness = fNumber && exposureTime && brightnessEV100 !== undefined
        ? calculateIsoForEV100(fNumber, exposureTime, brightnessEV100)
        : undefined;
    const iso = isoOverride
        ?? toNumber(exif.ISOSpeedRatings)
        ?? toNumber(exif.ISO)
        ?? derivedIsoFromBrightness;

    if (!fNumber || !exposureTime || !iso) {
        return null;
    }

    const settingsEV100 = getSettingsEV100(fNumber, exposureTime, iso);

    return {
        fNumber,
        exposureTime,
        iso,
        ev100: settingsEV100,
        settingsEV100,
        brightnessEV100,
        derivedIsoFromBrightness,
        debugTags: getExposureDebugTags(exif),
    };
};

const readPhotoExposureSettings = async (path: string, metadata?: Record<string, unknown>) => {
    const metadataExif = (metadata?.['{Exif}'] as Record<string, unknown> | undefined) ?? metadata;
    const metadataSettings = getExposureSettings(metadataExif);

    if (metadataSettings) {
        return {
            ...metadataSettings,
            source: 'photo.metadata' as const,
        };
    }

    const rawJpegIso = await readJpegExifIso(path);
    const fileExif = await readExif(getPhotoUri(path));
    const fileSettings = getExposureSettings(fileExif as ExifTags | undefined, rawJpegIso);

    if (!fileSettings) {
        return null;
    }

    return {
        ...fileSettings,
        rawJpegIso,
        source: 'file-exif' as const,
    };
};

const ANDROID_READING_SHEET_COLLAPSED_DETENT = 0.52;
// The exposure planner carries the scene card above the columns, so it opens taller.
const ANDROID_PLANNER_SHEET_DETENT = 0.75;
const PLANNER_GLYPH_SIZE = 22;

/** The planner's glyph: a hazy sun on iOS, twilight on Android. */
function PlannerGlyph({ color }: { color: string | ReturnType<typeof PlatformColor> }) {
    if (Platform.OS === 'android') {
        return <MaterialIcons name="wb-twilight" size={PLANNER_GLYPH_SIZE} color={color} />;
    }
    return <SymbolView name="sun.haze.fill" style={{ width: PLANNER_GLYPH_SIZE, height: PLANNER_GLYPH_SIZE }} tintColor={color} />;
}

export default function CameraBackgroundPage() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    // Keep interactive controls clear of side rails (iPhone Duo, Split View).
    // The camera preview itself is background and may extend under them.
    const insets = useSafeAreaInsets();
    const containerInsetStyle = { paddingLeft: 10 + insets.left, paddingRight: 10 + insets.right };
    const { height: windowHeight } = useWindowDimensions();
    const isFocused = useIsFocused();
    const isGlassAvailable = isLiquidGlassAvailable();
    const isAndroid = Platform.OS === 'android';
    const androidFallbackButtonTextColor = colorScheme === 'dark' ? '#F7F8FF' : '#100528';
    const androidFallbackButtonBackground = colorScheme === 'dark'
        ? 'rgba(22, 30, 46, 0.72)'
        : 'rgba(247, 247, 251, 0.76)';
    const androidFallbackButtonBorder = colorScheme === 'dark'
        ? 'rgba(229, 224, 255, 0.35)'
        : 'rgba(16, 5, 40, 0.18)';
    const androidSheetBackground = colorScheme === 'dark'
        ? 'rgba(5, 5, 7, 0.80)'
        : 'rgba(247, 247, 251, 0.89)';
    const androidSheetHandleColor = colorScheme === 'dark' ? '#5f5f66' : '#c7c7cc';
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const [reading, setReading] = useState<LightMeterReadingParams | null>(null);
    // iOS presents the planner as a route, so this screen only knows it is up by
    // losing focus to it; the flag clears when focus comes back. Android keeps the
    // sheet inside this screen, so `reading` already says.
    const [plannerRouteOpen, setPlannerRouteOpen] = useState(false);
    const plannerLostFocus = useRef(false);

    // Android: the hardware Back button closes the reading sheet instead of
    // switching tabs and leaving the frozen preview behind.
    useEffect(() => {
        if (Platform.OS !== 'android' || !reading) return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            bottomSheetRef.current?.close();
            return true;
        });
        return () => subscription.remove();
    }, [reading]);
    const [androidSheetDetent, setAndroidSheetDetent] = useState(ANDROID_READING_SHEET_COLLAPSED_DETENT);
    useEffect(() => {
        if (!plannerRouteOpen) return;
        if (!isFocused) {
            plannerLostFocus.current = true;
        } else if (plannerLostFocus.current) {
            plannerLostFocus.current = false;
            setPlannerRouteOpen(false);
        }
    }, [isFocused, plannerRouteOpen]);
    const isPlannerShowing = isAndroid ? reading?.mode === 'scene' : plannerRouteOpen;

    // While the planner is up the camera is off duty: the preview pauses and the
    // gradient from the no-camera screens fades in over it, controls fade out.
    const [plannerBackdrop] = useState(() => new Animated.Value(0));
    useEffect(() => {
        Animated.timing(plannerBackdrop, {
            toValue: isPlannerShowing ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [isPlannerShowing, plannerBackdrop]);
    const controlsOpacity = plannerBackdrop.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const bottomSheetRef = useRef<BottomSheet>(null);
    const shouldFreezeCameraPreview = isAndroid && reading?.image;
    const androidSheetContainerLayout = useSharedValue({
        height: windowHeight,
        offset: {
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
        },
    });

    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    const { hasPermission, requestPermission } = useCameraPermission();
    // Use multi-camera device to enable automatic optical zoom (lens switching)
    const device = useCameraDevice('back', {
        physicalDevices: [
            'ultra-wide-angle-camera',
            'wide-angle-camera',
            'telephoto-camera'
        ],
    });
    const cameraRef = useRef<Camera>(null);

    // VisionCamera writes each capture to the OS temp dir and never removes it.
    // By the time a new capture happens, the previous one has either been copied
    // into app storage (frame saved) or abandoned, so it is safe to delete then.
    const tempPhotoPathRef = useRef<string | null>(null);
    const releasePreviousTempPhoto = useCallback(() => {
        if (tempPhotoPathRef.current) {
            deleteTempFile(getPhotoUri(tempPhotoPathRef.current));
            tempPhotoPathRef.current = null;
        }
    }, []);
    useEffect(() => releasePreviousTempPhoto, [releasePreviousTempPhoto]);
    const [buttonRotation] = useState(() => new Animated.Value(0));
    const androidSheetSnapPoints = useMemo(
        () => [`${Math.round(androidSheetDetent * 100)}%`],
        [androidSheetDetent]
    );
    const cameraDiagnostics = useMemo(() => {
        if (!device) {
            return null;
        }

        return {
            platform: Platform.OS,
            device: {
                id: device.id,
                name: device.name,
                position: device.position,
                physicalDevices: device.physicalDevices,
                neutralZoom: device.neutralZoom,
                minZoom: device.minZoom,
                maxZoom: device.maxZoom,
                minExposure: device.minExposure,
                maxExposure: device.maxExposure,
                supportsLowLightBoost: device.supportsLowLightBoost,
            },
            firstListedFormat: device.formats?.[0] ? {
                photoWidth: device.formats[0].photoWidth,
                photoHeight: device.formats[0].photoHeight,
                videoWidth: device.formats[0].videoWidth,
                videoHeight: device.formats[0].videoHeight,
                minISO: device.formats[0].minISO,
                maxISO: device.formats[0].maxISO,
                minFps: device.formats[0].minFps,
                maxFps: device.formats[0].maxFps,
                fieldOfView: device.formats[0].fieldOfView,
                supportsPhotoHdr: device.formats[0].supportsPhotoHdr,
                supportsVideoHdr: device.formats[0].supportsVideoHdr,
            } : null,
        };
    }, [device]);

    // Focus indicator state and animations
    const [focusPoint, setFocusPoint] = useState<Point | null>(null);
    const [focusScale] = useState(() => new Animated.Value(1.2));
    const [focusOpacity] = useState(() => new Animated.Value(0));

    const focusAndExpose = useCallback(async (point: Point) => {
        const c = cameraRef.current
        if (c == null) return

        // Stop any ongoing animations before starting new ones
        focusScale.stopAnimation();
        focusOpacity.stopAnimation();

        // Show focus indicator immediately
        setFocusPoint(point);
        focusScale.setValue(1.2);
        focusOpacity.setValue(1);

        // Animate scale down (like iOS camera)
        Animated.spring(focusScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
        }).start();

        try {
            // focus() sets both focus and exposure metering at the tapped point
            await c.focus(point)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

            // Fade out after focusing completes
            Animated.timing(focusOpacity, {
                toValue: 0,
                duration: 500,
                delay: 800,
                useNativeDriver: true,
            }).start(() => setFocusPoint(null));
        } catch (e) {
            // Focus may fail if camera is not ready or point is out of bounds
            console.warn('Focus failed:', e);
            // Fade out on error too
            Animated.timing(focusOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setFocusPoint(null));
        }
    }, [focusScale, focusOpacity])

    const gesture = useTapGesture({
        runOnJS: true,
        onDeactivate: ({ x, y, canceled }) => {
            if (!canceled) {
                focusAndExpose({ x, y });
            }
        },
    });

    useEffect(() => {
        androidSheetContainerLayout.value = {
            height: windowHeight,
            offset: {
                top: 0,
                bottom: 0,
                right: 0,
                left: 0,
            },
        };
    }, [androidSheetContainerLayout, windowHeight]);

    const renderSheetBackdrop = useCallback(
        (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="none"
            />
        ),
        []
    );

    const handleUIRotationChanged = (rotation: number) => {
        // rotation is in degrees: 0, 90, 180, 270
        // Use positive rotation to keep text upright
        const targetRotation = rotation;

        Animated.spring(buttonRotation, {
            toValue: targetRotation,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
        }).start();
    };

    const handleRequestPermission = async () => {
        setPermissionRequested(true);
        await requestPermission();
    };

    const handleFormSheetOpen = async (debug = false) => {
        if (loading) return; // Prevent multiple taps

        if (debug) {
            const debugReading = {
                title: `EV 12.34`,
                ev: '12.34',
                aperture: '2.8',
                shutterSpeed: '1/125',
                iso: '100',
                image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            };

            if (isAndroid) {
                setAndroidSheetDetent(ANDROID_READING_SHEET_COLLAPSED_DETENT);
                setReading(debugReading);
            } else {
                router.push({
                    pathname: '/(tabs)/light_meter/formsheet',
                    params: debugReading
                });
            }
            return;
        }

        setLoading(true);

        try {
            const photo = await cameraRef.current?.takePhoto();

            if (!photo) {
                setLoading(false);
                Alert.alert(t('shared.error'), t('lightMeter.takePhotoErrorMessage'));
                return;
            }

            releasePreviousTempPhoto();
            tempPhotoPathRef.current = photo.path;

            const exposureSettings = await readPhotoExposureSettings(photo.path, photo.metadata as Record<string, unknown> | undefined);

            if (!exposureSettings) {
                setLoading(false);
                console.warn('Invalid EXIF data: missing aperture, shutter speed, or ISO', photo.metadata);
                Alert.alert(t('shared.error'), t('lightMeter.readCameraDataErrorMessage'));
                return;
            }

            const { fNumber, exposureTime, iso: phoneIso } = exposureSettings;
            const ev100 = exposureSettings.ev100;

            setLoading(false);
            if (__DEV__) console.log('Light meter diagnostics:', {
                camera: cameraDiagnostics,
                exif: exposureSettings.debugTags,
                photo: {
                    width: photo.width,
                    height: photo.height,
                    orientation: photo.orientation,
                    isMirrored: photo.isMirrored,
                    path: photo.path,
                },
                exposure: {
                    selectedEV100: ev100,
                    settingsEV100: exposureSettings.settingsEV100,
                    brightnessEV100: exposureSettings.brightnessEV100,
                    settingsMinusBrightnessEV: exposureSettings.brightnessEV100 !== undefined
                        ? exposureSettings.settingsEV100 - exposureSettings.brightnessEV100
                        : undefined,
                    fNumber,
                    exposureTime,
                    iso: phoneIso,
                    rawJpegIso: 'rawJpegIso' in exposureSettings ? exposureSettings.rawJpegIso : undefined,
                    derivedIsoFromBrightness: exposureSettings.derivedIsoFromBrightness,
                },
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const readingParams = {
                title: `EV ${ev100.toFixed(2)}`,
                ev: ev100.toFixed(2),
                aperture: String(fNumber),
                shutterSpeed: String(exposureTime),
                iso: String(phoneIso),
                image: getPhotoUri(photo.path)
            };

            if (isAndroid) {
                setAndroidSheetDetent(ANDROID_READING_SHEET_COLLAPSED_DETENT);
                setReading(readingParams);
            } else {
                router.push({
                    pathname: '/(tabs)/light_meter/formsheet',
                    params: readingParams
                });
            }
        } catch (error) {
            setLoading(false);
            Alert.alert(t('shared.error'), t('lightMeter.captureErrorMessage'));
        }
    };

    // Open the reading sheet as the exposure planner: no reading, no photo, the
    // scene ruler sets the EV. Works on every state of this screen.
    const openPlanner = () => {
        if (loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        if (isAndroid) {
            setAndroidSheetDetent(ANDROID_PLANNER_SHEET_DETENT);
            setReading({ mode: 'scene' });
        } else {
            setPlannerRouteOpen(true);
            router.push({
                pathname: '/(tabs)/light_meter/formsheet',
                params: { mode: 'scene' },
            });
        }
    };

    // Chrome shared by the shutter pill, the round planner button and the planner pill.
    const controlGlassStyle = {
        backgroundColor: isGlassAvailable ? 'transparent' : isAndroid ? androidFallbackButtonBackground : lightMeterColors.tertiarySystemFill,
        borderWidth: isAndroid && !isGlassAvailable ? 1 : 0,
        borderColor: isAndroid && !isGlassAvailable ? androidFallbackButtonBorder : 'transparent',
        shadowColor: '#000',
        shadowOpacity: isAndroid ? 0.28 : 0.2,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: isAndroid ? 8 : 0,
        overflow: 'hidden' as const,
    };
    const controlTextColor = isAndroid && !isGlassAvailable ? androidFallbackButtonTextColor : lightMeterColors.label;
    const controlRipple = { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(16,5,40,0.08)', borderless: false };
    const plannerButtonSize = 48;

    // iOS: the same native header button the Films tab uses for its "+", so the two
    // corners match. It is withdrawn while the planner is open so a second tap
    // cannot stack sheets. Header buttons stay upright; only the shutter pill turns.
    const plannerToolbar = (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
                icon="sun.haze.fill"
                accessibilityLabel={t('lightMeter.planner.title')}
                onPress={openPlanner}
            />
        </Stack.Toolbar>
    );

    // Android has no native header on this screen, so it draws its own round glyph
    // button in the same corner.
    const plannerButton = (
        <Animated.View
            pointerEvents={isPlannerShowing ? 'none' : 'auto'}
            style={{
                position: 'absolute',
                top: insets.top + 8,
                right: 10 + insets.right,
                zIndex: 9,
                opacity: controlsOpacity,
            }}
        >
            <GlassView isInteractive={true} glassEffectStyle='regular' style={[controlGlassStyle, { borderRadius: plannerButtonSize / 2 }]}>
                <Pressable
                    onPress={openPlanner}
                    accessibilityRole="button"
                    accessibilityLabel={t('lightMeter.planner.title')}
                    android_ripple={controlRipple}
                    style={({ pressed }) => [
                        { transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }] },
                        { width: plannerButtonSize, height: plannerButtonSize, alignItems: 'center', justifyContent: 'center' },
                    ]}
                >
                    <PlannerGlyph color={controlTextColor} />
                </Pressable>
            </GlassView>
        </Animated.View>
    );

    // The gradient from the no-camera screens, faded over the paused preview while planning.
    const plannerBackdropView = (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: plannerBackdrop, zIndex: 8 }]}>
            <LinearGradient
                colors={gradientColors}
                locations={[0.1, 0.4, 0.9]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
        </Animated.View>
    );

    // Glyph-and-text pill for the screens that have no shutter button.
    const plannerPill = (
        <Pressable
            onPress={openPlanner}
            accessibilityRole="button"
            style={({ pressed }) => [{ marginTop: 20, transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }] }]}
        >
            <GlassView isInteractive={true} glassEffectStyle='regular' style={[controlGlassStyle, { borderRadius: 22 }]}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: isAndroid ? 60 : 56,
                    paddingHorizontal: isAndroid ? 26 : 22,
                    paddingVertical: isAndroid ? 16 : 14,
                }}>
                    <PlannerGlyph color={controlTextColor} />
                    <Text style={{
                        color: controlTextColor,
                        fontFamily: 'LufgaMedium',
                        fontSize: isAndroid ? 16 : 14,
                        lineHeight: isAndroid ? 21 : 18,
                        includeFontPadding: false,
                        textAlignVertical: 'center',
                        letterSpacing: 0.25,
                    }}>{t('lightMeter.planner.open')}</Text>
                </View>
            </GlassView>
        </Pressable>
    );

    // Android presents the sheet inline; every state of this screen can open it.
    const androidSheet = isAndroid && reading ? (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={androidSheetSnapPoints}
            containerLayoutState={androidSheetContainerLayout}
            // Above the planner gradient (zIndex 8): on Android a sibling with a
            // zIndex draws over siblings without one, which hid the whole sheet.
            containerStyle={styles.sheetContainer}
            enableDynamicSizing={false}
            enableContentPanningGesture={false}
            enableHandlePanningGesture={false}
            enableOverDrag={false}
            enablePanDownToClose={false}
            backdropComponent={renderSheetBackdrop}
            backgroundStyle={{ backgroundColor: androidSheetBackground }}
            handleComponent={null}
            handleStyle={styles.sheetHandle}
            handleIndicatorStyle={{ backgroundColor: androidSheetHandleColor }}
            onClose={() => setReading(null)}
        >
            <BottomSheetView style={styles.sheetContent}>
                <LightMeterReadingSheet
                    {...reading}
                    presentation="bottom-sheet"
                    onClose={() => bottomSheetRef.current?.close()}
                    onSheetDetentChange={setAndroidSheetDetent}
                />
            </BottomSheetView>
        </BottomSheet>
    ) : null;

    if (!hasPermission) {
        // Camera permissions are not granted
        return (
            <View style={[styles.container, containerInsetStyle, { justifyContent: 'center' }]}>
                <LinearGradient
                    // colors={['#09090B', '#100528', '#09090B']}
                    colors={gradientColors}
                    locations={[0.1, 0.4, 0.9]}
                    // dither={false}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} // Optional: start from top-left
                    end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
                />
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: lightMeterColors.label }}>{t('lightMeter.cameraPermissionMessage')}</Text>
                {!permissionRequested && (
                    <Pressable onPress={handleRequestPermission} style={({ pressed }) => [
                        {
                            transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }],
                        }
                    ]}>
                        <GlassView isInteractive={true} tintColor='#0091ff' style={{
                            padding: 20,
                            marginTop: 20,
                            borderRadius: 24,
                            backgroundColor: isGlassAvailable ? 'transparent' : isAndroid ? '#0A84FF' : lightMeterColors.systemBlue
                        }}>
                            <Text style={{
                                color: 'white',
                                fontFamily: 'LufgaMedium',
                                fontSize: 14,
                            }}>{t('lightMeter.grantPermission')}</Text>
                        </GlassView>
                    </Pressable>
                )}

                {permissionRequested && (
                    <Pressable onPress={() => Linking.openSettings()}>
                        <GlassView isInteractive={true} tintColor='#ff3b30' style={{
                            padding: 20,
                            marginTop: 20,
                            borderRadius: 24,
                            backgroundColor: isGlassAvailable ? 'transparent' : isAndroid ? '#FF3B30' : lightMeterColors.systemRed
                        }}>
                            <Text style={{
                                color: 'white',
                                fontFamily: 'LufgaMedium',
                                fontSize: 14,
                            }}>{t('lightMeter.openSettings')}</Text>
                        </GlassView>
                    </Pressable>
                )}
                {plannerPill}
                {androidSheet}
            </View>
        );
    }

    if (!device) {
        return (
            <View style={[styles.container, containerInsetStyle, { justifyContent: 'center' }]}>
                <LinearGradient
                    // colors={['#09090B', '#100528', '#09090B']}
                    colors={gradientColors}
                    locations={[0.1, 0.4, 0.9]}
                    // dither={false}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} // Optional: start from top-left
                    end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
                />
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: lightMeterColors.label }}>{t('lightMeter.noDeviceMessage')}</Text>
                {plannerPill}
                {androidSheet}
            </View>
        );
    }

    // if (!isCameraNeeded) {
    //     return <View />;
    // }

    return (
        <View style={[styles.container, containerInsetStyle]}>
            <GestureDetector gesture={gesture}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isFocused && !shouldFreezeCameraPreview && !isPlannerShowing}
                    zoom={device.neutralZoom}
                    photo={true}
                    onInitialized={() => setIsCameraReady(true)}
                    enableZoomGesture={true}
                    onUIRotationChanged={handleUIRotationChanged}
                />
            </GestureDetector>

            {shouldFreezeCameraPreview && (
                <ExpoImage
                    source={{ uri: reading.image }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    pointerEvents="none"
                />
            )}

            {/* Focus indicator - iOS Camera style */}
            {focusPoint && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.focusIndicator,
                        {
                            left: focusPoint.x - 40,
                            top: focusPoint.y - 40,
                            opacity: focusOpacity,
                            transform: [{ scale: focusScale }],
                        },
                    ]}
                />
            )}

            {!isCameraReady && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            )}

            {!reading && (
                <Animated.View style={{
                    transform: [
                        {
                            rotate: buttonRotation.interpolate({
                                inputRange: [0, 90, 180, 270],
                                outputRange: ['0deg', '90deg', '180deg', '270deg'],
                            })
                        },
                        {
                            translateX: buttonRotation.interpolate({
                                inputRange: [0, 90, 180, 270],
                                outputRange: [0, -40, 0, 40],
                            })
                        }
                    ],
                    opacity: controlsOpacity,
                    zIndex: 9,
                }}>
                    <GlassView isInteractive={true} glassEffectStyle='regular' style={[controlGlassStyle, { borderRadius: 22 }]}>

                        <Pressable style={({ pressed }) => [
                            {
                                transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }],
                            },
                            {
                                minHeight: isAndroid ? 60 : 56,
                                paddingHorizontal: isAndroid ? 30 : 24,
                                paddingVertical: isAndroid ? 16 : 14,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }
                        ]} onPress={() => handleFormSheetOpen()} android_ripple={{ color: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(16,5,40,0.08)', borderless: false }}>

                            {!loading && <Text
                                style={{
                                    color: isAndroid && !isGlassAvailable ? androidFallbackButtonTextColor : lightMeterColors.label,
                                    fontFamily: 'LufgaMedium',
                                    fontSize: isAndroid ? 16 : 14,
                                    lineHeight: isAndroid ? 21 : 18,
                                    includeFontPadding: false,
                                    textAlignVertical: 'center',
                                    letterSpacing: 0.25,
                                }}>{t('lightMeter.takeReading')}</Text>}
                            {loading && <ActivityIndicator />}

                        </Pressable>
                    </GlassView>
                </Animated.View>
            )}
            {plannerBackdropView}
            {isCameraReady && (isAndroid ? plannerButton : !isPlannerShowing && plannerToolbar)}
            {androidSheet}
        </View >
    );
}

const styles = StyleSheet.create({
    sheetContainer: {
        zIndex: 10,
    },
    container: {
        // backgroundColor: 'red',
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: Platform.OS === 'ios' ? 100 : 40,
        // No background color here! Let the camera show through.
    },
    focusIndicator: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderWidth: 1.5,
        borderColor: '#FFD700',
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        padding: 20,
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9, // Ensure content is above the camera
        // Background must be transparent (default) to see the camera
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white', // White text usually looks best over camera
        marginBottom: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.75)', // Add shadow for readability
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent card
        padding: 20,
        borderRadius: 12,
    },
    cardText: {
        fontSize: 16,
        color: 'black',
    },
    button: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'blue',
        borderRadius: 5
    },
    text: {
        color: 'white'
    },
    sheetContent: {
        flex: 1,
    },
    sheetHandle: {
        paddingTop: 0,
        paddingBottom: 0,
    }
});
