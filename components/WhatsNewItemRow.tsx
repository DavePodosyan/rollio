import { Platform, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useTranslation } from 'react-i18next';

import type { WhatsNewItem } from '@/services/whatsNew';

/** One announcement: icon, title and a line of text. Used by the sheet and the history page. */
export default function WhatsNewItemRow({ item }: { item: WhatsNewItem }) {
    const { t } = useTranslation();
    const dark = useColorScheme() === 'dark';
    const textColor = dark ? '#ffffff' : '#100528';
    const accent = dark ? '#A583EF' : '#39128F';

    // Keys come from the release list as plain strings; the typed `t` wants literals.
    const tk = (key: string) => t(key as never);

    return (
        <View style={styles.row}>
            <View style={styles.icon}>
                {Platform.OS === 'ios'
                    ? <SymbolView name={item.sf as never} size={34} tintColor={accent} />
                    : <MaterialIcons name={item.md as never} size={32} color={accent} />}
            </View>
            <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: textColor }]}>{tk(item.titleKey)}</Text>
                <Text style={[styles.rowBody, { color: textColor }]}>{tk(item.bodyKey)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 26 },
    icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1 },
    rowTitle: { fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 22, marginBottom: 3 },
    rowBody: { fontFamily: 'LufgaRegular', fontSize: 14.5, lineHeight: 20, opacity: 0.6 },
});
