
import { CreateFrameInput } from "@/types";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import { Text, View, ScrollView, Animated, Keyboard, Alert, TextInput, FlatList, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import RulerPicker from '@/components/RulerPicker';
import { GlassView } from "expo-glass-effect";
import { useEffect, useState, useRef, useCallback } from "react";
import { SHUTTER_SPEED_OPTIONS, APERTURE_OPTIONS } from "@/utils/cameraSettings";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import { DateTimePicker, Host } from '@expo/ui/swift-ui';
import * as Haptics from "expo-haptics";
import { useFrame } from "@/hooks/useFrame";
import { useFrames } from "@/hooks/useFrames";
import ImageUploader from "@/components/ImageUploader";
import { saveFrameImage } from "@/utils/ImageService";
import { usePreventRemove } from "@react-navigation/native";
import FilmSettingsFromPhoto from "@/components/FilmSettingsFromPhoto";


export default function NewFrame() {
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const { mode = 'new', filmId, iso, frameCount, frameId, aperture: initialAperture, shutterSpeed: initialShutter, image } = useLocalSearchParams<{
        mode?: 'edit',
        filmId: string,
        iso: string,
        frameCount?: string,
        frameId?: string,
        aperture?: string,
        shutterSpeed?: string,
        image?: string,
    }>();
    const isReady = mode === 'edit' ? useRef(false) : useRef(true);

    const { addFrame, loading, lensNames, fetchUniqueLensNames, prefillFromPreviousFrame } = useFrames(Number(filmId));

    const { frame, loading: frameLoading, updateFrame, destroyFrame } = mode === 'edit' ? useFrame(Number(frameId)) : {};

    const previousFrameData = prefillFromPreviousFrame();
    const hasPrefilled = useRef(false);

    const scrollViewRef = useRef<ScrollView>(null);
    console.log(previousFrameData);

    // Use aperture/shutterSpeed from light meter if provided, otherwise default to Auto
    const [formData, setFormData] = useState<CreateFrameInput>({
        film_id: Number(filmId),
        aperture: initialAperture || "Auto",
        shutter_speed: initialShutter || "Auto",
        frame_no: frameCount ? Number(frameCount) + 1 : 1,
        note: null,
        created_at: new Date().toISOString(),
        lens: null,
        image: image || null,
    });

    const initialDataRef = useRef<CreateFrameInput>({
        film_id: Number(filmId),
        aperture: initialAperture || "Auto",
        shutter_speed: initialShutter || "Auto",
        frame_no: frameCount ? Number(frameCount) + 1 : 1,
        note: null,
        created_at: new Date().toISOString(),
        lens: null,
        image: image || null,
    });

    const hasUnsavedChanges = useCallback(() => {
        if (!initialDataRef.current) return false;

        return JSON.stringify(initialDataRef.current) !== JSON.stringify(formData);
    }, [formData]);


    // useEffect(() => {

    //     const hasChanged = JSON.stringify(initialDataRef.current) !== JSON.stringify(formData);

    //     console.log('has changed', hasChanged);

    //     console.log(initialDataRef.current, formData);




    //     navigation.getParent()?.setOptions({
    //         gestureEnabled: !hasChanged
    //     });

    // }, [navigation, formData]);


    usePreventRemove(hasUnsavedChanges(), ({ data }) => {
        // ActionSheetIOS.showActionSheetWithOptions({
        //     // title: 'Discard changes?',
        //     message: 'Are you sure you want to discard your changes?',
        //     options: ['Discard Changes'],

        //     destructiveButtonIndex: 0,
        // }, (buttonIndex) => {
        //     if (buttonIndex === 0) {
        //         // Do nothing, stay on the screen
        //         navigation.dispatch(data.action);
        //         return;
        //     }
        // });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Otherwise, we dispatch the action that was blocked earlier
        Alert.alert(
            'Discard changes?',
            'You have unsaved changes. Discard them and leave the screen?',
            [
                { text: "Don't leave", style: 'cancel', onPress: () => { } },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.dispatch(data.action),
                },
            ],
            {
                cancelable: true,
            }
        );
    });

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        if (mode === 'new' && Object.keys(previousFrameData).length > 0 && !hasPrefilled.current) {
            // If we have light meter values (aperture/shutterSpeed from params), preserve them
            // Only prefill other fields from previous frame
            const hasLightMeterAperture = initialAperture && initialAperture !== "Auto";
            const hasLightMeterShutter = initialShutter && initialShutter !== "Auto";

            setFormData(prev => ({
                ...prev,
                ...previousFrameData,
                // Preserve light meter values if they were provided
                ...(hasLightMeterAperture && { aperture: initialAperture }),
                ...(hasLightMeterShutter && { shutter_speed: initialShutter }),
                ...(image && { image }), // Preserve image from light meter if provided
            }));

            hasPrefilled.current = true;

            initialDataRef.current = {
                ...formData,
                ...previousFrameData,
                ...(hasLightMeterAperture && { aperture: initialAperture }),
                ...(hasLightMeterShutter && { shutter_speed: initialShutter }),
                ...(image && { image }), // Preserve image from light meter if provided
            };

            console.log('Prefilled form data with previous frame data:', initialDataRef.current);
        }
    }, [previousFrameData, mode, initialAperture, initialShutter, image]);

    const [focusedField, setFocusedField] = useState<'lens' | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current; // For smooth slide in/out

    // Prefill form for edit
    useEffect(() => {
        if (mode === 'edit' && frame) {
            setFormData({
                film_id: frame.film_id,
                aperture: frame.aperture,
                shutter_speed: frame.shutter_speed,
                frame_no: frame.frame_no,
                note: frame.note,
                created_at: frame.created_at,
                lens: frame.lens,
                image: frame.image,
            });

            initialDataRef.current = {
                film_id: frame.film_id,
                aperture: frame.aperture,
                shutter_speed: frame.shutter_speed,
                frame_no: frame.frame_no,
                note: frame.note,
                created_at: frame.created_at,
                lens: frame.lens,
                image: frame.image,
            };

            isReady.current = true;
        }
    }, [mode, frame]);

    // useEffect(() => {
    //     // Only update if we are in 'new' mode and not loading anymore
    //     if (mode === 'new' && !loading) {
    //         const nextNumber = getNextFrameNumber();
    //         console.log("Auto-setting frame number to:", nextNumber);

    //         setFormData(prev => ({
    //             ...prev,
    //             frame_no: nextNumber
    //         }));
    //     }
    // }, [loading, mode]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e.endCoordinates.height);
            console.log('show keyboard');

        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            console.log('hide keyboard');

            // setSuggestions([]);
        });

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, []);

    const selectSuggestion = (suggestion: string, field: 'lens') => {
        setFormData(prev => ({ ...prev, [field]: suggestion }));
        setSuggestions([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        // Blur to hide keyboard if desired
        Keyboard.dismiss();
    };

    const handleSaveFrame = useCallback(async () => {

        try {
            let dataToSave = { ...formData };

            if (dataToSave.image && dataToSave.image.startsWith('file://')) {
                //upload image to storage and get path 
                await saveFrameImage(dataToSave.image).then((path) => {
                    dataToSave.image = path;
                    console.log('image paate:', path);

                });
            }

            console.log(dataToSave);


            if (mode === 'edit' && frame) {
                await updateFrame!(dataToSave);
            } else {
                await addFrame(dataToSave);
            }

            initialDataRef.current = formData;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();

        } catch (error) {
            console.error("Failed to save frame", error);
            Alert.alert("Error", "Could not save the frame.");
        }

    }, [formData, addFrame]);

    useEffect(() => {
        fetchUniqueLensNames();
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: mode === 'new' ? 'Add New Frame' : 'Edit Frame',
            headerRight: () => (
                <Pressable onPress={handleSaveFrame} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                    <SymbolView name="checkmark" size={22} tintColor="#0091ff" />
                </Pressable>
            ),
        });
    }, [mode, handleSaveFrame]);


    const notesInputRef = useRef<TextInput>(null);

    const renderCount = useRef(0);
    renderCount.current++;
    useEffect(() => console.log('Render count:', renderCount.current));

    // Loading: Show spinner if edit + fetching
    if (loading || !isReady.current) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
            </View>
        );

    }


    return (
        <View style={{ flex: 1 }}>

            <ScrollView
                ref={scrollViewRef}
                style={{ padding: 0, flex: 1 }}
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="automatic"

            >

                <View style={{ alignItems: 'center', justifyContent: 'center', borderRadius: 32 }}>
                    {/* <GlassView isInteractive={true} glassEffectStyle="regular" style={{  overflow: 'hidden' }}> */}
                    <Host matchContents style={{}}>
                        <DateTimePicker
                            // title="Date"
                            // color="white"
                            onDateSelected={date => {
                                //since we store dates as iso string, initialdate includes time, but when picking date they can't set time, so we need to set time to 00:00:00
                                // date.setHours(0, 0, 0, 0);
                                setFormData(prev => ({ ...prev, created_at: date.toISOString() }));
                                // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            displayedComponents='dateAndTime'
                            initialDate={formData.created_at}
                            variant="compact"
                            modifiers={
                                [
                                    // cornerRadius(16),
                                    // background('red'),

                                    // tint('red'),
                                    // padding({ top: 6, bottom: 6, leading: 6, trailing: 6 }),
                                    // backgroundOverlay({color: 'red'}),
                                    // foregroundStyle('light'),
                                    // background('red'),
                                    // glassEffect({
                                    //     glass: {
                                    //         variant: 'regular',
                                    //         interactive: true,
                                    //         tint: colorScheme === 'dark' ? '#09090b6d' : 'transparent',
                                    //     }

                                    // }),
                                ]
                            }
                        />
                    </Host>
                    {/* </GlassView> */}
                </View>


                <View style={{ marginTop: 30, paddingHorizontal: 20, gap: 20 }}>
                    <RulerPicker
                        label="Aperture"
                        initial={formData.aperture}
                        values={APERTURE_OPTIONS} // Example push/pull values
                        onChange={(value) => {
                            console.log('Selected aperture:', value);
                            setFormData(prev => ({ ...prev, aperture: String(value) }));
                        }}
                    />
                    <RulerPicker
                        label="Shutter Speed"
                        initial={formData.shutter_speed}
                        values={SHUTTER_SPEED_OPTIONS} // Example push/pull values
                        onChange={(value) => {
                            console.log('Selected shutter speed:', value);
                            setFormData(prev => ({ ...prev, shutter_speed: String(value) }));
                        }}
                    />
                </View>

                <View style={{ marginTop: 30 }}>
                    <TextInput
                        style={{
                            // borderWidth: 1,
                            // borderColor: '#ddd',
                            padding: 20,
                            // borderRadius: 8,
                            fontSize: 16,
                            color: colorScheme === 'dark' ? '#fff' : '#100528',
                            fontFamily: 'LufgaMedium',
                        }}
                        maxLength={35}
                        placeholder="Lens (optional)"
                        placeholderTextColor={"#8E8E93"}
                        value={formData.lens || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, lens: text }))}
                        onFocus={() => {
                            setFocusedField('lens');
                            setSuggestions(lensNames);
                        }}
                        onBlur={() => {
                            setFocusedField(null);
                            setSuggestions([]);
                        }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                            // Move focus to camera input
                            notesInputRef.current?.focus();
                        }}
                    />
                </View>

                <View>
                    <TextInput
                        style={{
                            // borderWidth: 1,
                            // borderColor: '#ddd',
                            padding: 20,
                            // borderRadius: 8,
                            fontSize: 16,
                            color: colorScheme === 'dark' ? '#fff' : '#100528',
                            fontFamily: 'LufgaMedium',
                        }}
                        // maxLength={35}
                        placeholder="Note (optional)"
                        placeholderTextColor={"#8E8E93"}
                        value={formData.note || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
                        autoCapitalize="sentences"
                        autoCorrect={true}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        multiline={true}
                        submitBehavior="submit"
                        numberOfLines={3}
                        ref={notesInputRef}

                    />
                </View>
                <View style={{ padding: 20 }}>
                    <ImageUploader value={formData.image} onChange={(image) => {
                        console.log(image)
                        setFormData(prev => ({ ...prev, image }))
                    }
                    } />
                </View>
                {(!initialAperture && !initialShutter) && (
                    <View style={{ padding: 20 }}>
                        <FilmSettingsFromPhoto
                            imageUri={formData.image}
                            filmIso={Number(iso)}
                            // filmIso={fi}
                            onApplySettings={(settings) => {
                                console.log(settings);

                                setFormData(prev => ({
                                    ...prev,
                                    aperture: String(settings.aperture),
                                    shutter_speed: settings.shutter_speed,
                                }));

                                // scroll to top to show the updated settings all the way at top
                                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                            }}
                        />
                    </View>
                )}


            </ScrollView>

            {keyboardVisible && suggestions.length > 0 && (

                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: keyboardHeight,
                        left: 0,
                        right: 0,
                        maxHeight: 200,
                        // backgroundColor: '#1c1c1eb8',
                    }}
                >
                    <LinearGradient colors={
                        colorScheme === 'dark'
                            ? ['transparent', '#1c1c1e']
                            : ['transparent', '#00000030',]
                    }
                        locations={[0, 1]}
                        style={{
                            flex: 1,
                            borderRadius: 20,
                            paddingTop: 36,
                            paddingBottom: 8,
                        }}>
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item}
                            horizontal={true}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4 }}
                            keyboardShouldPersistTaps="always"
                            scrollEventThrottle={16}
                            renderItem={({ item }) => (
                                <View style={{ padding: 0 }}>
                                    <GlassView
                                        isInteractive={true}
                                        glassEffectStyle="clear"
                                        tintColor="#f0f0f0"
                                        style={{
                                            borderRadius: 32,
                                            marginLeft: 4,
                                            marginRight: 8,
                                        }}
                                    >
                                        <Pressable
                                            style={{
                                                borderRadius: 32,
                                                paddingLeft: 12,
                                                paddingRight: 12,
                                                paddingTop: 6,
                                                paddingBottom: 6,
                                            }}
                                            onPress={() => selectSuggestion(item, focusedField!)}
                                        >
                                            <Text style={{ fontSize: 12, color: '#000', fontFamily: 'LufgaRegular' }}>{item}</Text>
                                        </Pressable>
                                    </GlassView>
                                </View>
                            )}
                        />
                    </LinearGradient>
                </Animated.View>

            )}
        </View>
    );
}
