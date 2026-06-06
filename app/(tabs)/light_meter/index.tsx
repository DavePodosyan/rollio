import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, PlatformColor, ActivityIndicator, Alert, Linking, Animated, useColorScheme, useWindowDimensions } from 'react-native';
import { Camera, Point, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { calculateEV100 } from '@/utils/calculations';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { LightMeterReadingParams, LightMeterReadingSheet } from './formsheet';
import { useSharedValue } from 'react-native-reanimated';
import { ExifTags, readAsync } from '@lodev09/react-native-exify';
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';

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

const decodeBase64 = (base64: string) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;

    for (const char of base64.replace(/=+$/, '')) {
        const value = alphabet.indexOf(char);

        if (value < 0) {
            continue;
        }

        buffer = (buffer << 6) | value;
        bits += 6;

        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }

    return bytes;
};

const readJpegExifIso = async (path: string) => {
    try {
        const bytes = decodeBase64(await FileSystem.readAsStringAsync(getPhotoUri(path), {
            encoding: FileSystem.EncodingType.Base64,
            length: 65536,
            position: 0,
        }));

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
        console.log('Raw EXIF ISO read failed:', error);
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
    const fileExif = await readAsync(getPhotoUri(path));
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

export default function CameraBackgroundPage() {
    const colorScheme = useColorScheme();
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
    const [androidSheetDetent, setAndroidSheetDetent] = useState(ANDROID_READING_SHEET_COLLAPSED_DETENT);
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
    const buttonRotation = useRef(new Animated.Value(0)).current;
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
    const focusScale = useRef(new Animated.Value(1.2)).current;
    const focusOpacity = useRef(new Animated.Value(0)).current;

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
            console.log('Focus failed:', e)
            // Fade out on error too
            Animated.timing(focusOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setFocusPoint(null));
        }
    }, [focusScale, focusOpacity])

    const gesture = Gesture.Tap()
        .runOnJS(true)
        .onEnd(({ x, y }) => {
            focusAndExpose({ x, y });
        })

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
                Alert.alert("Error", "Failed to take photo. Please try again.");
                return;
            }

            console.log('Photo captured:', photo);
            console.log('Photo metadata:', photo.metadata);

            const exposureSettings = await readPhotoExposureSettings(photo.path, photo.metadata as Record<string, unknown> | undefined);
            console.log('Extracted exposure settings:', exposureSettings);
            console.log('Exposure settings source:', exposureSettings?.source);
            console.log('Exposure EXIF tags:', exposureSettings?.debugTags);
            
            if (!exposureSettings) {
                setLoading(false);
                console.log('Invalid EXIF data: missing aperture, shutter speed, or ISO');
                console.log('Full metadata:', photo.metadata);
                Alert.alert("Error", "Failed to read camera data. Please try again.");
                return;
            }

            const { fNumber, exposureTime, iso: phoneIso } = exposureSettings;
            const ev100 = exposureSettings.ev100;

            setLoading(false);
            console.log('Light meter diagnostics:', {
                camera: cameraDiagnostics,
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
            console.log({
                params: {
                    title: `EV ${ev100.toFixed(2)}`,
                    ev: ev100.toFixed(2),
                    aperture: fNumber,
                    shutterSpeed: exposureTime,
                    iso: phoneIso,
                    image: getPhotoUri(photo.path)
                }
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
            Alert.alert("Error", "Failed to capture image. Please try again.");
        }
    };

    if (!hasPermission) {
        // Camera permissions are not granted
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <LinearGradient
                    // colors={['#09090B', '#100528', '#09090B']}
                    colors={gradientColors}
                    locations={[0.1, 0.4, 0.9]}
                    // dither={false}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} // Optional: start from top-left
                    end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
                />
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: lightMeterColors.label }}>We need your permission to show the camera</Text>
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
                            }}>Grant Permission</Text>
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
                            }}>Open Settings</Text>
                        </GlassView>
                    </Pressable>
                )}
            </View>
        );
    }

    if (!device) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <LinearGradient
                    // colors={['#09090B', '#100528', '#09090B']}
                    colors={gradientColors}
                    locations={[0.1, 0.4, 0.9]}
                    // dither={false}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} // Optional: start from top-left
                    end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
                />
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: lightMeterColors.label }}>No camera device available</Text>

                {/* <Pressable onPress={() => handleFormSheetOpen(true)}><Text style={{ color: PlatformColor('label'), marginTop: 50 }}>Debug</Text></Pressable> */}


            </View>
        );
    }

    // if (!isCameraNeeded) {
    //     return <View />;
    // }

    return (
        <View style={styles.container}>
            <GestureDetector gesture={gesture}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFillObject}
                    device={device}
                    isActive={isFocused && !shouldFreezeCameraPreview}
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
                    style={StyleSheet.absoluteFillObject}
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
                    ]
                }}>
                    <GlassView isInteractive={true} glassEffectStyle='regular' style={{
                        borderRadius: 22,
                        zIndex: 9,
                        backgroundColor: isGlassAvailable ? 'transparent' : isAndroid ? androidFallbackButtonBackground : lightMeterColors.tertiarySystemFill,
                        borderWidth: isAndroid && !isGlassAvailable ? 1 : 0,
                        borderColor: isAndroid && !isGlassAvailable ? androidFallbackButtonBorder : 'transparent',
                        shadowColor: '#000',
                        shadowOpacity: isAndroid ? 0.28 : 0.2,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: isAndroid ? 8 : 0,
                        overflow: 'hidden',
                    }}>

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
                                }}>Take a reading</Text>}
                            {loading && <ActivityIndicator />}

                        </Pressable>
                    </GlassView>
                </Animated.View>
            )}
            {isAndroid && reading && (
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={androidSheetSnapPoints}
                    containerLayoutState={androidSheetContainerLayout}
                    enableDynamicSizing={false}
                    enableContentPanningGesture={false}
                    enableHandlePanningGesture={false}
                    enableOverDrag={false}
                    enablePanDownToClose={false}
                    backdropComponent={renderSheetBackdrop}
                    backgroundStyle={{ backgroundColor: isAndroid ? androidSheetBackground : lightMeterColors.systemBackground }}
                    handleComponent={null}
                    handleStyle={styles.sheetHandle}
                    handleIndicatorStyle={{ backgroundColor: isAndroid ? androidSheetHandleColor : lightMeterColors.tertiaryLabel }}
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
            )}
        </View >
    );
}

const styles = StyleSheet.create({
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
