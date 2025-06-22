import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { AntDesign } from '@expo/vector-icons'; // for trash icon
import * as ImagePicker from 'expo-image-picker';
import PlusIcon from '@/assets/icons/PlusIcon.svg';
import TrashIcon from '@/assets/icons/TrashIcon.svg';
import * as FileSystem from 'expo-file-system';
export default function ImageUploader({ value, onChange }: { value: string | null, onChange: (uri: string | null) => void }) {
    const [previewVisible, setPreviewVisible] = React.useState(false);
    
    if(value?.startsWith('frames/rollio_')){
        // Convert the relative path to a full file URI
        value = FileSystem.documentDirectory + value;
    }
    const handleUploadPress = () => {
        Alert.alert(
            'Select Image',
            'Choose an option',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Pick from Gallery', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Camera permission is needed to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false, // no cropping
            quality: 0.7,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            console.log('Photo taken:', result.assets);
            onChange(result.assets[0].uri);
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false, // no cropping
            quality: 0.7,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            console.log('Photo taken:', result.assets);
            onChange(result.assets[0].uri);
        }
    };

    const handleRemove = async () => {
        onChange(null);
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.container, { height: value ? 250 : 135, borderWidth: value ? 0 : 1 }]}
                onPress={value ? () => setPreviewVisible(true) : handleUploadPress}
                activeOpacity={0.8}
            >
                {value ? (
                    <>
                        <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
                        <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
                            <TrashIcon width={32} height={32} />
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.placeholder}>
                        <PlusIcon width={32} height={32} style={{ marginBottom: 8 }} />
                        <Text style={styles.uploadText}>Upload image</Text>
                    </View>
                )}
            </TouchableOpacity>
            <Modal
                visible={previewVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: '#000',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={() => setPreviewVisible(false)}
                >
                    <Image
                        source={value ? { uri: value } : undefined}
                        style={{
                            width: '100%',
                            height: '100%',
                            resizeMode: 'contain',
                        }}
                    />
                </Pressable>
            </Modal>
        </>

    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        borderWidth: 1,
        borderColor: '#FFFFFF99',
        borderRadius: 20,
        borderStyle: 'dashed',
        backgroundColor: '#0B0B0F',
        justifyContent: 'center',
        alignItems: 'center',
        // overflow: 'hidden',
        position: 'relative',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#FFFFFF99',
        fontFamily: 'LufgaRegular',
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 20,
    },
    removeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#00000099',
        borderRadius: 16,
        padding: 6,
    },
});