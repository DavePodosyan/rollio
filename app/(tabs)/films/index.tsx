import { FlatList, View, Text, StyleSheet, useColorScheme, DeviceEventEmitter } from "react-native";
import { useFilms } from "@/hooks/useFilms";
import { Film } from "@/types";
import { router, useFocusEffect, useNavigation } from "expo-router";
import FilmListItem from "@/components/FilmListItem";
import EnjoyingRollio from "@/components/EnjoyingRollio";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

export default function Home() {
    const colorScheme = useColorScheme();
    const { films, loading, error, fetchFilms } = useFilms();
    const [ready, setReady] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setReady(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        // Subscribe to the event
        const subscription = DeviceEventEmitter.addListener('added_film', async () => {

            if (films.length < 1) {
                return;
            }

            const lastPrompt = await AsyncStorage.getItem('last_review_prompt');
            const now = Date.now();
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            if (!lastPrompt || (now - parseInt(lastPrompt)) > thirtyDays) {

                if (await StoreReview.hasAction()) {
                    await StoreReview.requestReview();
                }

                await AsyncStorage.setItem('last_review_prompt', now.toString());
            }

        });

        return () => subscription.remove();
    }, []);

    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    useFocusEffect(useCallback(() => {
        fetchFilms();
    }, []));

    const renderItem = useCallback(({ item, index }: { item: Film; index: number }) => (
        <FilmListItem film={item} index={index} onPress={() => router.push('/')} />
    ), [router]);

    const keyExtractor = useCallback((item: Film) => String(item.id), []);

    // console.log('Films:', films, 'Loading:', loading, 'Error:', error);

    if (!ready) {
        return null;
    }

    return (
        <View style={{ flex: 1 }}>

            <LinearGradient
                // colors={['#09090B', '#100528', '#09090B']}
                colors={gradientColors}
                locations={[0.1, 0.4, 0.9]}
                // dither={false}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} // Optional: start from top-left
                end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
            >
                <FlatList
                    data={films}
                    key={films.length.toString()} // Force re-render when length changes
                    keyExtractor={keyExtractor}
                    initialNumToRender={10}
                    maxToRenderPerBatch={8}
                    windowSize={8}
                    removeClippedSubviews={true}
                    // disableIntervalMomentum={true}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={() => (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                    You don't have any film rolls yet.
                                </Text>
                                <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                    Click the + button to add one.
                                </Text>
                            </View>

                        </View>
                    )}
                    contentInsetAdjustmentBehavior="automatic"
                    scrollEventThrottle={16}

                    contentContainerStyle={{ paddingTop: 20, paddingBottom: 50 }}
                    refreshing={false}
                    onRefresh={fetchFilms}
                    ListFooterComponent={films && films.length > 0 ? <EnjoyingRollio /> : null}

                />
            </LinearGradient>
        </View >
    );
}