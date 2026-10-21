import { useFilms } from "@/hooks/useFilms";
import { CreateFilmInput, FilmStatus } from "@/types";
import { router, useNavigation, useLocalSearchParams, Stack } from "expo-router";
import { Text, View, ScrollView, Animated, Keyboard, Alert, TextInput, FlatList, Pressable, ActivityIndicator, useColorScheme, DeviceEventEmitter, Platform, PlatformColor, type ViewInstance, type TextInputInstance } from "react-native";
import RulerPicker from '@/components/RulerPicker';
import AdaptiveDatePicker from '@/components/AdaptiveDatePicker';
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ISO_OPTIONS, PUSH_PULL_OPTIONS, EXPECTED_SHOTS } from "@/utils/cameraSettings";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFilm } from "@/hooks/useFilm";
import { getStatusColor } from "@/utils/statusColors";
import { getFilmStatusLabel } from "@/utils/filmStatusLabels";
import MySegmentedControl from "@/modules/my-segmented-control";
import { usePreventRemove } from "expo-router/react-navigation";
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useTranslation } from "react-i18next";
import { useSideRailInsets } from '@/hooks/useSideRailInsets';

export default function NewFilm() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isAndroid = Platform.OS === 'android';
    const isGlassAvailable = isLiquidGlassAvailable();
    const suggestionPillBackground = isGlassAvailable && !isAndroid
        ? 'transparent'
        : colorScheme === 'dark' ? 'rgba(44, 44, 46, 0.96)' : 'rgba(255, 255, 255, 0.96)';
    const suggestionPillTextColor = colorScheme === 'dark' ? '#fff' : '#100528';
    const glassSuggestionFallbackColor = colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7';
    const navigation = useNavigation();
    const { mode = 'new', id } = useLocalSearchParams<{ mode?: 'edit', id?: string }>();
    const isReady = useRef(mode !== 'edit');

    const { film, updateFilm, loading: filmLoading } = useFilm(mode === 'edit' && id ? Number(id) : null);

    const {
        filmNames,
        cameraNames,
        loading,
        fetchUniqueFilmNames,
        fetchUniqueCameraNames,
        addNewFilm,
    } = useFilms(false);

    // One object for both the form and its "unchanged" baseline, so the timestamp
    // matches and an untouched form never counts as edited.
    const [initialFilm] = useState<CreateFilmInput>(() => ({
        title: "",
        iso: 400,
        camera: null,
        status: FilmStatus.InCamera,
        expected_shots: 36,
        push_pull: 0,
        created_at: new Date().toISOString(),
    }));
    const [formData, setFormData] = useState<CreateFilmInput>(initialFilm);
    const initialDataRef = useRef<CreateFilmInput>(initialFilm);

    const hasUnsavedChanges = useCallback(() => {
        if (!initialDataRef.current) return false;

        return JSON.stringify(initialDataRef.current) !== JSON.stringify(formData);
    }, [formData]);

    const [focusedField, setFocusedField] = useState<'title' | 'camera' | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const rootViewRef = useRef<ViewInstance>(null);
    const sideRail = useSideRailInsets(rootViewRef);
    const slideAnim = useRef(new Animated.Value(0)).current; // For smooth slide in/out

    const disablePrevention = usePreventRemove(hasUnsavedChanges(), ({ repeat }) => {
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
            t('shared.discardChanges.title'),
            t('shared.discardChanges.message'),
            [
                { text: t('shared.discardChanges.dontLeave'), style: 'cancel', onPress: () => { } },
                {
                    text: t('shared.discardChanges.discard'),
                    style: 'destructive',
                    onPress: repeat,
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
        }
    }, [mode, film]);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardVisible(true);

            if (Platform.OS === 'android') {
                rootViewRef.current?.measureInWindow((_x, pageY, _width, height) => {
                    const rootBottom = pageY + height;
                    setKeyboardHeight(Math.max(0, rootBottom - e.endCoordinates.screenY));
                });
            } else {
                setKeyboardHeight(e.endCoordinates.height);
            }
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
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

        if (!title) {
            Alert.alert(t('newFilm.missingName.title'), t('newFilm.missingName.message'));
            return;
        }


        try {
            if (mode === 'edit' && film) {
                await updateFilm(formData);
            } else {
                await addNewFilm({ ...formData, title });
            }
        } catch (error) {
            console.error('Failed to save film', error);
            Alert.alert(t('shared.error'), t('newFilm.saveErrorMessage'));
            return;
        }

        initialDataRef.current = formData;
        disablePrevention();
        DeviceEventEmitter.emit('added_film', { mode });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();

    }, [formData, mode, film, updateFilm, addNewFilm, disablePrevention, t]);

    useEffect(() => {
        fetchUniqueFilmNames();
        fetchUniqueCameraNames();
    }, []);

    useEffect(() => {
        navigation.setOptions({
            title: mode === 'new' ? t('newFilm.addTitle') : t('newFilm.editTitle'),
            headerLeft: isAndroid ? () => (
                <Pressable
                    onPress={() => router.back()}
                    style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                >
                    <MaterialIcons
                        name="close"
                        size={24}
                        color={colorScheme === 'dark' ? '#fff' : '#100528'}
                    />
                </Pressable>
            ) : undefined,
            headerRight: isAndroid ? () => (
                <Pressable
                    onPress={handleSaveFilm}
                    style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                >
                    <MaterialIcons
                        name="check"
                        size={24}
                        color='#0A84FF'
                    />
                </Pressable>
            ) : undefined,
        });
    }, [mode, handleSaveFilm, isAndroid, colorScheme]);


    const cameraInputRef = useRef<TextInputInstance>(null);

    // Memoize these so the array reference stays the same between renders
    const statusValues = useMemo(() => Object.values(FilmStatus), []);
    // Display-only labels for the segmented control; selection is still tracked
    // by index against statusValues (the enum codes), never by this array's text.
    const statusLabels = useMemo(() => statusValues.map(getFilmStatusLabel), [statusValues]);
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
        <>
            {!isAndroid && (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button icon="xmark" onPress={() => router.back()} />
                    </Stack.Toolbar>
                    <Stack.Toolbar placement="right">
                        <Stack.Toolbar.Button variant="prominent" tintColor={PlatformColor('systemBlue')} icon="checkmark" onPress={handleSaveFilm} />
                    </Stack.Toolbar>
                </>
            )}

            <View ref={rootViewRef} onLayout={sideRail.onLayout} style={{ flex: 1 }}>

                <ScrollView
                    style={{ padding: 0, flex: 1 }}
                    keyboardShouldPersistTaps="handled"
                    contentInsetAdjustmentBehavior="automatic"
                    // Pad the content, not the scroll view: the inner content stays clear of the
                    // side toolbar rail on iPhone Duo / Split View while the scroll view (and its
                    // header edge effect) still spans the full width.
                    contentContainerStyle={{ paddingLeft: sideRail.left, paddingRight: sideRail.right }}
                >

                    <View style={{ alignItems: 'center', justifyContent: 'center', borderRadius: 32 }}>
                        <AdaptiveDatePicker
                            value={formData.created_at}
                            onChange={(created_at) => setFormData(prev => ({ ...prev, created_at }))}
                            mode="date"
                        />
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
                            placeholder={t('newFilm.filmNamePlaceholder')}
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
                            placeholder={t('newFilm.cameraPlaceholder')}
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
                            label={t('shared.iso')}
                            valueKind="iso"
                            initial={formData.iso}
                            values={ISO_OPTIONS} // Example push/pull values
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, iso: Number(value) }));
                            }}
                        />
                        <RulerPicker
                            label={t('newFilm.pushPullLabel')}
                            valueKind="plain"
                            initial={formData.push_pull}
                            values={PUSH_PULL_OPTIONS} // Example push/pull values
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, push_pull: Number(value) }));
                            }}
                        />
                        <RulerPicker
                            label={t('newFilm.expectedShotsLabel')}
                            valueKind="plain"
                            initial={formData.expected_shots}
                            values={EXPECTED_SHOTS} // Example expected shots values
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, expected_shots: Number(value) }));
                            }}
                        />
                    </View>

                    {/* {mode === 'edit' && ( */}
                    <View style={{ padding: 18, marginTop: 30, paddingHorizontal: 20, gap: 12 }}>
                        <MySegmentedControl
                            // key={`status-control-${formData.status}`}
                            style={{ width: '100%', height: 40 }}
                            values={statusLabels}
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
                            height: isAndroid ? 136 : undefined,
                            maxHeight: isAndroid ? undefined : 200,
                            zIndex: isAndroid ? 20 : undefined,
                            elevation: isAndroid ? 20 : undefined,
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
                                justifyContent: isAndroid ? 'flex-end' : undefined,
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
                                contentContainerStyle={isAndroid ? { paddingTop: 10, paddingHorizontal: 4 } : { paddingVertical: 8, paddingHorizontal: 4 }}
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
                                                overflow: isAndroid ? 'hidden' : undefined,
                                                backgroundColor: glassSuggestionFallbackColor,
                                            }}
                                        >
                                            <Pressable
                                                style={isAndroid ? ({ pressed }) => ({
                                                    borderRadius: 32,
                                                    backgroundColor: suggestionPillBackground,
                                                    paddingLeft: 12,
                                                    paddingRight: 12,
                                                    paddingTop: 6,
                                                    paddingBottom: 6,
                                                    opacity: pressed ? 0.78 : 1,
                                                    transform: [{ scale: pressed ? 0.96 : 1 }],
                                                }) : {
                                                    borderRadius: 32,
                                                    paddingLeft: 12,
                                                    paddingRight: 12,
                                                    paddingTop: 6,
                                                    paddingBottom: 6,
                                                }}
                                                android_ripple={isAndroid ? {
                                                    color: colorScheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(16,5,40,0.08)',
                                                    borderless: false,
                                                } : undefined}
                                                onPress={() => selectSuggestion(item, focusedField!)}
                                            >
                                                <Text style={{ fontSize: 12, color: isAndroid ? suggestionPillTextColor : '#000', fontFamily: 'LufgaRegular' }}>{item}</Text>
                                            </Pressable>
                                        </GlassView>
                                    </View>
                                )}
                            />
                        </LinearGradient>
                    </Animated.View>

                )}
            </View>
        </>
    );
}
