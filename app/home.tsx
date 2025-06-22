import React from 'react';
import { View, Text, RefreshControl, ScrollView, FlatList, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddButton from "@/components/AddButton";
import FilmCard from '@/components/FilmCard';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteFilmWithFrameImages } from '@/utils/filmService';
import { useFocusEffect } from 'expo-router';
import { type FilmRoll } from '@/utils/types';
import * as Haptics from "expo-haptics";
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home() {
    const database = useSQLiteContext();
    const [data, setData] = React.useState<FilmRoll[]>([]);
    const [refreshing, setRefreshing] = React.useState(false);

    const loadData = async () => {
        const results = await database.getAllAsync<FilmRoll>('SELECT * FROM films ORDER BY created_at DESC');
        setData(results);
    }

    useFocusEffect(React.useCallback(() => {
        console.log('Loading data...');
        maybeAskForReview();
        loadData();
    }, []));

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => {
            loadData();
            setRefreshing(false);
        }, 850);
    }, []);

    const insets = useSafeAreaInsets();

    const deleteItem = (id: number) => {
        deleteFilmWithFrameImages(database, id).then(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            loadData();
        });
    }

    const maybeAskForReview = async () => {
        try {
            const hasAsked = await AsyncStorage.getItem('has_asked_for_review');

            if (hasAsked === 'true') return;

            const isAvailable = await StoreReview.isAvailableAsync();
            if (!isAvailable) return;

            const rolls = await database.getAllAsync<{ id: number }>(
                'SELECT id FROM films'
            );

            if (rolls.length > 2) {
                StoreReview.requestReview();
                await AsyncStorage.setItem('has_asked_for_review', 'true');
            }
        } catch (error) {
            console.log('Review prompt check failed:', error);
        }
    };

    return (
        <ImageBackground
            source={require("../assets/images/background.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#FAFAFA', fontFamily: 'LufgaMedium', fontSize: 48, lineHeight: 56 }}>Film Rolls</Text>
                    <AddButton href='/(modal)/film' />
                    {/* <AddButton href='/test' /> */}
                </View>

                <View style={{ flex: 1, paddingTop: 4 }}>
                    {data.length === 0 ? (
                        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ color: "#fff", fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                You don't have any film rolls yet.
                            </Text>
                            <Text style={{ color: "#fff", fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                Click the + button to add one.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id.toString()}
                            disableIntervalMomentum={true}
                            renderItem={({ item, index }) => <FilmCard item={item} index={index} onDelete={() => deleteItem(item.id)} />}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF99" />}
                            contentContainerStyle={{ paddingBottom: 50 }}
                        />
                    )}


                </View>

            </View>

        </ImageBackground>

    );
}