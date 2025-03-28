import React from 'react';
import { View, SafeAreaView, Text, TextInput, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from 'react-native';
import CloseButton from "../components/CloseButton";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';

export default function Add_Film() {

    const [form, setForm] = React.useState({
        title: '',
        camera: '',
        iso: '',
    });

    const onChange = (key: string, value: string | number) => {
        setForm({ ...form, [key]: value });
    };

    const database = useSQLiteContext();

    const saveFilmToDb = () => {

        if (!form.title.trim() || !form.camera.trim() || !form.iso.trim()) {
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
            router.back()
        }).catch((error) => {
            console.log('Error saving to database:', error);
        }
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 24 }}>
                    <CloseButton />
                    <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>Add Film Roll</Text>
                </View>
                <View style={{ backgroundColor: 'transparent', position: 'relative' }}>
                    <View>
                        <TextInput
                            style={styles.input}
                            autoComplete='off'
                            autoCorrect={false}
                            clearButtonMode='always'
                            clearTextOnFocus={true}
                            enablesReturnKeyAutomatically={true}
                            enterKeyHint='done'
                            placeholder="Film name"
                            placeholderTextColor={'#FFFFFF99'}
                            onChangeText={(text) => onChange('title', text)}
                            value={form.title}
                        />
                        <TextInput
                            style={styles.input}
                            autoComplete='off'
                            autoCorrect={false}
                            clearButtonMode='always'
                            clearTextOnFocus={true}
                            enablesReturnKeyAutomatically={true}
                            enterKeyHint='done'
                            placeholder="Camera name"
                            placeholderTextColor={'#FFFFFF99'}
                            onChangeText={(text) => onChange('camera', text)}
                            value={form.camera}
                        />
                        <TextInput
                            style={styles.input}
                            autoComplete='off'
                            autoCorrect={false}
                            clearButtonMode='always'
                            clearTextOnFocus={true}
                            enablesReturnKeyAutomatically={true}
                            enterKeyHint='done'
                            placeholder="ISO"
                            keyboardType='number-pad'
                            placeholderTextColor={'#FFFFFF99'}
                            onChangeText={(text) => onChange('iso', text)}
                            value={form.iso}
                        />
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
        paddingInline: 20,
        backgroundColor: '#000',
        borderRadius: 20,
        borderColor: '#fff',
        color: '#fff',
        fontFamily: 'Lufga-Regular',
        fontSize: 16,
        lineHeight: 22
    },
});