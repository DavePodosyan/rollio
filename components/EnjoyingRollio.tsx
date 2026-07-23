import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

export default function EnjoyingRollio() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const textColor = colorScheme === 'dark' ? '#ffffff' : '#100528';

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 2 }}>
            <Link href="/(tabs)/support" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
                        <SymbolView name={{ ios: 'heart.fill', android: 'favorite' }} size={20} tintColor="#ff453a" style={{ marginRight: 4 }} />
                        <Text style={{ color: textColor, fontFamily: 'LufgaRegular', fontSize: 12, lineHeight: 24, textAlign: 'center' }}>
                            {t('enjoyingRollio.cta')}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
}
