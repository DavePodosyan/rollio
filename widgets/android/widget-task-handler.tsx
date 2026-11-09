import React from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { buildWidgetSnapshot, parseWidgetSnapshot, WIDGET_SNAPSHOT_KEY, widgetChoiceKey, widgetView, type WidgetSnapshot } from '@/services/widgetRoll';
import { widgetStrings } from '@/services/widgetSync';
import { RollWidgetAndroid } from './RollWidgetAndroid';

/** Both widget sizes show the same roll; the layout follows the widget's width. */
export const ANDROID_WIDGET_NAMES = ['RollWidget', 'RollWidgetWide'] as const;

/** One widget's setting: a film id, or null for "Latest roll" (also when never set). */
export const readWidgetChoice = (widgetId: number): string | null => {
    try {
        return Storage.getItemSync(widgetChoiceKey(widgetId));
    } catch (err) {
        console.warn('Could not read the widget setting:', err);
        return null;
    }
};

/** Each widget draws the roll its own setting picks (see RollWidgetSettings.tsx). */
export const renderRollWidget = (info: Pick<WidgetInfo, 'width' | 'widgetId'>, snapshot: WidgetSnapshot) => {
    const view = widgetView(snapshot, readWidgetChoice(info.widgetId));
    return {
        light: <RollWidgetAndroid {...view} theme="light" width={info.width} />,
        dark: <RollWidgetAndroid {...view} theme="dark" width={info.width} />,
    };
};

/** What the app last pushed (services/widgetSync.ts); before its first run, the no-roll state. */
export const storedSnapshot = (): WidgetSnapshot => {
    let stored: string | null = null;
    try {
        stored = Storage.getItemSync(WIDGET_SNAPSHOT_KEY);
    } catch (err) {
        console.warn('Could not read the widget snapshot:', err);
    }
    return parseWidgetSnapshot(stored) ?? buildWidgetSnapshot([], widgetStrings());
};

/** Runs headless when Android adds, resizes or refreshes a widget. Taps open links and never reach this. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(renderRollWidget(props.widgetInfo, storedSnapshot()));
            break;
        case 'WIDGET_DELETED':
            // The widget is gone; its setting goes with it.
            Storage.removeItem(widgetChoiceKey(props.widgetInfo.widgetId)).catch(() => { });
            break;
        default:
            break;
    }
}
