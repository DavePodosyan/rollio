import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import WhatsNewItemRow from '@/components/WhatsNewItemRow';
import { releasesUpTo } from '@/services/whatsNew';

/**
 * Every What's New entry up to the running version, newest first. The sheet
 * after an update shows once; this page is where it can be read again.
 */
export default function WhatsNewHistory() {
    const { t } = useTranslation();
    const isDark = useColorScheme() === 'dark';
    // See films/index.tsx: pad content for side rails (iPhone Duo, Split View).
    const insets = useSafeAreaInsets();
    const releases = useMemo(() => releasesUpTo(Application.nativeApplicationVersion ?? ''), []);

    const gradientColors: readonly [string, string, ...string[]] = isDark
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];
    const textColor = isDark ? '#ffffff' : '#100528';

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={gradientColors}
                locations={[0.1, 0.4, 0.9]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <ScrollView
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{
                        paddingTop: 18,
                        paddingBottom: 32,
                        paddingLeft: 24 + insets.left,
                        paddingRight: 24 + insets.right,
                    }}
                >
                    {releases.map((release, index) => (
                        <View key={release.version} style={index > 0 ? styles.laterRelease : undefined}>
                            <Text style={[styles.version, { color: textColor }]} accessibilityRole="header">
                                {t('whatsNew.version', { version: release.version })}
                            </Text>
                            {release.items.map((item) => <WhatsNewItemRow key={item.titleKey} item={item} />)}
                        </View>
                    ))}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    laterRelease: { marginTop: 8 },
    version: { fontFamily: 'LufgaMedium', fontSize: 13, lineHeight: 18, letterSpacing: 0.4, opacity: 0.55, marginBottom: 16, textTransform: 'uppercase' },
});
