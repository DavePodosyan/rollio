import React from 'react';
import { View, SafeAreaView, Text, TextInput, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import CloseButton from "../components/CloseButton";
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import HorizontalPicker from '@/components/AperturePicker';
import IsoPicker from '@/components/IsoPicker';
import * as Haptics from "expo-haptics";

export default function Add_Film() {
    const insets = useSafeAreaInsets();
    
    const [form, setForm] = React.useState({
        title: '',
        camera: '',
        iso: 400,
    });

    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const database = useSQLiteContext();

    const saveFilmToDb = () => {
        console.log(form.iso);

        if (!form.title.trim() || !form.iso) {
            console.log('Please fill in all fields before saving.');
            alert('Please fill in all fields before saving.');
            return;
        }

        console.log('Saving to database...');
        database.runAsync(`
            INSERT INTO films (
                title, 
                camera, 
                iso, 
                status, 
                frame_count, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`, [
            form.title,
            form.camera,
            form.iso,
            'in-camera',
            0,
            new Date().toISOString()
        ]).then(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back()
        }).catch((error) => {
            console.log('Error saving to database:', error);
        }
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{flex: 1, maxWidth: 550, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
                <View style={{paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 48 }}>
                    <CloseButton />
                    <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>Add Film Roll</Text>
                </View>
                <View style={{ backgroundColor: 'transparent', position: 'relative' }}>
                    <View>
                        <TextInput
                            maxLength={35}
                            style={styles.input}
                            autoComplete='off'
                            autoCorrect={false}
                            clearButtonMode='always'
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
                            clearButtonMode='always'
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
                        <IsoPicker onValueChange={(iso) => onChange('iso', iso)} />
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
        </TouchableWithoutFeedback>

    )
}

const styles = StyleSheet.create({
    input: {
        height: 52,
        marginBottom: 24,
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
});