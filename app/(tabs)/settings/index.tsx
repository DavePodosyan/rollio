import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Alert,
    Linking,
    Platform,
    Pressable,
    ActivityIndicator,
    useColorScheme,
} from 'react-native';
import React from 'react';

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Host, Picker, Text as SwiftText } from '@expo/ui/swift-ui';
import { font, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as HapticFeedback from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBackup } from '@/hooks/useBackup';
import { useLaunchTab } from '@/hooks/useLaunchTab';
import { LAUNCH_TABS, LaunchTab } from '@/services/launchTab';

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
    const { busy, lastBackupAt, backUp, restore, formatDate } = useBackup();
    const { launchTab, setLaunchTab } = useLaunchTab();

    const gradientColors: readonly [string, string, ...string[]] = isDark
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    const textColor = isDark ? '#ffffff' : '#100528';
    const launchTabLabel: Record<LaunchTab, string> = {
        films: t('tabs.films'),
        light_meter: t('tabs.lightMeter'),
    };
    const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
    const currentLanguageName = LANGUAGE_NAMES[currentLanguage] ?? currentLanguage;

    // Android has no pull-down menu picker; a plain chooser alert stands in.
    const chooseLaunchTab = () => {
        HapticFeedback.selectionAsync();
        Alert.alert(t('settings.launchTab.title'), undefined, [
            ...LAUNCH_TABS.map((tab) => ({ text: launchTabLabel[tab], onPress: () => setLaunchTab(tab) })),
            { text: t('shared.cancel'), style: 'cancel' as const },
        ], { cancelable: true });
    };

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
                        <View>
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
                                    onPress={Platform.OS === 'ios' ? undefined : chooseLaunchTab}
                                    disabled={Platform.OS === 'ios'}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('settings.launchTab.title')}
                                    accessibilityValue={{ text: launchTabLabel[launchTab] }}
                                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                                >
                                    <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                                        {t('settings.launchTab.title')}
                                    </Text>

                                    {Platform.OS !== 'ios' && (
                                        <>
                                            <Text style={[styles.rowValue, { color: textColor }]} numberOfLines={1}>
                                                {launchTabLabel[launchTab]}
                                            </Text>

                                            <SymbolView
                                                name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more' }}
                                                size={14}
                                                weight="semibold"
                                                tintColor={isDark ? '#ffffff66' : '#10052866'}
                                            />
                                        </>
                                    )}
                                </Pressable>
                            </GlassView>

                            {/* A SwiftUI menu picker: the value with a chevron, and a pull-down
                                menu that ticks the current choice, like the system apps. It sits
                                over the card rather than inside it because iOS morphs the glass
                                it is in into the menu, which hid the whole card while open. */}
                            {Platform.OS === 'ios' && (
                                <View style={styles.launchPicker} pointerEvents="box-none">
                                    <Host matchContents>
                                        <Picker
                                            selection={launchTab}
                                            onSelectionChange={(tab) => { HapticFeedback.selectionAsync(); setLaunchTab(tab); }}
                                            modifiers={[
                                                pickerStyle('menu'),
                                                tint(isDark ? '#ffffff8c' : '#1005288c'),
                                                font({ family: 'LufgaRegular', size: 16 }),
                                            ]}
                                        >
                                            {LAUNCH_TABS.map((tab) => (
                                                <SwiftText key={tab} modifiers={[tag(tab)]}>{launchTabLabel[tab]}</SwiftText>
                                            ))}
                                        </Picker>
                                    </Host>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.footnote, { color: textColor }]}>
                            {t('settings.launchTab.footnote')}
                        </Text>
                    </View>

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
                                onPress={() => { HapticFeedback.selectionAsync(); backUp(); }}
                                disabled={busy !== 'idle'}
                                accessibilityRole="button"
                                accessibilityLabel={t('settings.backup.backUp')}
                                accessibilityState={{ disabled: busy !== 'idle', busy: busy === 'backup' }}
                                style={({ pressed }) => [styles.row, { opacity: pressed || (busy !== 'idle' && busy !== 'backup') ? 0.6 : 1 }]}
                            >
                                <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                                    {t('settings.backup.backUp')}
                                </Text>
                                {busy === 'backup' ? (
                                    <ActivityIndicator size="small" color={textColor} />
                                ) : (
                                    <SymbolView
                                        name={{ ios: 'chevron.right', android: 'chevron_right' }}
                                        size={14}
                                        weight="semibold"
                                        tintColor={isDark ? '#ffffff66' : '#10052866'}
                                    />
                                )}
                            </Pressable>

                            <View style={[styles.separator, { backgroundColor: isDark ? '#ffffff22' : '#10052822' }]} />

                            <Pressable
                                onPress={() => { HapticFeedback.selectionAsync(); restore(); }}
                                disabled={busy !== 'idle'}
                                accessibilityRole="button"
                                accessibilityLabel={t('settings.backup.restore')}
                                accessibilityState={{ disabled: busy !== 'idle', busy: busy === 'restore' }}
                                style={({ pressed }) => [styles.row, { opacity: pressed || (busy !== 'idle' && busy !== 'restore') ? 0.6 : 1 }]}
                            >
                                <Text style={[styles.rowLabel, { color: textColor }]} numberOfLines={1}>
                                    {t('settings.backup.restore')}
                                </Text>
                                {busy === 'restore' ? (
                                    <ActivityIndicator size="small" color={textColor} />
                                ) : (
                                    <SymbolView
                                        name={{ ios: 'chevron.right', android: 'chevron_right' }}
                                        size={14}
                                        weight="semibold"
                                        tintColor={isDark ? '#ffffff66' : '#10052866'}
                                    />
                                )}
                            </Pressable>
                        </GlassView>

                        <Text style={[styles.footnote, { color: textColor }]}>
                            {lastBackupAt
                                ? t('settings.backup.lastCreated', { date: formatDate(lastBackupAt) })
                                : t('settings.backup.footnote')}
                        </Text>
                    </View>

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
    launchPicker: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 20,
        justifyContent: 'center',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 20,
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
