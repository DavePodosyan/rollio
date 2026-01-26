import { useFilms } from "@/hooks/useFilms";
import { CreateFilmInput, FilmStatus } from "@/types";
import { router, useNavigation, useLocalSearchParams } from "expo-router";
import { Text, View, ScrollView, Animated, Keyboard, Alert, TextInput, FlatList, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import RulerPicker from '@/components/RulerPicker';
import { GlassView } from "expo-glass-effect";
import { useEffect, useState, useRef, use, useCallback, useMemo } from "react";
import { ISO_OPTIONS, PUSH_PULL_OPTIONS, EXPECTED_SHOTS } from "@/utils/cameraSettings";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import { DateTimePicker, Host } from '@expo/ui/swift-ui';
import * as Haptics from "expo-haptics";
import { useFilm } from "@/hooks/useFilm";
import { getStatusColor } from "@/utils/statusColors";
import MySegmentedControl from "@/modules/my-segmented-control";
import { usePreventRemove } from "@react-navigation/native";

export default function NewFilm() {
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const { mode = 'new', id } = useLocalSearchParams<{ mode?: 'edit', id?: string }>();
    const isReady = mode === 'edit' ? useRef(false) : useRef(true);


    const { film, updateFilm, loading: filmLoading } = mode === 'edit' && id ? useFilm(Number(id)) : { film: null };

    const {
        filmNames,
        cameraNames,
        loading,
        fetchUniqueFilmNames,
        fetchUniqueCameraNames,
        addNewFilm,
    } = useFilms(false);

    const [formData, setFormData] = useState<CreateFilmInput>({
        title: "",
        iso: 400,
        camera: null,
        status: FilmStatus.InCamera,
        expected_shots: 36,
        push_pull: 0,
        created_at: new Date().toISOString(),
    });

    const initialDataRef = useRef<CreateFilmInput>({
        title: "",
        iso: 400,
        camera: null,
        status: FilmStatus.InCamera,
        expected_shots: 36,
        push_pull: 0,
        created_at: new Date().toISOString(),
    });

    const hasUnsavedChanges = useCallback(() => {
        if (!initialDataRef.current) return false;

        return JSON.stringify(initialDataRef.current) !== JSON.stringify(formData);
    }, [formData]);

    const [focusedField, setFocusedField] = useState<'title' | 'camera' | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const slideAnim = useRef(new Animated.Value(0)).current; // For smooth slide in/out

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

        // Otherwise, we dispatch the action that was blocked earlier
        // console.log(formData);
        // console.log(initialDataRef.current);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

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

    // Prefill form for edit
    useEffect(() => {
        if (mode === 'edit' && film) {
            setFormData({
                title: film.title,
                camera: film.camera,
                iso: film.iso,
                status: film.status,
                expected_shots: film.expected_shots,
                push_pull: film.push_pull,
                created_at: film.created_at,
            });

            initialDataRef.current = {
                title: film.title,
                camera: film.camera,
                iso: film.iso,
                status: film.status,
                expected_shots: film.expected_shots,
                push_pull: film.push_pull,
                created_at: film.created_at,
            };

            isReady.current = true;

            console.log(formData.status);
            console.log(film.status);


            console.log(statusValues.indexOf(formData.status));

        }
    }, [mode, film]);

    useEffect(() => {
        console.log(formData.status);

    }, [formData]);

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

    const selectSuggestion = (suggestion: string, field: 'title' | 'camera') => {
        setFormData(prev => ({ ...prev, [field]: suggestion }));
        setSuggestions([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        // Blur to hide keyboard if desired
        Keyboard.dismiss();
    };

    const handleSaveFilm = useCallback(async () => {
        const title = formData.title?.trim();
        console.log(formData);

        if (!title) {
            Alert.alert('Missing film name', 'Please enter a name for the film roll.');
            return;
        }


        if (mode === 'edit' && film) {
            await updateFilm(formData);
        } else {
            await addNewFilm({ ...formData, title });
        }

        initialDataRef.current = formData;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [formData, addNewFilm]);

    useEffect(() => {
        fetchUniqueFilmNames();
        fetchUniqueCameraNames();
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: mode === 'new' ? 'Add New Film' : 'Edit Film',
            headerRight: () => (
                <Pressable onPress={handleSaveFilm} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                    <SymbolView name="checkmark" size={22} tintColor="#0091ff" />
                </Pressable>
            ),
        });
    }, [mode, handleSaveFilm]);


    const cameraInputRef = useRef<TextInput>(null);

    const renderCount = useRef(0);
    renderCount.current++;
    useEffect(() => console.log('Render count:', renderCount.current));

    // Memoize these so the array reference stays the same between renders
    const statusValues = useMemo(() => Object.values(FilmStatus), []);
    const statusColors = useMemo(() =>
        Object.values(FilmStatus).map(status => getStatusColor(status as FilmStatus)),
        []);
    const currentStatusIndex = useMemo(() => {
        const index = statusValues.indexOf(formData.status);
        return index === -1 ? 0 : index; // Fallback to 0 if not found
    }, [formData.status, statusValues]);

    // Loading: Show spinner if edit + fetching
    if (filmLoading || loading || !isReady.current) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" />
            </View>
        );

    }


    return (
        <View style={{ flex: 1 }}>

            <ScrollView
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
                            displayedComponents='date'
                            initialDate={formData.created_at}
                            variant="compact"
                            modifiers={
                                [

                                    // padding({ top: 6, bottom: 6, leading: 6, trailing: 6 }),
                                    // cornerRadius(16),
                                    // tint('red'),
                                    // backgroundOverlay({color: 'red'}),
                                    // foregroundStyle('light'),
                                    // glassEffect({
                                    //     // shape: 'rectangle',
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


                {/* text inputs for film and camera name */}

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
                        placeholder="Film Name"
                        placeholderTextColor={"#8E8E93"}
                        value={formData.title}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                        onFocus={() => {
                            setFocusedField('title');
                            setSuggestions(filmNames);
                        }}
                        onBlur={() => {
                            setFocusedField(null);
                            setSuggestions([]);
                        }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        // returnKeyType="next"
                        onSubmitEditing={() => {
                            // Move focus to camera input
                            cameraInputRef.current?.focus();
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
                        maxLength={35}
                        placeholder="Camera (optional)"
                        placeholderTextColor={"#8E8E93"}
                        value={formData.camera || ''}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, camera: text }))}
                        onFocus={() => {
                            setFocusedField('camera');
                            setSuggestions(cameraNames);
                        }}
                        onBlur={() => {
                            setFocusedField(null);
                            setSuggestions([]);
                        }}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        ref={cameraInputRef}

                    />
                </View>

                <View style={{ marginTop: 30, paddingHorizontal: 20, gap: 20 }}>
                    <RulerPicker
                        label="ISO"
                        initial={formData.iso}
                        values={ISO_OPTIONS} // Example push/pull values
                        onChange={(value) => {
                            // put it into your CreateFilmInput form state
                            console.log('Selected ISO:', typeof value);
                            setFormData(prev => ({ ...prev, iso: Number(value) }));
                        }}
                    />
                    <RulerPicker
                        label="Push/Pull"
                        initial={formData.push_pull}
                        values={PUSH_PULL_OPTIONS} // Example push/pull values
                        onChange={(value) => {
                            // put it into your CreateFilmInput form state
                            console.log('Selected Push/Pull:', typeof value);
                            setFormData(prev => ({ ...prev, push_pull: Number(value) }));
                        }}
                    />
                    <RulerPicker
                        label="Expected Shots"
                        initial={formData.expected_shots}
                        values={EXPECTED_SHOTS} // Example expected shots values
                        onChange={(value) => {
                            // put it into your CreateFilmInput form state
                            console.log('Selected Expected Shots:', typeof value);
                            setFormData(prev => ({ ...prev, expected_shots: Number(value) }));
                        }}
                    />
                </View>

                {/* {mode === 'edit' && ( */}
                <View style={{ padding: 18, marginTop: 30, paddingHorizontal: 20, gap: 12 }}>
                    <MySegmentedControl
                        // key={`status-control-${formData.status}`}
                        style={{ width: '100%', height: 40 }}
                        values={statusValues}
                        activeColors={statusColors}
                        selectedIndex={currentStatusIndex}
                        onValueChange={({ nativeEvent: { index } }) => {                            
                            setFormData(prev => ({ ...prev, status: Object.values(FilmStatus)[index] as FilmStatus }));
                        }}
                        activeTextColor="#ffffff"              // Text inside the bubble
                        inactiveTextColor={colorScheme === 'dark' ? 'white' : '#100528'}            // Text outside the bubble
                    // segmentBackgroundColor="white"
                    />
                </View>

                {/* )} */}

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
                    <LinearGradient
                        colors={
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
                        }}
                    >
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
                                        glassEffectStyle="regular"
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
