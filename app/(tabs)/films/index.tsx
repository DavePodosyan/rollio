import { FlatList, View, Text, StyleSheet, useColorScheme, DeviceEventEmitter, Alert, Platform } from "react-native";
import { useFilms } from "@/hooks/useFilms";
import { Film } from "@/types";
import { router, Stack, useFocusEffect, useNavigation } from "expo-router";
import FilmListItem from "@/components/FilmListItem";
import EnjoyingRollio from "@/components/EnjoyingRollio";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState, useEffect, useRef } from "react";
import Storage from 'expo-sqlite/kv-store';
import { DATA_RESTORED_EVENT } from '@/hooks/useBackup';
import * as StoreReview from 'expo-store-review';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Home() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const { films, loading, error, fetchFilms } = useFilms();
    const [ready, setReady] = useState(false);
    // Horizontal insets are non-zero when iOS places the toolbar/tab rail on a
    // side edge (iPhone Duo inner display, Split View). Scroll views only offset
    // for them; content width has to be padded explicitly.
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setReady(true);
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    // The listener below is registered once, so it reads the current count from a
    // ref instead of the `films` closure (which would always be the initial []).
    const filmCountRef = useRef(0);
    useEffect(() => {
        filmCountRef.current = films.length;
    }, [films]);

    useEffect(() => {
        // Subscribe to the event
        const subscription = DeviceEventEmitter.addListener('added_film', async () => {

            // Don't ask for a review right after the very first roll.
            if (filmCountRef.current < 1) {
                return;
            }

            const lastPrompt = await Storage.getItem('last_review_prompt');
            const now = Date.now();
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            if (!lastPrompt || (now - parseInt(lastPrompt)) > thirtyDays) {

                if (await StoreReview.hasAction()) {
                    await StoreReview.requestReview();
                }

                await Storage.setItem('last_review_prompt', now.toString());
            }

        });

        return () => subscription.remove();
    }, []);

    // A restore replaces every row, so refetch even if this tab is not focused.
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(DATA_RESTORED_EVENT, () => {
            fetchFilms();
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
        <>
            {Platform.OS !== 'android' && (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button icon="plus" onPress={() => router.push('/new-film')} />
                </Stack.Toolbar>
            )}

            <View style={{ flex: 1 }}>

                <LinearGradient
                    // colors={['#09090B', '#100528', '#09090B']}
                    colors={gradientColors}
                    locations={[0.1, 0.4, 0.9]}
                    // dither={false}
                    style={StyleSheet.absoluteFill}
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
                                        {t('shared.noRollsYet.title')}
                                    </Text>
                                    <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                        {t('shared.noRollsYet.subtitle')}
                                    </Text>
                                </View>

                            </View>
                        )}
                        contentInsetAdjustmentBehavior="automatic"
                        scrollEventThrottle={16}

                        contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'android' ? 24 : 20, paddingBottom: 50, paddingLeft: insets.left, paddingRight: insets.right }}
                        refreshing={false}
                        onRefresh={fetchFilms}
                        ListFooterComponent={films && films.length > 0 ? <EnjoyingRollio /> : undefined}

                    />
                </LinearGradient>
            </View >
        </>
    );
}
