import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from "expo-haptics";

import { filmStatuses } from '@/utils/constants';


import { isoValues, expectedShotsValues, pushPullValues } from '@/utils/constants';
import HorizontalNumberPicker from './HorizontalNumberPicker';

interface FilmFormProps {
    form: any;
    setForm: (value: any) => void;
    isEdit?: boolean;
    filmSuggestions?: string[];
    cameraSuggestions?: string[];
}

export function FilmForm({ form, setForm, isEdit = false, filmSuggestions = [], cameraSuggestions = [] }: FilmFormProps) {
    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const [showLeftFade, setShowLeftFade] = React.useState<{
        [key: string]: boolean;
    }>({
        film: false,
        camera: false,
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
            {isEdit && (
                <View style={{ flexDirection: 'row', marginBottom: 24 }}>

                    {Object.entries(filmStatuses).map(([status, { label, color }]) => {
                        const isSelected = form.status === label;
                        return (
                            <TouchableOpacity
                                key={label}
                                style={[
                                    styles.statusButtons,
                                    isSelected && { backgroundColor: color }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onChange('status', status);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.statusButtonText,
                                        isSelected && { color: "#000" }
                                    ]}
                                >
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}

                </View>
            )}


            <View>
                <View style={{ marginBottom: filmSuggestions.length > 0 ? 10 : 16 }}>
                    <TextInput
                        maxLength={35}
                        style={styles.input}
                        autoComplete='off'
                        autoCorrect={false}
                        clearButtonMode='never'
                        clearTextOnFocus={false}
                        enablesReturnKeyAutomatically={true}
                        enterKeyHint='done'
                        placeholder="Film name"
                        placeholderTextColor={'#FFFFFF99'}
                        onChangeText={(text) => onChange('title', text)}
                        value={form.title}
                    />

                    {filmSuggestions.length > 0 && (
                        <View style={styles.scrollContainer}>
                            <ScrollView
                                horizontal
                                onScroll={handleSuggestionScroll('film')}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionsContent}
                                contentInsetAdjustmentBehavior="always"
                            >
                                {filmSuggestions.map((film) => (
                                    <TouchableOpacity
                                        key={film}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                            onChange('title', film)
                                        }
                                        }
                                        style={styles.suggestionButton}
                                    >
                                        <Text style={styles.suggestionText}>{film}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {showLeftFade.film && (
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

                <View style={{ marginBottom: cameraSuggestions.length > 0 ? 10 : 16 }}>
                    <TextInput
                        maxLength={20}
                        style={styles.input}
                        autoComplete='off'
                        autoCorrect={false}
                        clearButtonMode='never'
                        clearTextOnFocus={false}
                        enablesReturnKeyAutomatically={true}
                        enterKeyHint='done'
                        placeholder="Camera (optional)"
                        placeholderTextColor={'#FFFFFF99'}
                        onChangeText={(text) => onChange('camera', text)}
                        value={form.camera}
                    />

                    {cameraSuggestions.length > 0 && (
                        <View style={styles.scrollContainer}>
                            <ScrollView
                                horizontal
                                onScroll={handleSuggestionScroll('camera')}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionsContent}
                            >
                                {cameraSuggestions.map((camera) => (
                                    <TouchableOpacity
                                        key={camera}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                                            onChange('camera', camera)
                                        }
                                        }
                                        style={styles.suggestionButton}
                                    >
                                        <Text style={styles.suggestionText}>{camera}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {showLeftFade.camera && (
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
                    values={isoValues}
                    defaultValue={form.iso}
                    label="ISO"
                    onValueChange={(iso) => onChange('iso', iso)}
                />

                <HorizontalNumberPicker
                    values={pushPullValues}
                    defaultValue={form.push_pull}
                    label="Push/Pull"
                    formatValue={(val) => {
                        if (val === 0) return "Box Speed";
                        if (Number(val) > 0) return `Push +${val}`;
                        return `Pull ${val}`;
                    }}
                    onValueChange={(push_pull) => onChange('push_pull', push_pull)}
                />

                <HorizontalNumberPicker
                    values={expectedShotsValues}
                    defaultValue={form.expected_shots}
                    label="Expected Shots"
                    onValueChange={(expected_shots) => onChange('expected_shots', expected_shots)}
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
        fontFamily: 'Lufga-Regular',
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
        fontFamily: 'Lufga-Regular',
        fontSize: 14,
        lineHeight: 20
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
        fontFamily: 'Lufga-Regular',
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