import React from 'react';
import { Platform } from 'react-native';
import { View, ScrollView, KeyboardAvoidingView, Text, TextInput, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import CloseButton from "../components/CloseButton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { type FilmRoll } from '@/utils/types';
import { useLocalSearchParams } from "expo-router";
import AperturePicker from '@/components/AperturePicker';
import IsoPicker from '@/components/IsoPicker';
import ShutterSpeedPicker from '@/components/ShutterSpeedPicker';

export default function Add_Frame() {
    const insets = useSafeAreaInsets();

    const film = useLocalSearchParams() as unknown as FilmRoll;

    const [form, setForm] = React.useState({
        aperture: 5.6,
        shutter_speed: '1/125',
        note: '',
    });

    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const database = useSQLiteContext();

    const saveFrameToDb = () => {

        if (!form.shutter_speed.trim() || !form.aperture) {
            console.log('Please fill in all fields before saving.');
            alert('Please fill in all fields before saving.');
            return;
        }

        console.log('Saving to database...');
        database.runAsync(`
            INSERT INTO frames (
                film_id, 
                aperture, 
                shutter_speed, 
                frame_no, 
                note, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`, [
            film.id,
            form.aperture,
            form.shutter_speed,
            Number(film.frame_count) + 1,
            form.note,
            new Date().toISOString()
        ]).then(() => {
            //update film frame count
            database.runAsync(`UPDATE films SET frame_count = ? WHERE id = ?`, [
                Number(film.frame_count) + 1,
                film.id
            ]);
            router.back()
        }).catch((error) => {
            console.log('Error saving to database:', error);
        }
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
                        <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 24 }}>
                            <CloseButton />
                            <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>Create New Frame</Text>
                        </View>
                        <View style={{ backgroundColor: 'transparent', position: 'relative', flex: 1 }}>
                            <View>
                                <AperturePicker onValueChange={(aperture) => onChange('aperture', aperture)} />
                                <ShutterSpeedPicker onValueChange={(shutter_speed) => onChange('shutter_speed', shutter_speed)} />

                                <TextInput
                                    multiline={true}
                                    numberOfLines={5}
                                    scrollEnabled={true}
                                    maxLength={500}
                                    style={styles.input}
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
                            <TouchableOpacity
                                onPress={saveFrameToDb}
                                style={{
                                    width: '100%',
                                    height: 52,
                                    backgroundColor: "#A8A7FF",
                                    borderRadius: 20,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginTop: 36,
                                    marginBottom: 94
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'Lufga-Medium',
                                    fontSize: 16,
                                    color: '#18181B',
                                }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>

    )
}

const styles = StyleSheet.create({
    input: {
        height: 155,
        marginBottom: 24,
        borderWidth: 1,
        padding: 16,
        backgroundColor: '#000',
        borderRadius: 20,
        borderColor: '#FFFFFF99',
        color: '#fff',
        fontFamily: 'Lufga-Regular',
        fontSize: 16,
        lineHeight: 22
    },
});