import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, useWindowDimensions, PlatformColor, ActivityIndicator, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { BottomSheet, Button, ColorPicker, ContextMenu, DateTimePicker, Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ISO_OPTIONS } from '@/utils/cameraSettings';
import { router, usePathname, useNavigation } from 'expo-router';
import { frame, glassEffect, padding } from '@expo/ui/swift-ui/modifiers';
import { calculateEV100 } from '@/utils/calculations';

export default function CameraBackgroundPage() {
    const isFocused = useIsFocused();
    const isGlassAvailable = isLiquidGlassAvailable();
    const pathname = usePathname();
    const isCameraNeeded =
        isFocused ||
        (pathname.includes('/light_meter/formsheet') ||
            pathname.includes('/new-frame'));
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    const [permission, requestPermission] = useCameraPermissions();
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {

        if (!cameraRef.current) return;

        if (isFocused) {
            cameraRef.current.resumePreview().catch(() => { });
        } else {
            cameraRef.current.pausePreview().catch(() => { });
        }
    }, [isFocused]);

    const handleFormSheetOpen = async () => {

        // router.push({
        //     pathname: '/(tabs)/light_meter/formsheet',
        //     params: {
        //         title: 'EV 12.34',
        //         ev: 16.99,
        //         aperture: 2.8,
        //         shutterSpeed: 1 / 500,
        //         iso: 200,
        //         image: null,
        //     }
        // });

        // return;


        if (loading) return; // Prevent multiple taps
        cameraRef.current?.pausePreview();
        setLoading(true);
        const image = await cameraRef.current?.takePictureAsync({
            exif: true,
            quality: 0.5
        });
        // console.log('Captured image:', image?.exif);

        const { FNumber, ExposureTime, ISOSpeedRatings } = image?.exif || {};
        const phoneIso = Array.isArray(ISOSpeedRatings) ? ISOSpeedRatings[0] : ISOSpeedRatings;
        const ev100 = calculateEV100(FNumber, ExposureTime, phoneIso);

        if (ev100 === undefined || isNaN(ev100)) {
            setLoading(false);
            Alert.alert("Error", "Failed to read camera data. Please try again.");
            cameraRef.current?.resumePreview();
            return;
        }

        setLoading(false);

        router.push({
            pathname: '/(tabs)/light_meter/formsheet',
            params: {
                title: `EV ${ev100.toFixed(2)}`,
                ev: ev100.toFixed(2),
                aperture: FNumber,
                shutterSpeed: ExposureTime,
                iso: phoneIso,
                image: image?.uri
            }
        });
    }


    if (!permission) {
        // Camera permissions are still loading
        return <View />;

    }


    if (!permission.granted) {
        // Camera permissions are not granted yet
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.text}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!isCameraNeeded) {
        return <View />
    }

    return (
        <View style={styles.container}>


            {/* {(pathname === '/light_meter' || pathname === '/light_meter/formsheet') && ( */}
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                selectedLens="Back Camera"
                ref={cameraRef}
                onCameraReady={() => setIsCameraReady(true)}
            // zoom={0.1}
            />
            {/* <Image
                style={StyleSheet.absoluteFillObject}
                source={{ uri: 'file:///Users/dav/Library/Developer/CoreSimulator/Devices/0005EE76-C888-436B-B82C-DCB345D269A3/data/Containers/Data/Application/A497A3FA-966E-4402-93A9-C453016F1CCF/Library/Caches/ImagePicker/356EA09D-F5F5-487A-BAB3-3229CF8ADB1A.heic' }}
                resizeMode="cover"
            /> */}

            {!isCameraReady && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator />
                </View>
            )}

            <GlassView isInteractive={true} glassEffectStyle='regular' style={{
                borderRadius: 24,
                zIndex: 9,
                backgroundColor: isGlassAvailable ? 'transparent' : PlatformColor('tertiarySystemFill'),
            }} >

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

        </View>
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
    content: {
        flex: 1,
        padding: 20,
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: ' green',
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