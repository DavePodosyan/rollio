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
import { useTranslation } from 'react-i18next';

interface ImageUploaderProps {
    value: string | null;
    onChange: (uri: string | null) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
    const { t } = useTranslation();
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
            t('imageUploader.selectImage.title'),
            t('imageUploader.selectImage.message'),
            [
                { text: t('imageUploader.selectImage.takePhoto'), onPress: takePhoto },
                { text: t('imageUploader.selectImage.pickFromPhotos'), onPress: pickFromGallery },
                { text: t('shared.cancel'), style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const showPermissionAlert = (title: string, message: string, canAskAgain: boolean) => {
        Alert.alert(
            title,
            message,
            [
                ...(canAskAgain ? [] : [{ text: t('shared.settings'), onPress: () => Linking.openSettings() }]),
                { text: t('shared.ok'), style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const takePhoto = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                showPermissionAlert(
                    t('imageUploader.cameraPermission.title'),
                    t('imageUploader.cameraPermission.message'),
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
            Alert.alert(t('imageUploader.cameraError.title'), t('imageUploader.cameraError.message'));
        }
    };

    const pickFromGallery = async () => {
        try {
            if (!isAndroid) {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                    showPermissionAlert(
                        t('imageUploader.photosPermission.title'),
                        t('imageUploader.photosPermission.message'),
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
            Alert.alert(t('imageUploader.photoPickerError.title'), t('imageUploader.photoPickerError.message'));
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
                    t('imageUploader.galleryPermission.title'),
                    t('imageUploader.galleryPermission.message'),
                    [{ text: t('shared.settings'), onPress: () => Linking.openSettings() }]);
                return;
            }

            await MediaLibrary.saveToLibraryAsync(displayUri);
            Alert.alert(t('shared.success'), t('imageUploader.saveSuccessMessage'));
        } catch (error: any) {
            Alert.alert(t('shared.error'), t('imageUploader.saveImageError', { message: error.message }));
        }
    }

    const handleRemove = () => {
        // Optional: Add a confirmation before deleting
        Alert.alert(
            t('imageUploader.removeImage.title'),
            t('imageUploader.removeImage.message'),
            [
                { text: t('shared.cancel'), style: 'cancel' },
                {
                    text: t('imageUploader.removeImage.confirm'),
                    style: 'destructive',
                    onPress: () => onChange(null),
                },
            ],
            { cancelable: true }
        );
    };

    const handleImageActionsPress = () => {
        Alert.alert(
            t('imageUploader.imageMenu.title'),
            undefined,
            [
                { text: t('imageUploader.imageMenu.replace'), onPress: handleUploadPress },
                { text: t('imageUploader.imageMenu.saveToPhotos'), onPress: handleImageSavetoGallery },
                { text: t('imageUploader.removeImage.confirm'), style: 'destructive', onPress: handleRemove },
                { text: t('shared.cancel'), style: 'cancel' },
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
                                                    label={t('imageUploader.imageMenu.replace')}
                                                    systemImage="arrow.trianglehead.2.clockwise.rotate.90"
                                                    onPress={() => handleUploadPress()}
                                                />
                                                <Button
                                                    label={t('imageUploader.imageMenu.saveToPhotos')}
                                                    systemImage="square.and.arrow.down"
                                                    onPress={() => handleImageSavetoGallery()} />
                                            </Section>
                                            <Divider />
                                            <Button
                                                label={t('imageUploader.removeImage.confirm')}
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
                            <Text style={[styles.uploadText, { color: colorScheme === 'dark' ? "#ffffff" : "#100528" }]}>{t('imageUploader.attachImage')}</Text>
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
