import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import Storage from 'expo-sqlite/kv-store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import i18n from '@/i18n';
import { WIDGET_ROLL_LATEST, widgetChoiceKey, widgetRollOptions } from '@/services/widgetRoll';
import { widgetStrings } from '@/services/widgetSync';
import { readWidgetChoice, renderRollWidget, storedSnapshot } from './widget-task-handler';

const PALETTE = {
    light: { background: '#EFF0F4', card: '#FFFFFF', text: '#100528', secondary: '#6B6780', divider: '#E4E2EC', accent: '#4F378B', pressed: '#F3F0FA' },
    dark: { background: '#09090B', card: '#18181B', text: '#FFFFFF', secondary: '#A1A1AA', divider: '#2A2A2E', accent: '#D0BCFF', pressed: '#232326' },
};

/**
 * The settings of one home screen widget (touch and hold the widget, then its
 * settings button): which roll it shows. "Latest roll" follows the roll logged
 * to most recently; any other choice keeps the widget on that roll for as long
 * as it is in the camera. Android opens this in its own window, outside the
 * app's navigation, so it uses nothing from the app's screens.
 */
export function RollWidgetSettings({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
    const c = PALETTE[useColorScheme() === 'dark' ? 'dark' : 'light'];
    const [fontsLoaded] = useFonts({
        LufgaRegular: require('../../assets/fonts/Lufga-Regular.ttf'),
        LufgaMedium: require('../../assets/fonts/Lufga-Medium.ttf'),
    });
    const snapshot = useMemo(storedSnapshot, []);
    const options = useMemo(() => widgetRollOptions(snapshot, widgetStrings()), [snapshot]);
    const [choice, setChoice] = useState(() => readWidgetChoice(widgetInfo.widgetId));
    // A stored roll that has left the camera shows as "Latest roll", which is what the widget is doing.
    const selected = options.some((option) => option.value === choice) ? choice : WIDGET_ROLL_LATEST;

    const choose = async (value: string) => {
        setChoice(value);
        try {
            const key = widgetChoiceKey(widgetInfo.widgetId);
            if (value === WIDGET_ROLL_LATEST) await Storage.removeItem(key);
            else await Storage.setItem(key, value);
        } catch (err) {
            console.warn('Could not save the widget setting:', err);
        }
        renderWidget(renderRollWidget(widgetInfo, snapshot));
        setResult('ok');
    };

    // Closing without choosing keeps the widget as it is. Before Android 12 this screen also opens
    // while a widget is being added, where "cancel" would throw the new widget away.
    const close = () => {
        renderWidget(renderRollWidget(widgetInfo, snapshot));
        setResult('ok');
    };

    if (!fontsLoaded) return <View style={[styles.screen, { backgroundColor: c.background }]} />;

    return (
        <SafeAreaProvider>
            <SafeAreaView style={[styles.screen, { backgroundColor: c.background }]}>
                <View style={styles.header}>
                    <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={i18n.t('shared.ok')}>
                        <MaterialIcons name="close" size={26} color={c.text} />
                    </Pressable>
                    <Text style={[styles.title, { color: c.text }]}>{i18n.t('widgets.chooseRoll')}</Text>
                </View>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.card, { backgroundColor: c.card }]}>
                        {options.map((option, index) => (
                            <Pressable
                                key={option.value}
                                onPress={() => choose(option.value)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: option.value === selected }}
                                style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider }, pressed && { backgroundColor: c.pressed }]}>
                                <View style={styles.rowText}>
                                    <Text style={[styles.rowTitle, { color: c.text }]}>{option.name}</Text>
                                    {option.subtitle ? <Text style={[styles.rowSubtitle, { color: c.secondary }]}>{option.subtitle}</Text> : null}
                                </View>
                                {option.value === selected ? <MaterialIcons name="check" size={24} color={c.accent} /> : null}
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 20, paddingVertical: 16 },
    title: { flex: 1, fontFamily: 'LufgaMedium', fontSize: 22 },
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    card: { borderRadius: 24, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, minHeight: 64 },
    rowText: { flex: 1, gap: 3 },
    rowTitle: { fontFamily: 'LufgaMedium', fontSize: 17 },
    rowSubtitle: { fontFamily: 'LufgaRegular', fontSize: 14 },
});
