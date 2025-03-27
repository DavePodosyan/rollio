import { View, Text, ImageBackground, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from "@/components/BackButton";
import AddButton from "@/components/AddButton";
import FilmOptionsButton from "@/components/FilmOptionsButton";
import FrameCard from '@/components/FrameCard';
import { useLocalSearchParams } from "expo-router";
import { type FilmRoll } from '@/types/FilmRoll';


export default function Film() {
    const film = useLocalSearchParams() as unknown as FilmRoll;
    const backgroundImage = require("@/assets/images/background.png");
    const insets = useSafeAreaInsets();
    
    const data = [
        {
            id: '1',
            description: 'Evening shot at part, cloudy weather',
            aperture: '2.8',
            shutter: '1/125s',
        },
        {
            id: '2',
            description: 'Bridge silhouette against sunset',
            aperture: '2.8',
            shutter: '1/125s',

        },
        {
            id: '3',
            description: 'Street portrait natural light from shop windows',
            aperture: '2.8',
            shutter: '1/125s',

        },
        {
            id: '4',
            description: 'Coffee shop interior, tungsten lighting',
            aperture: '2.8',
            shutter: '1/125s',

        },
        {
            id: '5',
            description: 'archived',
            aperture: '2.8',
            shutter: '1/125s',

        },
        {
            id: '6',
            description: 'archived',
            aperture: '2.8',
            shutter: '1/125s',

        },
        {
            id: '7',
            description: 'archived',
            aperture: '16',
            shutter: '3s',

        },
        {
            id: '8',
            description: 'archived',
            aperture: '2.8',
            shutter: '1/500s',

        },
        {
            id: '9',
            description: 'archived',
            aperture: '5.6',
            shutter: '1/500s',

        },
        {
            id: '10',
            description: 'archived',
            aperture: '1.4',
            shutter: '1/1000s',

        },
    ];

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
                        data={data}
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