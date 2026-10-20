import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Alert,
    Linking,
    Pressable,
    useColorScheme,
} from 'react-native';
import React from 'react';

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as HapticFeedback from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Each language is shown in its own script so it is recognisable whatever the
// app is currently running in (the same way the iOS language picker does it).
const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    ja: '日本語',
    ko: '한국어',
};

export default function Settings() {
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    // See films/index.tsx: pad content for side rails (iPhone Duo, Split View).
    const insets = useSafeAreaInsets();
    const isGlassAvailable = isLiquidGlassAvailable();
    const isDark = colorScheme === 'dark';

    const gradientColors: readonly [string, string, ...string[]] = isDark
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    const textColor = isDark ? '#ffffff' : '#100528';
    const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
    const currentLanguageName = LANGUAGE_NAMES[currentLanguage] ?? currentLanguage;

    // iOS 16+ and Android 13+ expose a per-app language picker inside the
    // app's own page in system Settings, which is where this row leads.
    const openLanguageSettings = () => {
        HapticFeedback.selectionAsync();
        Linking.openSettings().catch((err) => {
            console.warn('Failed to open settings:', err);
            Alert.alert(t('shared.error'), t('settings.openSettingsErrorMessage'));
        });
    };

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
                    style={{
                        paddingTop: 10,
                        paddingLeft: 18 + insets.left,
                        paddingRight: 18 + insets.right,
                    }}
                >
                    <View style={{ marginBottom: 36 }}>
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle="regular"
                            style={{
                                borderRadius: 24,
                                overflow: 'hidden',
                                backgroundColor: isGlassAvailable ? 'transparent' : (isDark ? '#a583ef1f' : '#ffffffcc'),
                            }}
                        >
                            <Pressable
                                onPress={openLanguageSettings}
                                accessibilityRole="button"
                                accessibilityLabel={t('settings.appLanguage')}
                                accessibilityValue={{ text: currentLanguageName }}
                                style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                            >
                                <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                                    {t('settings.appLanguage')}
                                </Text>

                                <Text style={[styles.rowValue, { color: textColor }]} numberOfLines={1}>
                                    {currentLanguageName}
                                </Text>

                                <SymbolView
                                    name={{ ios: 'chevron.right', android: 'chevron_right' }}
                                    size={14}
                                    weight="semibold"
                                    tintColor={isDark ? '#ffffff66' : '#10052866'}
                                />
                            </Pressable>
                        </GlassView>

                        <Text style={[styles.footnote, { color: textColor }]}>
                            {t('settings.languageFootnote')}
                        </Text>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 64,
    },
    rowLabel: {
        flex: 1,
        fontFamily: 'LufgaMedium',
        fontSize: 16,
    },
    rowValue: {
        fontFamily: 'LufgaRegular',
        fontSize: 16,
        opacity: 0.55,
        maxWidth: '45%',
    },
    footnote: {
        fontFamily: 'LufgaRegular',
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.55,
        marginTop: 10,
        marginHorizontal: 16,
    },
});
