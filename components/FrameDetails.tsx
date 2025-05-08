import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from "expo-haptics";

import { filmStatuses } from '@/utils/constants';


import { apertureValues, shutterSpeedValues } from '@/utils/constants';

import ApertureIcon from '@/assets/icons/Aperture.svg';
import ShutterSpeedIcon from '@/assets/icons/ShutterSpeed.svg';


import ImageUploader from './ImageUploader';

interface FrameDetailsProps {
    aperture: string;
    shutter_speed: string;
    note: string | null;
    image: string | null;
}

export default function FrameDetails({ aperture, shutter_speed, note, image }: FrameDetailsProps) {

    return (
        <View>

            <View style={styles.itemContainer}>
                <View style={styles.iconLabelContainer}>
                    <View style={styles.iconContainer}>
                        <ApertureIcon />
                    </View>
                    <Text style={styles.iconLabel}>Aperture</Text>
                </View>
                <Text style={[styles.iconLabel, styles.iconValue]}>f/{aperture}</Text>
            </View>

            <View style={styles.itemContainer}>
                <View style={styles.iconLabelContainer}>
                    <View style={styles.iconContainer}>
                        <ShutterSpeedIcon />
                    </View>
                    <Text style={styles.iconLabel}>Shutter Speed</Text>
                </View>
                <Text style={[styles.iconLabel, styles.iconValue]}>{shutter_speed}</Text>
            </View>

            {note && (
                <View style={{ marginTop: 12, marginBottom: 24 }}>
                    <Text style={styles.iconLabel}>Note:</Text>
                    <Text style={[styles.iconLabel, { fontSize: 15 }]}>{note}</Text>
                </View>
            )}


            {image && (
                <TouchableOpacity>
                    <Image source={{ uri: image }} style={{ width: '100%', height: 250, borderRadius: 12, marginTop: 12 }} />
                </TouchableOpacity>
            )}






        </View>

    );
}

const styles = StyleSheet.create({
    itemContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    iconLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%'
    },
    iconContainer: {
        width: 30,
        height: 30,
        backgroundColor: '#ffffff0D',
        borderRadius: 12,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconLabel: {
        fontFamily: 'Lufga-Regular',
        color: '#fff',
        fontSize: 14,
        lineHeight: 24,
    },
    iconValue: {
        width: '50%',
        color: '#A8A7FF'
    }
});                        