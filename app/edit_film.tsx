import React from 'react';
import { View, SafeAreaView, Text, TextInput, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Touchable } from 'react-native';
import CloseButton from "../components/CloseButton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useLocalSearchParams, router } from 'expo-router';
import IsoPicker from '@/components/IsoPicker';
import * as Haptics from "expo-haptics";
import { type FilmRoll } from '@/utils/types';


export default function Edit_Film() {

    const film = useLocalSearchParams() as unknown as FilmRoll;

    const [form, setForm] = React.useState({
        title: film.title,
        camera: film.camera ?? '',
        iso: Number(film.iso),
        status: film.status,
    });

    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const database = useSQLiteContext();

    const saveFilmToDb = () => {

        if (!form.title.trim() || !form.iso) {
            console.log('Please fill in all fields before saving.');
            alert('Please fill in all fields before saving.');
            return;
        }

        console.log('Saving to database...');
        database.runAsync(`
            UPDATE films SET 
                title = ?, 
                camera = ?, 
                iso = ?,
                status = ?
            WHERE id = ?`, [
            form.title,
            form.camera,
            form.iso,
            form.status,
            Number(film.id)
        ]).then(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back()
        }).catch((error) => {
            console.log('Error saving to database:', error);
        });

    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 48 }}>
                    <CloseButton />
                    <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>Edit Film Roll</Text>
                </View>
                <View style={{ backgroundColor: 'transparent', position: 'relative' }}>
                    <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                        {[
                            { label: 'in-camera', bgColor: '#B3F5C3' },
                            { label: 'developing', bgColor: '#FEF08A' },
                            { label: 'archived', bgColor: '#BDBDBD' }
                        ].map(({ label, bgColor }) => {
                            const isSelected = form.status === label;
                            return (
                                <TouchableOpacity
                                    key={label}
                                    style={[
                                        styles.statusButtons,
                                        isSelected && { backgroundColor: bgColor }
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onChange('status', label)
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.statusButtonText,
                                            isSelected && styles.selectedStatusButtonText
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <View>
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
                    </View>

                    <View style={{ paddingBlock: 12 }}>
                        <IsoPicker defaultValue={form.iso} onValueChange={(iso) => onChange('iso', iso)} />
                    </View>

                    <TouchableOpacity
                        onPress={saveFilmToDb}
                        style={{
                            width: '100%',
                            height: 52,
                            backgroundColor: "#A8A7FF",
                            borderRadius: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: 36,
                            // position: 'absolute',
                            // bottom: 100
                        }}
                    >
                        <Text style={{
                            fontFamily: 'Lufga-Medium',
                            fontSize: 16,
                            color: '#18181B',
                        }}>Save</Text>


                    </TouchableOpacity >
                </View>


            </View>
        </TouchableWithoutFeedback >

    )
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
    selectedStatusButtonText: {
        color: "#000"
    },
    input: {
        height: 52,
        marginBottom: 24,
        borderWidth: 1,
        paddingInline: 16,
        backgroundColor: '#000',
        borderRadius: 20,
        borderColor: '#FFFFFF99',
        color: '#fff',
        fontFamily: 'Lufga-Regular',
        fontSize: 14,
        lineHeight: 20
    },
});