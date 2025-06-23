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
import * as Haptics from "expo-haptics";
import * as FileSystem from 'expo-file-system';

import { useLocalSearchParams, router } from 'expo-router';

import { Frame } from '@/utils/types';
import CloseButton from "@/components/CloseButton";


import { saveFrameImage, deleteFrameImage } from '@/utils/filmService';
import FrameDetails from '@/components/FrameDetails';


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

    const [form, setForm] = React.useState({
        lens: lens || '',
        aperture: Number(aperture) || 0,
        shutter_speed: shutter_speed || 'Auto',
        note: note || '',
        image: image ? FileSystem.documentDirectory + image : null,
    });

    const [lensSuggestions, setLensSuggestions] = React.useState<string[]>([]);

    React.useEffect(() => {
        // loadSuggestions();
    }, []);



    return (


        <View style={{ flex: 1, backgroundColor: '#09090B', paddingTop: 12, paddingLeft: 12, paddingRight: 12 }}>
            <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 0, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 12 }}>
                <CloseButton />
                <View>
                    <Text style={{ color: '#fff', fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 24, marginLeft: 10 }}>Frame #{frame_no}</Text>
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
                                <FrameDetails
                                    lens={form.lens}
                                    aperture={form.aperture}
                                    shutter_speed={form.shutter_speed}
                                    note={form.note}
                                    image={form.image}
                                />
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