import { useEffect, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Application from 'expo-application';
import Storage from 'expo-sqlite/kv-store';
import { useTranslation } from 'react-i18next';

import WhatsNewItemRow from '@/components/WhatsNewItemRow';
import { WHATS_NEW_KEY, itemsSince } from '@/services/whatsNew';

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

    const textColor = dark ? '#ffffff' : '#100528';
    const accent = dark ? '#A583EF' : '#39128F';

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Image source={require('@/assets/images/splash-icon-light.png')} style={styles.appIcon} />
                <Text style={[styles.title, { color: textColor }]}>{t('whatsNew.title')}</Text>
                <Text style={[styles.version, { color: textColor }]}>{t('whatsNew.version', { version })}</Text>

                {items.map((item) => <WhatsNewItemRow key={item.titleKey} item={item} />)}
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
    footer: { paddingHorizontal: 32, paddingTop: 8 },
    button: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    buttonLabel: { fontFamily: 'LufgaMedium', fontSize: 17 },
});
