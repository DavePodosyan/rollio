import { useEffect, useMemo } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Application from 'expo-application';
import Storage from 'expo-sqlite/kv-store';
import { SymbolView } from 'expo-symbols';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { useTranslation } from 'react-i18next';

import { WHATS_NEW_KEY, itemsSince, type WhatsNewItem } from '@/services/whatsNew';

export default function WhatsNewScreen() {
    const { since } = useLocalSearchParams<{ since?: string }>();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const dark = colorScheme === 'dark';
    const version = Application.nativeApplicationVersion ?? '';
    const items = useMemo(() => itemsSince(since ?? null, version), [since, version]);

    // Shown once: opening the sheet counts as having seen it.
    useEffect(() => {
        if (version) {
            Storage.setItem(WHATS_NEW_KEY, version).catch((err) => console.warn("Could not record What's New:", err));
        }
    }, [version]);

    // Keys come from the release list as plain strings; the typed `t` wants literals.
    const tk = (key: string) => t(key as never);

    const textColor = dark ? '#ffffff' : '#100528';
    const accent = dark ? '#A583EF' : '#39128F';

    const renderIcon = (item: WhatsNewItem) =>
        Platform.OS === 'ios'
            ? <SymbolView name={item.sf as never} size={34} tintColor={accent} />
            : <MaterialIcons name={item.md as never} size={32} color={accent} />;

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Image source={require('@/assets/images/splash-icon-light.png')} style={styles.appIcon} />
                <Text style={[styles.title, { color: textColor }]}>{t('whatsNew.title')}</Text>
                <Text style={[styles.version, { color: textColor }]}>{t('whatsNew.version', { version })}</Text>

                {items.map((item) => (
                    <View key={item.titleKey} style={styles.row}>
                        <View style={styles.icon}>{renderIcon(item)}</View>
                        <View style={styles.rowText}>
                            <Text style={[styles.rowTitle, { color: textColor }]}>{tk(item.titleKey)}</Text>
                            <Text style={[styles.rowBody, { color: textColor }]}>{tk(item.bodyKey)}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.button, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
                >
                    <Text style={[styles.buttonLabel, { color: dark ? '#100528' : '#ffffff' }]}>{t('whatsNew.continue')}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 32, paddingTop: 44, paddingBottom: 24 },
    appIcon: { width: 72, height: 72, borderRadius: 17, alignSelf: 'center', marginBottom: 18 },
    title: { fontFamily: 'LufgaMedium', fontSize: 30, lineHeight: 36, textAlign: 'center' },
    version: { fontFamily: 'LufgaRegular', fontSize: 15, lineHeight: 20, textAlign: 'center', opacity: 0.55, marginTop: 8, marginBottom: 34 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 26 },
    icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1 },
    rowTitle: { fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 22, marginBottom: 3 },
    rowBody: { fontFamily: 'LufgaRegular', fontSize: 14.5, lineHeight: 20, opacity: 0.6 },
    footer: { paddingHorizontal: 32, paddingTop: 8 },
    button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    buttonLabel: { fontFamily: 'LufgaMedium', fontSize: 17 },
});
