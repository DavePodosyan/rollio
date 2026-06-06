import React, { useMemo, useState } from 'react';
import {
    View,
    Image,
    Text,
    StyleSheet,
    Alert,
    Modal,
    Pressable,
    useColorScheme,
    Linking,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
// Make sure this is the beta API or standard API you intend to use
import { Paths, File } from 'expo-file-system';
import { Host, Button, Menu, Divider, Section } from '@expo/ui/swift-ui';

// Icons
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { writeAsync } from '@lodev09/react-native-exify';

interface ImageUploaderProps {
    value: string | null;
    onChange: (uri: string | null) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
    const [previewVisible, setPreviewVisible] = useState(false);
    const colorScheme = useColorScheme();
    const isGlassAvailable = isLiquidGlassAvailable();
    const isAndroid = Platform.OS === 'android';
    const uploadBackgroundColor = isGlassAvailable && !isAndroid
        ? 'transparent'
        : colorScheme === 'dark' ? '#1c1c1e' : '#f6f6fa';
    const uploadBorderColor = colorScheme === 'dark' ? '#2a2a2d' : '#e6e6ee';
    // 1. FIX: Memoize the URI calculation to prevent performance hits on re-renders
    const displayUri = useMemo(() => {
        if (value?.startsWith('frames/rollio_')) {
            const file = new File(Paths.document, value);
            return file.exists ? file.uri : null;
        }
        return value;
    }, [value]);

    const handleUploadPress = () => {
        Alert.alert(
            'Select Image',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Pick from Photos', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const showPermissionAlert = (title: string, message: string, canAskAgain: boolean) => {
        Alert.alert(
            title,
            message,
            [
                ...(canAskAgain ? [] : [{ text: 'Settings', onPress: () => Linking.openSettings() }]),
                { text: 'OK', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                showPermissionAlert(
                    'Camera Permission Required',
                    'Rollio needs camera access to take photos for frames.',
                    permission.canAskAgain
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.PAGE_SHEET,
                quality: 0.7,
                exif: true,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                onChange(result.assets[0].uri);

                try {
                    await writeAsync(result.assets[0].uri, result.assets[0].exif || {});
                } catch (error) {
                    console.warn('Failed to preserve photo EXIF data', error);
                }
            }
        } catch (error) {
            console.error('Failed to take photo', error);
            Alert.alert('Camera Error', 'Rollio could not open the camera. Please try again.');
        }
    };

    const pickFromGallery = async () => {
        try {
            if (!isAndroid) {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                    showPermissionAlert(
                        'Photos Permission Required',
                        'Rollio needs photo access to attach images to frames.',
                        permission.canAskAgain
                    );
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                // quality: 0.7,
                exif: true,
            });

            handleImageResult(result);
        } catch (error) {
            console.error('Failed to pick image', error);
            Alert.alert('Photo Picker Error', 'Rollio could not open your photo library. Please try again.');
        }
    };

    const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled && result.assets?.[0]?.uri) {
            // console.log(result.assets[0].exif);

            onChange(result.assets[0].uri);
        }
    };

    const handleImageSavetoGallery = async () => {
        if (!displayUri) return;

        try {

            const { status } = await MediaLibrary.requestPermissionsAsync(true);

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Rollio needs access to your gallery to save photos.',
                    [{ text: 'Settings', onPress: () => Linking.openSettings() }]);
                return;
            }

            await MediaLibrary.saveToLibraryAsync(displayUri);
            Alert.alert('Success', 'Image saved to your photo gallery.');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to save image: ' + error.message);
        }
    }

    const handleRemove = () => {
        // Optional: Add a confirmation before deleting
        Alert.alert(
            'Remove Image',
            'Are you sure you want to remove the image?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => onChange(null),
                },
            ],
            { cancelable: true }
        );
    };

    const handleImageActionsPress = () => {
        Alert.alert(
            'Image',
            undefined,
            [
                { text: 'Replace', onPress: handleUploadPress },
                { text: 'Save to photos', onPress: handleImageSavetoGallery },
                { text: 'Remove', style: 'destructive', onPress: handleRemove },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    return (
        <>
            <Pressable onPress={displayUri ? () => setPreviewVisible(false) : handleUploadPress}
            >

                <GlassView isInteractive={true} glassEffectStyle='regular'
                    tintColor={colorScheme === 'dark' ? '#09090b6d' : '#ffffff'}
                    style={{
                        padding: 1,
                        borderRadius: 22,
                        height: displayUri ? 250 : 135,
                        marginBottom: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: isAndroid ? 1 : 0,
                        borderColor: uploadBorderColor,
                        backgroundColor: uploadBackgroundColor,
                    }}
                >

                    {displayUri ? (
                        <>
                            <Image
                                source={{ uri: displayUri }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                            <GlassView isInteractive={true} glassEffectStyle='regular'
                                style={[styles.removeButton, {
                                    backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#00000066' : '#00000066'),
                                }]}
                            >
                                {isAndroid ? (
                                    <Pressable
                                        onPress={(event) => {
                                            event.stopPropagation();
                                            handleImageActionsPress();
                                        }}
                                        style={styles.menuButton}
                                        hitSlop={8}
                                    >
                                        <SymbolView name={{ ios: 'ellipsis', android: 'more_horiz' }} size={24} tintColor="#fff" />
                                    </Pressable>
                                ) : (
                                    <Host matchContents>
                                        <Menu
                                            label={
                                                <View style={styles.menuButton} >
                                                    <SymbolView name={{ ios: 'ellipsis', android: 'more_horiz' }} size={24} tintColor="#fff" />
                                                </View>
                                            }
                                        >
                                            <Section>
                                                <Button
                                                    label='Replace'
                                                    systemImage="arrow.trianglehead.2.clockwise.rotate.90"
                                                    onPress={() => handleUploadPress()}
                                                />
                                                <Button
                                                    label='Save to photos'
                                                    systemImage="square.and.arrow.down"
                                                    onPress={() => handleImageSavetoGallery()} />
                                            </Section>
                                            <Divider />
                                            <Button
                                                label='Remove'
                                                systemImage="trash"
                                                role="destructive"
                                                onPress={() => handleRemove()} />
                                        </Menu>
                                    </Host>
                                )}
                            </GlassView>
                        </>
                    ) : (
                        <View style={styles.placeholder}>
                            <SymbolView name={{ ios: 'paperclip', android: 'attach_file' }} size={32} tintColor={colorScheme === 'dark' ? "#ffffff" : "#100528"} style={{ marginBottom: 8 }} />
                            <Text style={[styles.uploadText, { color: colorScheme === 'dark' ? "#ffffff" : "#100528" }]}>Attach image</Text>
                        </View>
                    )}
                </GlassView>
            </Pressable>

            <Modal
                visible={previewVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setPreviewVisible(false)}
                >
                    <Image
                        source={displayUri ? { uri: displayUri } : undefined}
                        style={styles.fullImage}
                    />
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        // borderWidth: 1,
        // borderColor: '#FFFFFF99',
        // borderRadius: 20,
        // borderStyle: 'dashed',
        // backgroundColor: '#0B0B0F',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden', // Ensures image respects border radius
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'LufgaRegular',
        color: '#8E8E93',
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 21,
        objectFit: "cover",
    },
    removeButton: {
        // width: 35,
        // height: 35,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 10,
        right: 10,
        // backgroundColor: 'rgba(0,0,0,0.6)', // 5. FIX: Use rgba for better readability than hex with opacity
        borderRadius: 35,
        zIndex: 10, // Ensures it sits above the image
    },
    menuButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    }
});
