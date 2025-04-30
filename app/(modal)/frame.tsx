import React from 'react';

import { Platform } from 'react-native';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TouchableHighlight,
    Keyboard
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from "expo-haptics";
import * as FileSystem from 'expo-file-system';

import { useLocalSearchParams, router } from 'expo-router';

import { Frame } from '@/utils/types';
import CloseButton from "@/components/CloseButton";
import FrameForm from '@/components/FrameForm';

import { saveFrameImage, deleteFrameImage } from '@/utils/filmService';


export default function Frame_Details() {
    const insets = useSafeAreaInsets();

    const props = useLocalSearchParams();
    const film_id = Number(props.film_id as string);
    const frame_no = Number(props.frame_no as string);
    const frame_id = Number(props.frame_id as string);
    const lens = props.lens as string | null;
    const aperture = props.aperture as string;
    const shutter_speed = props.shutter_speed as string;
    const note = props.note as string;
    const image = props.image as string | null;
    const isEdit = Boolean(frame_id);

    const [form, setForm] = React.useState({
        lens: lens || '',
        aperture: Number(aperture) || 5.6,
        shutter_speed: shutter_speed || '1/125',
        note: note || '',
        image: image || null,
    });

    const [lensSuggestions, setLensSuggestions] = React.useState<string[]>([]);

    const [previousImage, setPreviousImage] = React.useState<string | null>(null);

    React.useEffect(() => {
        loadSuggestions();
        if (isEdit) {
            setPreviousImage(image);
        }
    }, []);

    const database = useSQLiteContext();

    const loadSuggestions = async () => {
        try {
            let currentLens = form.lens?.trim();

            if (!isEdit && !currentLens) {
                const [lastFrame] = await database.getAllAsync<Frame>(`
                    SELECT lens FROM frames 
                    WHERE film_id = ? AND frame_no = ? 
                    LIMIT 1
                `, [film_id, frame_no]);

                if (lastFrame?.lens) {
                    currentLens = lastFrame.lens.trim();
                    setForm(prev => ({ ...prev, lens: currentLens }));
                }
            }

            const lensResult = await database.getAllAsync<{ lens: string }>(`
                SELECT DISTINCT lens FROM frames 
                WHERE lens IS NOT NULL AND lens != '' 
                ORDER BY id DESC
            `);

            const lens = [
                ...new Set(
                    lensResult
                        .map(row => row.lens?.trim())
                        .filter(lens => lens && lens !== currentLens)
                ),
            ];

            setLensSuggestions(lens);
        } catch (error) {
            console.log('Error loading lens suggestions:', error);
        }
    };

    const handleImageChange = async () => {
        console.log('Handling image change...');

        if (isEdit && previousImage && form.image !== previousImage) {
            deleteFrameImage(previousImage);
            setPreviousImage(null);
        }

        if (form.image && FileSystem.documentDirectory && !form.image.startsWith(FileSystem.documentDirectory)) {

            return await saveFrameImage(form.image);
        }

        return form.image;

    }

    const saveFrameToDb = async () => {
        console.log('Saving to database...');

        const newImagePath = await handleImageChange();

        if (isEdit) {
            try {

                await database.runAsync(`
                    UPDATE frames SET 
                        lens = ?, 
                        aperture = ?, 
                        shutter_speed = ?, 
                        note = ?,
                        image = ?
                    WHERE id = ?`, [
                    form.lens,
                    form.aperture,
                    form.shutter_speed,
                    form.note,
                    newImagePath,
                    frame_id
                ]).then(() => {
                    console.log('Frame updated successfully');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                });
            } catch (error) {
                console.log('Error saving to database:', error);
            }

        } else {

            try {
                await database.runAsync(`
            INSERT INTO frames (
                film_id, 
                aperture, 
                shutter_speed, 
                frame_no, 
                note, 
                created_at,
                lens,
                image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    film_id,
                    form.aperture,
                    form.shutter_speed,
                    frame_no + 1,
                    form.note,
                    new Date().toISOString(),
                    form.lens,
                    newImagePath
                ]).then(async () => {
                    //update film frame count
                    await database.runAsync(`UPDATE films SET frame_count = ? WHERE id = ?`, [
                        frame_no + 1,
                        film_id
                    ]);
                    console.log('Frame saved successfully');
                });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
            } catch (error) {
                console.log('Error saving to database:', error);
            }
        }

    }

    return (


        <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
            <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12 }}>
                <CloseButton />
                <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>{isEdit ? 'Edit' : 'Add New'} Frame</Text>
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={insets.top + 10}
            >


                <ScrollView
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 32 }}
                    keyboardShouldPersistTaps="handled"
                    contentInsetAdjustmentBehavior="always"
                    showsVerticalScrollIndicator={false}

                >
                    <TouchableHighlight>
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View><FrameForm
                                form={form}
                                setForm={setForm}
                                isEdit={isEdit}
                                lensSuggestions={lensSuggestions}
                            />

                                <TouchableOpacity
                                    onPress={saveFrameToDb}
                                    style={{
                                        height: 52,
                                        backgroundColor: "#A8A7FF",
                                        borderRadius: 20,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginTop: 12,
                                        // marginBottom: 54,
                                    }}
                                >
                                    <Text style={{
                                        fontFamily: 'Lufga-Medium',
                                        fontSize: 16,
                                        color: '#18181B',
                                    }}>Save</Text>
                                </TouchableOpacity></View>

                        </TouchableWithoutFeedback>
                    </TouchableHighlight>
                </ScrollView>


            </KeyboardAvoidingView>


        </View>


    )
}

const styles = StyleSheet.create({

});