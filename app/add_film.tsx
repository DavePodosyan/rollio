import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ImageBackground } from 'react-native';
import BackButton from "../components/BackButton";


export default function Add_Film() {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#09090B', paddingLeft: 12, paddingRight: 12 }}>
                <View style={{ paddingTop: 12, paddingBottom: 24, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <BackButton />
                    <Text style={{ color: '#fff', fontFamily: 'Lufga-Medium', fontSize: 32, lineHeight: 40, marginLeft: 20 }}>Add Film Roll</Text>
                </View>


                <Text>Test</Text>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}