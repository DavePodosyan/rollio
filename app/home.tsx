import React from 'react';
import { View, Text, RefreshControl, ScrollView, FlatList, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddButton from "@/components/AddButton";
import FilmCard from '@/components/FilmCard';
import { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
export default function Home() {
    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const insets = useSafeAreaInsets();

    const data = [
        {
            id: '1',
            status: 'in-camera',
            camera: 'Canon AE-1',
            date: '28 May 2024',
            film: 'Kodak Portra 400',
            shots: 15,

        },
        {
            id: '2',
            status: 'developing',
            camera: 'Canon AE-1',
            date: '28 May 2024',
            film: 'Kodak Portra 400',
            shots: 26,

        },
        {
            id: '3',
            status: 'developing',
            camera: 'Canon AE-1',
            date: '28 May 2024',
            film: 'Kodak Portra 800',
            shots: 38,

        },
        {
            id: '4',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '5',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '6',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '7',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '8',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '9',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 36,

        },
        {
            id: '10',
            status: 'archived',
            camera: 'Canon A-1',
            date: '28 May 2021',
            film: 'Kodak Gold 200',
            shots: 45,

        },
    ];

    return (
        <ImageBackground
            source={require("../assets/images/background.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#FAFAFA', fontFamily: 'Lufga-Medium', fontSize: 48, lineHeight: 56 }}>Film Rolls</Text>
                    <AddButton />
                </View>

                <View style={{ flex: 1, paddingTop: 4 }}>
                    <FlatList
                        data={data}
                        disableIntervalMomentum={true}
                        renderItem={({ item }) => <FilmCard item={item} />}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF99" />}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 50 }}
                    />
                </View>

            </View>

        </ImageBackground>

    );
}