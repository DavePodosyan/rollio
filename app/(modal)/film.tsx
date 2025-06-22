import React from 'react';
import { Platform } from 'react-native';
import { View, SafeAreaView, Text, TextInput, ScrollView, KeyboardAvoidingView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Touchable } from 'react-native';
import CloseButton from "@/components/CloseButton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';

import * as Haptics from "expo-haptics";
import { type FilmRoll } from '@/utils/types';
import { FilmForm } from '@/components/FilmForm';
import { push } from 'expo-router/build/global-state/routing';


export default function Film_Details() {
    const insets = useSafeAreaInsets();

    const film = useLocalSearchParams() as unknown as FilmRoll;
    const isEdit = Boolean(film?.id);

    const [form, setForm] = React.useState({
        title: film.title ?? '',
        camera: film.camera ?? '',
        iso: film.iso ? Number(film.iso) : 400,
        status: film.status ?? 'in-camera',
        expected_shots: film.expected_shots ? Number(film.expected_shots) : 36,
        push_pull: film.push_pull ? Number(film.push_pull) : 0,
    });

    const [cameraSuggestions, setCameraSuggestions] = React.useState<string[]>([]);
    const [filmSuggestions, setFilmSuggestions] = React.useState<string[]>([]);

    React.useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const cameraResult = await database.getAllAsync<{ camera: string }>(`
                    SELECT DISTINCT camera FROM films WHERE camera IS NOT NULL AND camera != '' ORDER BY id DESC
                `);
                const titleResult = await database.getAllAsync<{ title: string }>(`
                    SELECT DISTINCT title FROM films WHERE title IS NOT NULL AND title != '' ORDER BY id DESC
                `);

                // Extract strings
                const currentTitle = film.title?.trim();
                const currentCamera = film.camera?.trim();

                const cameras = [
                    ...new Set(
                        cameraResult
                            .map(row => row.camera)
                            .filter(camera => camera && camera !== currentCamera)
                    ),
                ];

                const titles = [
                    ...new Set(
                        titleResult
                            .map(row => row.title)
                            .filter(title => title && title !== currentTitle)
                    ),
                ];

                setCameraSuggestions(cameras);
                setFilmSuggestions(titles);
            } catch (error) {
                console.log('Error loading suggestions:', error);
            }
        };

        loadSuggestions();
    }, []);

    const database = useSQLiteContext();

    const saveFilmToDb = async () => {

        if (!form.title.trim() || !form.iso) {
            alert('Please fill in all fields before saving.');
            return;
        }

        try {
            if (isEdit) {
                // Update existing film
                await database.runAsync(`
                    UPDATE films SET 
                        title = ?, 
                        camera = ?, 
                        iso = ?,
                        status = ?,
                        expected_shots = ?,
                        push_pull = ?
                    WHERE id = ?`, [
                    form.title,
                    form.camera,
                    form.iso,
                    form.status,
                    form.expected_shots,
                    form.push_pull,
                    Number(film.id),
                ]);
            } else {
                // Create new film
                await database.runAsync(`
                    INSERT INTO films (title, camera, iso, status, expected_shots, push_pull, frame_count, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    form.title,
                    form.camera,
                    form.iso,
                    form.status,
                    form.expected_shots,
                    form.push_pull,
                    0,
                    new Date().toISOString()
                ]);
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
        } catch (error) {
            console.log('Error saving to database:', error);
        }

    }

    return (


        <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
            <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12 }}>
                <CloseButton />
                <Text style={{ color: '#fff', fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>{isEdit ? 'Edit' : 'Add'} Film Roll</Text>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={insets.top + 24}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
                        keyboardShouldPersistTaps="handled"
                        contentInsetAdjustmentBehavior="always"
                        showsVerticalScrollIndicator={false}
                    >
                        <FilmForm
                            form={form}
                            setForm={setForm}
                            isEdit={isEdit}
                            cameraSuggestions={cameraSuggestions}
                            filmSuggestions={filmSuggestions}
                        />

                        <TouchableOpacity
                            onPress={saveFilmToDb}
                            style={{
                                height: 52,
                                backgroundColor: "#A8A7FF",
                                borderRadius: 20,
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 12,
                            }}
                        >
                            <Text style={{
                                fontFamily: 'LufgaMedium',
                                fontSize: 16,
                                color: '#18181B',
                            }}>Save</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>


        </View>


    )
}

const styles = StyleSheet.create({

});