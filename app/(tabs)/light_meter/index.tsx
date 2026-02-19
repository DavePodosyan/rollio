import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PlatformColor, ActivityIndicator, Alert, Linking, Animated } from 'react-native';
import { Camera, Point, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useIsFocused } from '@react-navigation/native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { calculateEV100 } from '@/utils/calculations';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler'


export default function CameraBackgroundPage() {
    const isFocused = useIsFocused();
    const isGlassAvailable = isLiquidGlassAvailable();
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);

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

    const handleFormSheetOpen = async () => {
        if (loading) return; // Prevent multiple taps

        setLoading(true);

        try {
            const photo = await cameraRef.current?.takePhoto();

            if (!photo) {
                setLoading(false);
                Alert.alert("Error", "Failed to take photo. Please try again.");
                return;
            }

            console.log('Photo captured:', photo);

            // Extract EXIF data from metadata (iOS uses {Exif} key)
            const exif = (photo.metadata as Record<string, any>)?.['{Exif}'];
            const FNumber = exif?.FNumber;
            const ExposureTime = exif?.ExposureTime;
            const ISOSpeedRatings = exif?.ISOSpeedRatings;

            const phoneIso = Array.isArray(ISOSpeedRatings) ? ISOSpeedRatings[0] : ISOSpeedRatings;
            const ev100 = calculateEV100(FNumber, ExposureTime, phoneIso);

            if (ev100 === undefined || isNaN(ev100)) {
                setLoading(false);
                Alert.alert("Error", "Failed to read camera data. Please try again.");
                return;
            }

            setLoading(false);
            console.log({
                params: {
                    title: `EV ${ev100.toFixed(2)}`,
                    ev: ev100.toFixed(2),
                    aperture: FNumber,
                    shutterSpeed: ExposureTime,
                    iso: phoneIso,
                    image: photo.path?.startsWith('file://') ? photo.path : `file://${photo.path}`
                }
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            router.push({
                pathname: '/(tabs)/light_meter/formsheet',
                params: {
                    title: `EV ${ev100.toFixed(2)}`,
                    ev: ev100.toFixed(2),
                    aperture: FNumber,
                    shutterSpeed: ExposureTime,
                    iso: phoneIso,
                    image: photo.path?.startsWith('file://') ? photo.path : `file://${photo.path}`
                }
            });
        } catch (error) {
            setLoading(false);
            Alert.alert("Error", "Failed to capture image. Please try again.");
        }
    };

    if (!hasPermission) {
        // Camera permissions are not granted
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: PlatformColor('label') }}>We need your permission to show the camera</Text>
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
                            backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('systemBlue')
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
                            backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('systemRed')
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
                <Text style={{ textAlign: 'center', fontFamily: 'LufgaRegular', color: PlatformColor('label') }}>No camera device available</Text>
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
                    isActive={isFocused}
                    zoom={device.neutralZoom}
                    photo={true}
                    onInitialized={() => setIsCameraReady(true)}
                    enableZoomGesture={true}
                    onUIRotationChanged={handleUIRotationChanged}
                />
            </GestureDetector>

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
                    borderRadius: 24,
                    zIndex: 9,
                    backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill'),
                }}>

                    <Pressable style={({ pressed }) => [
                        {
                            transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }],
                        },
                        {
                            padding: 20
                        }
                    ]} onPress={handleFormSheetOpen}>

                        {!loading && <Text
                            style={{
                                color: PlatformColor('label'),
                                fontFamily: 'LufgaRegular',
                                fontSize: 14,
                            }}>Take a reading</Text>}
                        {loading && <ActivityIndicator />}

                    </Pressable>
                </GlassView>
            </Animated.View>

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
        paddingBottom: 100,
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
    }
});