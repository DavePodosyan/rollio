import { View, Text, ImageBackground, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from "@/components/BackButton";
import AddButton from "@/components/AddButton";
import FilmOptionsButton from "@/components/FilmOptionsButton";
import FrameCard from '@/components/FrameCard';
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { type FilmRoll, type Frame } from '@/utils/types';
import React, { useRef, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { BottomSheetDefaultBackdropProps } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetBackdrop/types';
import * as Haptics from "expo-haptics";

export default function Film() {
    const database = useSQLiteContext();
    const [film, setFilm] = React.useState<FilmRoll>(useLocalSearchParams() as unknown as FilmRoll);
    const [frames, setFrames] = React.useState<Frame[]>([]);

    const loadFilm = async () => {
        const result = await database.getFirstAsync<FilmRoll>('SELECT * FROM films WHERE id = ?', [film.id]);

        if (result) {
            setFilm(result);
        }
    }

    const loadFrames = async () => {
        const results = await database.getAllAsync<Frame>('SELECT * FROM frames WHERE film_id = ?', [film.id]);
        setFrames(results);

    }

    useFocusEffect(React.useCallback(() => {
        loadFilm();
        loadFrames();
    }, []));

    const onFilmDelete = () => {
        database.runAsync(`DELETE FROM films WHERE id = ?`, [film.id]).then(() => {
            bottomSheetRef.current?.close()
            router.back()
        });
    }

    const changeFilmStatus = (status: string) => {
        const completed_at = status === 'archived' ? new Date().toISOString() : null;
        database.runAsync(`UPDATE films SET status = ?, completed_at = ? WHERE id = ?`, [status, completed_at, film.id]).then(() => {
            loadFilm();
            bottomSheetRef.current?.close()
        });
    }

    const backgroundImage = require("@/assets/images/background.png");
    const insets = useSafeAreaInsets();

    const height = 38;
    const maxShots = film.frame_count > 36 ? film.frame_count : 36;
    const highlightColor = film.status === 'in-camera' ? '#B3F5C3' : film.status === 'developing' ? '#FEF08A' : '#BDBDBD';

    const [screenBlur, setScreenBlur] = React.useState(false);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const openBottomSheet = () => {
        bottomSheetRef.current?.collapse();
    }

    const handleSheetChanges = useCallback((index: number) => {

    }, []);

    const handleSheetAnimate = useCallback((fromIndex: number, toIndex: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (toIndex === -1) {
            setScreenBlur(false);
        } else {
            setScreenBlur(true);
        }
    }, []);

    const renderBackdrop = useCallback(
        (props: BottomSheetDefaultBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={1}
                pressBehavior="close"
                opacity={0.85}

            >
            </BottomSheetBackdrop>
        ),
        []
    );
    return (
        <GestureHandlerRootView>
            <ImageBackground
                source={backgroundImage}
                style={{ flex: 1 }}
                resizeMode="cover"
            >
                <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                    <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <BackButton />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {film.status === 'in-camera' && <AddButton href={{
                                pathname: '/add_frame',
                                params: film,
                            }} />}
                            <View style={{ width: 8 }} />
                            <FilmOptionsButton onPress={openBottomSheet} />
                        </View>
                    </View>

                    <View style={{ paddingTop: 4, paddingLeft: 12, paddingRight: 12, paddingBottom: 8 }}>
                        <Text style={{ color: '#FAFAFA', fontFamily: 'Lufga-Medium', fontSize: 32, lineHeight: 40, marginBottom: 2 }}>{film.title}</Text>
                        <Text style={{ color: '#FFFFFF99', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, marginBottom: 4 }}>{film.camera} - {new Date(film.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        })}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBlock: 12 }}>
                            <Text style={{ backgroundColor: '#ffffff0D', color: highlightColor, fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, paddingBlock: 4, paddingInline: 8, borderRadius: 24, marginRight: 8 }}>{film.status}</Text>
                            <Text style={{ backgroundColor: '#ffffff0D', color: '#ffffff', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, paddingBlock: 4, paddingInline: 8, borderRadius: 24 }}>ISO: {film.iso}</Text>
                        </View>
                        <View
                            style={{
                                width: "100%",
                                height: height,
                                backgroundColor: '#ffffff0D',
                                borderRadius: height / 2,
                                overflow: "hidden",
                            }}
                        >
                            <View
                                style={{
                                    width: `${(film.frame_count / 36) * 100}%`,
                                    minWidth: '20%',
                                    height: "100%",
                                    backgroundColor: highlightColor,
                                    borderRadius: height / 2,
                                }}
                            >
                                <Text style={{ color: '#18181B', fontFamily: 'Lufga-Medium', fontSize: 18, lineHeight: 26, position: 'absolute', left: 10, top: (height - 26) / 2 }}>{film.frame_count}/{maxShots}</Text>
                            </View>
                        </View>

                    </View>

                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={frames}
                            disableIntervalMomentum={true}
                            renderItem={({ item, index }) => <FrameCard item={item} index={index} />}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={{ paddingTop: 16, paddingBottom: 50 }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                    <BlurView
                        intensity={4}
                        style={{
                            display: screenBlur ? 'flex' : 'none',
                            flex: 1,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />
                </View >

                <BottomSheet
                    ref={bottomSheetRef}
                    onChange={handleSheetChanges}
                    onAnimate={handleSheetAnimate}
                    enablePanDownToClose={true}
                    animateOnMount={true}
                    index={-1}
                    snapPoints={['25%', '40%']}
                    backgroundStyle={{
                        backgroundColor: '#17161B',
                    }}
                    handleIndicatorStyle={{
                        backgroundColor: '#2F2F31',
                        width: 36,
                    }}
                    backdropComponent={renderBackdrop}
                    enableDynamicSizing={false}
                >
                    <BottomSheetView style={{
                        flex: 1,
                        paddingInline: 20,
                        paddingBlock: 16,
                    }}>
                        <TouchableOpacity><Text style={styles.options}>Edit</Text></TouchableOpacity>

                        {film.status !== 'archived' && (
                            <TouchableOpacity
                                onPress={() =>
                                    film.status === 'in-camera'
                                        ? changeFilmStatus('developing')
                                        : changeFilmStatus('archived')
                                }
                            >
                                <Text style={styles.options}>
                                    {film.status === 'in-camera' ? 'Mark as Developing' : 'Mark as Archived'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={onFilmDelete}><Text style={[styles.options, { color: '#DC3E42' }]}>Delete</Text></TouchableOpacity>
                    </BottomSheetView>
                </BottomSheet>


            </ImageBackground>

        </GestureHandlerRootView>


    );
}

const styles = StyleSheet.create({
    options: {
        color: '#D0D0D1',
        fontFamily: 'Lufga-Medium',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    }
});