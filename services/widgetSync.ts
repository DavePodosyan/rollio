// Pushes the current roll to the home screen and Lock Screen widgets. What the
// widgets show is decided in services/widgetRoll.ts; this file only talks to
// the two widget libraries (expo-widgets on iOS, react-native-android-widget
// on Android until expo-widgets can open the app from an Android widget).
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import i18n from '@/i18n';
import { buildWidgetSnapshot, getInCameraRolls, WIDGET_SNAPSHOT_KEY, widgetRollOptions, type WidgetSnapshot, type WidgetStrings } from '@/services/widgetRoll';

/** Widget text in the app's language; the widgets cannot translate for themselves. */
export const widgetStrings = (): WidgetStrings => ({
    noRollTitle: i18n.t('widgets.noRollTitle'),
    noRollBody: i18n.t('widgets.noRollBody'),
    startRoll: i18n.t('widgets.startRoll'),
    logFrame: i18n.t('widgets.logFrame'),
    lightMeter: i18n.t('widgets.lightMeter'),
    framesOf: (done, total) => i18n.t('widgets.framesOf', { done, total }),
    latestRoll: i18n.t('widgets.latestRoll'),
    latestRollHint: i18n.t('widgets.latestRollHint'),
});

// The choices "Edit Widget" last received; each change redraws the widget, so unchanged lists are not sent again.
let lastOptions: string | null = null;

const pushToIos = (snapshot: WidgetSnapshot) => {
    const rollWidget = require('@/widgets/RollWidget').default;
    rollWidget.updateSnapshot(snapshot);
    // The rolls "Edit Widget" offers for each roll widget (iOS reads them without the app running).
    const options = widgetRollOptions(snapshot, widgetStrings());
    const serializedOptions = JSON.stringify(options);
    if (serializedOptions !== lastOptions) {
        rollWidget.setConfigurationParameterEnum('roll', options);
        lastOptions = serializedOptions;
    }
    require('@/widgets/LightMeterWidget').default.updateSnapshot({ title: snapshot.lightMeterLabel, meterUrl: snapshot.meterUrl });
};

const pushToAndroid = async (snapshot: WidgetSnapshot, serialized: string) => {
    // Stored first: Android redraws a widget from this when it is added or resized while the app is closed.
    await Storage.setItem(WIDGET_SNAPSHOT_KEY, serialized);
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { ANDROID_WIDGET_NAMES, renderRollWidget } = require('@/widgets/android/widget-task-handler');
    for (const widgetName of ANDROID_WIDGET_NAMES) {
        await requestWidgetUpdate({
            widgetName,
            renderWidget: (info: { width: number; widgetId: number }) => renderRollWidget(info, snapshot),
            widgetNotFound: () => { },
        });
    }
};

// What the widgets already show, so an unchanged roll costs nothing (iOS limits how often widgets may redraw).
let lastPushed: string | null = null;

/** Brings the widgets in line with the database. Never throws: a widget that cannot update must not disturb the app. */
export const syncWidgets = async (db: SQLiteDatabase) => {
    try {
        const snapshot = buildWidgetSnapshot(await getInCameraRolls(db), widgetStrings());
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastPushed) return;
        if (Platform.OS === 'ios') pushToIos(snapshot);
        else if (Platform.OS === 'android') await pushToAndroid(snapshot, serialized);
        lastPushed = serialized;
    } catch (err) {
        console.warn('Could not update the widgets:', err);
    }
};
