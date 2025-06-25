import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import HeartShineIcon from '@/assets/icons/HeartShine.svg';

export default function EnjoyingRollio() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 6 }}>
            <Link href="/support" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
                        <HeartShineIcon width={24} height={24} style={{ marginRight: 6 }} />
                        <Text style={{ color: '#FFFFFF99', fontFamily: 'LufgaRegular', fontSize: 12, lineHeight: 24, textAlign: 'center' }}>
                            Enjoying Rollio?
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
}