import { View, Text, ImageBackground, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from "@/components/BackButton";
import AddButton from "@/components/AddButton";
import FilmOptionsButton from "@/components/FilmOptionsButton";
import FrameCard from '@/components/FrameCard';
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { type FilmRoll, type Frame } from '@/utils/types';
import React from 'react';
import { useSQLiteContext } from 'expo-sqlite';

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

    const backgroundImage = require("@/assets/images/background.png");
    const insets = useSafeAreaInsets();

    const height = 38;
    const maxShots = film.frame_count > 36 ? film.frame_count : 36;
    const highlightColor = film.status === 'in-camera' ? '#B3F5C3' : film.status === 'developing' ? '#FEF08A' : '#BDBDBD';

    return (
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
                        <FilmOptionsButton />
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

                <View style={{ flex: 1, paddingTop: 16 }}>
                    <FlatList
                        data={frames}
                        disableIntervalMomentum={true}
                        renderItem={({ item, index }) => <FrameCard item={item} index={index} />}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={{ paddingBottom: 50 }}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

            </View >
        </ImageBackground>


    );
}