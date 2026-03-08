import { View, Text, TouchableOpacity, useColorScheme, PlatformColor } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function EnjoyingRollio() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 2 }}>
            <Link href="/(tabs)/support" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
                        <SymbolView name="heart.fill" size={20} tintColor={PlatformColor('systemRed')} style={{ marginRight: 4 }} />
                        <Text style={{ color: PlatformColor('label'), fontFamily: 'LufgaRegular', fontSize: 12, lineHeight: 24, textAlign: 'center' }}>
                            Enjoying Rollio?
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
}