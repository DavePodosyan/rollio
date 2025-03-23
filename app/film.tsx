import { View, Text, ImageBackground, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from "@/components/BackButton";
import AddButton from "@/components/AddButton";
import FilmOptionsButton from "@/components/FilmOptionsButton";
import FrameCard from '@/components/FrameCard';
export default function Film() {

    const insets = useSafeAreaInsets();

    const height = 38;

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

    return (
        <ImageBackground
            source={require("../assets/images/background.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <BackButton />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AddButton />
                        <View style={{ width: 8 }} />
                        <FilmOptionsButton />
                    </View>
                </View>

                <View style={{ paddingTop: 4, paddingLeft: 12, paddingRight: 12, paddingBottom: 8 }}>
                    <Text style={{ color: '#FAFAFA', fontFamily: 'Lufga-Medium', fontSize: 32, lineHeight: 40, marginBottom: 2 }}>Kodak Portra 400</Text>
                    <Text style={{ color: '#FFFFFF99', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, marginBottom: 4 }}>Canon AE-1 - 28 May 2024</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBlock: 12 }}>
                        <Text style={{ backgroundColor: '#ffffff0D', color: '#B3F5C3', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, paddingBlock: 4, paddingInline: 8, borderRadius: 24, marginRight: 8 }}>in-camera</Text>
                        <Text style={{ backgroundColor: '#ffffff0D', color: '#ffffff', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, paddingBlock: 4, paddingInline: 8, borderRadius: 24 }}>ISO: 400</Text>
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
                                width: `${(16 / 36) * 100}%`,
                                minWidth: '20%',
                                height: "100%",
                                backgroundColor: '#B3F5C3',
                                borderRadius: height / 2,
                            }}
                        >
                            <Text style={{ color: '#18181B', fontFamily: 'Lufga-Medium', fontSize: 18, lineHeight: 26, position: 'absolute', left: 10, top: (height - 26) / 2 }}>16/{36}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flex: 1, paddingTop: 16 }}>
                    <FlatList
                        data={data}
                        disableIntervalMomentum={true}
                        renderItem={({ item }) => <FrameCard item={item} />}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 50 }}
                        showsVerticalScrollIndicator={false}
                    />
                </View>

            </View >
        </ImageBackground>


    );
}