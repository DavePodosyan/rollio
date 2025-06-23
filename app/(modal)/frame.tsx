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
    Keyboard,
    Alert
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from "expo-haptics";
import * as FileSystem from 'expo-file-system';

import { useLocalSearchParams, router } from 'expo-router';

import { Frame } from '@/utils/types';
import CloseButton from "@/components/CloseButton";
import FrameForm from '@/components/FrameForm';

import { saveFrameImage, deleteFrameImage, deleteFrame } from '@/utils/filmService';


export default function Frame_Details() {
    const insets = useSafeAreaInsets();
    const props = useLocalSearchParams();
    const film_id = Number(props.film_id as string);
    const frame_no = Number(props.frame_no as string);
    const frame_id = Number(props.frame_id as string);
    const lens = props.lens as string | null;
    const aperture = props.aperture as string;
    const shutter_speed = props.shutter_speed as string;
    const created_at = props.created_at as string | null;
    const note = props.note as string;
    const image = props.image as string | null;
    const isEdit = Boolean(frame_id);

    const [loading, setLoading] = React.useState(true);
    const [isLastFrame, setIsLastFrame] = React.useState(false);

    const [form, setForm] = React.useState({
        lens: lens || '',
        aperture: Number(aperture) || 0,
        shutter_speed: shutter_speed || 'Auto',
        note: note || '',
        image: image || null,
    });

    const [lensSuggestions, setLensSuggestions] = React.useState<string[]>([]);

    const [previousImage, setPreviousImage] = React.useState<string | null>(null);

    React.useEffect(() => {
        loadSuggestions();
        if (isEdit) {
            setPreviousImage(image);
            checkIfLastFrame();
        }
    }, []);

    const database = useSQLiteContext();

    const loadSuggestions = async () => {
        try {
            let currentLens = form.lens?.trim();

            if (!isEdit && !currentLens) {
                const [lastFrame] = await database.getAllAsync<Frame>(`
                    SELECT lens,aperture,shutter_speed FROM frames 
                    WHERE film_id = ? AND frame_no = ? 
                    LIMIT 1
                `, [film_id, frame_no]);

                console.log('Last frame:', lastFrame);


                if (lastFrame) {
                    const updates: any = {};
                    if (lastFrame.lens) {
                        updates.lens = lastFrame.lens.trim();
                    }
                    if (lastFrame.aperture) {
                        updates.aperture = Number(lastFrame.aperture);
                    }
                    if (lastFrame.shutter_speed) {
                        updates.shutter_speed = lastFrame.shutter_speed;
                    }

                    if (Object.keys(updates).length > 0) {
                        setForm(prev => ({ ...prev, ...updates }));
                    }
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
        } finally {
            setLoading(false);
        }
    };

    const checkIfLastFrame = async () => {
        const result = await database.getFirstAsync<{ max_frame_no: number }>(
            `SELECT MAX(frame_no) as max_frame_no FROM frames WHERE film_id = ?`,
            [film_id]
        );

        if (result?.max_frame_no === frame_no) {
            setIsLastFrame(true);
        } else {
            setIsLastFrame(false);
        }
    };

    const handleImageChange = async () => {
        console.log('Handling image change...');

        if (isEdit && previousImage && form.image !== previousImage) {
            deleteFrameImage(previousImage);
            setPreviousImage(null);
        }

        if (form.image && !form.image.startsWith('frames/rollio_')) {

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

    const handleFrameDelete = async () => {


        Alert.alert(
            'Delete Frame #' + frame_no,
            'Are you sure you want to delete this frame?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteFrame(database, frame_id).then(() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        });
                    },
                },
            ],
            { cancelable: true }
        );


    }

    return (


        <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
            <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12 }}>
                <CloseButton />
                <View>
                    <Text style={{ color: '#fff', fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>{isEdit ? 'Edit' : 'Add New'} Frame {isEdit && '#' + frame_no}</Text>
                    {created_at && (
                        <Text style={{ color: '#fff', fontFamily: 'LufgaMedium', fontSize: 12, lineHeight: 16, marginLeft: 10 }}>
                            {new Intl.DateTimeFormat('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                            }).format(new Date(created_at))}
                        </Text>
                    )}

                </View>
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
                            <View>
                                {!loading && (
                                    <>
                                        <FrameForm
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
                                            }}
                                        >
                                            <Text style={{
                                                fontFamily: 'LufgaMedium',
                                                fontSize: 16,
                                                color: '#18181B',
                                            }}>Save</Text>
                                        </TouchableOpacity>
                                        {isEdit && isLastFrame &&(
                                            <TouchableOpacity
                                                onPress={handleFrameDelete}
                                                style={{
                                                    marginTop: 16,
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Text style={{ color: '#EF4444', fontFamily: 'LufgaMedium', fontSize: 14 }}>
                                                    Delete Frame
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>

                        </TouchableWithoutFeedback>
                    </TouchableHighlight>
                </ScrollView>


            </KeyboardAvoidingView>


        </View>


    )
}

const styles = StyleSheet.create({

});