import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from "expo-haptics";

import { filmStatuses } from '@/utils/constants';


import { apertureValues, shutterSpeedValues } from '@/utils/constants';

import ApertureIcon from '@/assets/icons/Aperture.svg';
import ShutterSpeedIcon from '@/assets/icons/ShutterSpeed.svg';
import HorizontalNumberPicker from './HorizontalNumberPicker';

import ImageUploader from './ImageUploader';

interface FrameFormProps {
    form: any;
    setForm: (value: any) => void;
    isEdit?: boolean;
    lensSuggestions?: string[];
}

export default function FrameForm({ form, setForm, isEdit = false, lensSuggestions = [] }: FrameFormProps) {
    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const [showLeftFade, setShowLeftFade] = React.useState<{
        [key: string]: boolean;
    }>({
        lens: false,
    });

    const handleSuggestionScroll = (field: string) => (
        event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
        const { contentOffset } = event.nativeEvent;
        setShowLeftFade((prev) => ({
            ...prev,
            [field]: contentOffset.x > 0,
        }));
    };


    return (
        <View style={{ backgroundColor: 'transparent' }}>

            <View>
                <View style={{ marginBottom: lensSuggestions.length > 0 ? 10 : 16 }}>
                    <TextInput
                        maxLength={35}
                        style={styles.input}
                        autoComplete='off'
                        autoCorrect={false}
                        clearButtonMode='never'
                        clearTextOnFocus={false}
                        enablesReturnKeyAutomatically={true}
                        enterKeyHint='done'
                        placeholder="Lens (optional)"
                        placeholderTextColor={'#FFFFFF99'}
                        onChangeText={(lens) => onChange('lens', lens)}
                        value={form.lens}
                    />

                    {lensSuggestions.length > 0 && (
                        <View style={styles.scrollContainer}>
                            <ScrollView
                                horizontal
                                onScroll={handleSuggestionScroll('film')}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionsContent}
                                contentInsetAdjustmentBehavior="always"
                            >
                                {lensSuggestions.map((lens) => (
                                    <TouchableOpacity
                                        key={lens}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                            onChange('lens', lens)
                                        }
                                        }
                                        style={styles.suggestionButton}
                                    >
                                        <Text style={styles.suggestionText}>{lens}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {showLeftFade.lens && (
                                <LinearGradient
                                    colors={['#09090B', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.leftFade}
                                    pointerEvents="none"
                                />
                            )}

                            <LinearGradient
                                colors={['transparent', '#09090B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.fadeOverlay}
                                pointerEvents="none"
                            />
                        </View>
                    )}
                </View>


            </View>

            <View style={{ paddingTop: 12 }}>
                <HorizontalNumberPicker
                    values={apertureValues}
                    defaultValue={form.aperture}
                    label="Aperture"
                    icon={ApertureIcon}
                    formatValue={(value) => {
                        if (value === 0) return "Auto";
                        return `f/${value}`;
                    }}
                    onValueChange={(aperture) => onChange('aperture', aperture)}
                />

                <HorizontalNumberPicker
                    values={shutterSpeedValues}
                    defaultValue={form.shutter_speed}
                    label="Shutter Speed"
                    icon={ShutterSpeedIcon}
                    onValueChange={(shutter_speed) => onChange('shutter_speed', shutter_speed)}
                />

            </View>

            <View style={{ marginTop: 24 }}>
                <TextInput
                    multiline={true}
                    numberOfLines={5}
                    scrollEnabled={true}
                    maxLength={500}
                    style={styles.note}
                    autoComplete='off'
                    autoCorrect={false}
                    clearButtonMode='always'
                    enablesReturnKeyAutomatically={true}
                    enterKeyHint='done'
                    placeholder="Write your notes"
                    placeholderTextColor={'#FFFFFF99'}
                    onChangeText={(text) => onChange('note', text)}
                    value={form.note}
                />
            </View>

            <View style={{ marginBottom: 24 }}>
                <ImageUploader
                    onChange={(image) => onChange('image', image ?? '')}
                    value={form.image}
                />
            </View>


        </View>

    );
}

const styles = StyleSheet.create({
    statusButtons: {
        backgroundColor: '#ffffff0D',
        paddingBlock: 8,
        paddingInline: 16,
        borderRadius: 32,
        marginRight: 8
    },
    statusButtonText: {
        color: '#fff',
        fontFamily: 'LufgaRegular',
        fontSize: 14,
        lineHeight: 20
    },
    input: {
        height: 52,
        // marginBottom: 16,
        borderWidth: 1,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: '#000',
        borderRadius: 20,
        borderColor: '#FFFFFF99',
        color: '#fff',
        fontFamily: 'LufgaRegular',
        fontSize: 14,
        lineHeight: 20
    },
    note: {
        height: 155,
        marginBottom: 24,
        borderWidth: 1,
        padding: 16,
        backgroundColor: '#0B0B0F',
        borderRadius: 20,
        borderColor: '#FFFFFF99',
        color: '#fff',
        fontFamily: 'LufgaRegular',
        fontSize: 16,
        lineHeight: 22
    },
    scrollContainer: {
        position: 'relative',
    },
    suggestionsContent: {
        gap: 8,
        paddingVertical: 6,
        paddingRight: 72,
    },
    suggestionButton: {
        backgroundColor: '#ffffff0D',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    suggestionText: {
        fontFamily: 'LufgaRegular',
        color: '#FFFFFF99',
        fontSize: 12,
    },
    leftFade: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 48,
    },
    fadeOverlay: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 48, // Slightly wider for a better gradient transition
    },
});                        