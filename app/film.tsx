import { View, Text, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackButton from "@/components/BackButton";
import AddButton from "@/components/AddButton";
export default function Film() {

    const insets = useSafeAreaInsets();

    return (
        <ImageBackground
            source={require("../assets/images/background.png")}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <BackButton />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AddButton />
                        <View style={{ width: 8 }} />
                        <AddButton />
                    </View>
                </View>

                <View style={{ flex: 1, paddingTop: 4 }}>

                </View>

            </View >
        </ImageBackground>


    );
}