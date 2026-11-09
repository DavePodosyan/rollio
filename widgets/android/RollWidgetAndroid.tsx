import React from 'react';
import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { WidgetView } from '@/services/widgetRoll';

/**
 * Android home screen widget, built with react-native-android-widget because
 * expo-widgets cannot open the app from an Android widget yet (expo/expo#51840).
 * When that lands, this folder can go and the iOS widget in ../RollWidget.tsx
 * can serve both platforms.
 */
export type RollWidgetAndroidProps = WidgetView & {
    theme: 'light' | 'dark';
    /** Widget width in dp: wide widgets get labelled buttons beside the roll. */
    width: number;
};

const PALETTE: Record<'light' | 'dark', Record<'surface' | 'text' | 'secondary' | 'primary' | 'onPrimary' | 'tonal' | 'onTonal' | 'track', ColorProp>> = {
    light: { surface: '#FDF8FF', text: '#1D1B20', secondary: '#49454F', primary: '#4F378B', onPrimary: '#FFFFFF', tonal: '#E8DEF8', onTonal: '#4A4458', track: '#E7E0EC' },
    dark: { surface: '#1B1530', text: '#E6E0E9', secondary: '#CAC4D0', primary: '#D0BCFF', onPrimary: '#381E72', tonal: '#4A4458', onTonal: '#E8DEF8', track: '#49454F' },
};
const IN_CAMERA: ColorProp = '#4CAF50';
const WIDE_FROM_DP = 250;

const plusSvg = (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const sunSvg = (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" fill="none" stroke="${color}" stroke-width="2.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/></svg>`;

export function RollWidgetAndroid(props: RollWidgetAndroidProps) {
    const c = PALETTE[props.theme];
    const wide = props.width >= WIDE_FROM_DP;

    if (!props.hasRoll) {
        return (
            <FlexWidget
                clickAction="OPEN_URI"
                clickActionData={{ uri: props.newRollUrl }}
                style={{ width: 'match_parent', height: 'match_parent', backgroundColor: c.surface, borderRadius: 28, padding: 18, flexDirection: 'column', justifyContent: 'space-between' }}>
                <FlexWidget style={{ flexDirection: 'column' }}>
                    <TextWidget text={props.noRollTitle} style={{ fontSize: 16, fontWeight: '500', color: c.text }} />
                    {/* The small size has no room for a second sentence in every language. */}
                    {wide ? <TextWidget text={props.noRollBody} style={{ fontSize: 13, color: c.secondary, marginTop: 4 }} /> : null}
                </FlexWidget>
                <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextWidget text={props.startRollLabel} style={{ fontSize: 15, fontWeight: '500', color: c.primary }} />
                    <FlexWidget style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <SvgWidget svg={plusSvg(c.onPrimary)} style={{ width: 20, height: 20 }} />
                    </FlexWidget>
                </FlexWidget>
            </FlexWidget>
        );
    }

    const done = Math.max(0, Math.min(props.count, props.total));
    const left = Math.max(0, props.total - done);

    const roll = (
        <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: props.rollUrl }}
            style={{ flex: 1, height: wide ? 'match_parent' : 'wrap_content', width: wide ? 'wrap_content' : 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
            <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
                <TextWidget text={props.title} maxLines={2} truncate="END" style={{ fontSize: 16, fontWeight: '500', color: c.text }} />
                {wide ? <TextWidget text={props.camera} maxLines={1} truncate="END" style={{ fontSize: 13, color: c.secondary, marginTop: 2 }} /> : null}
            </FlexWidget>
            <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
                <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <TextWidget text={`${props.count}`} style={{ fontSize: wide ? 40 : 30, fontWeight: '500', color: c.text }} />
                    <TextWidget text={`/${props.total}`} style={{ fontSize: wide ? 17 : 14, fontWeight: '500', color: c.secondary, marginLeft: 2, marginBottom: wide ? 6 : 4 }} />
                </FlexWidget>
                <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: c.track, flexDirection: 'row', overflow: 'hidden', marginTop: 4 }}>
                    {done > 0 ? <FlexWidget style={{ flex: done, height: 6, borderRadius: 3, backgroundColor: IN_CAMERA }} /> : null}
                    {left > 0 ? <FlexWidget style={{ flex: left, height: 6 }} /> : null}
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );

    if (wide) {
        return (
            <FlexWidget style={{ width: 'match_parent', height: 'match_parent', backgroundColor: c.surface, borderRadius: 28, padding: 18, flexDirection: 'row', flexGap: 16 }}>
                {roll}
                <FlexWidget style={{ width: 156, height: 'match_parent', flexDirection: 'column', flexGap: 10 }}>
                    <FlexWidget
                        clickAction="OPEN_URI"
                        clickActionData={{ uri: props.logUrl }}
                        style={{ flex: 1, width: 'match_parent', borderRadius: 22, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, flexGap: 9 }}>
                        <SvgWidget svg={plusSvg(c.onPrimary)} style={{ width: 18, height: 18 }} />
                        <TextWidget text={props.logFrameLabel} maxLines={1} style={{ fontSize: 14.5, fontWeight: '500', color: c.onPrimary }} />
                    </FlexWidget>
                    <FlexWidget
                        clickAction="OPEN_URI"
                        clickActionData={{ uri: props.meterUrl }}
                        style={{ flex: 1, width: 'match_parent', borderRadius: 22, backgroundColor: c.tonal, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, flexGap: 9 }}>
                        <SvgWidget svg={sunSvg(c.onTonal)} style={{ width: 18, height: 18 }} />
                        <TextWidget text={props.lightMeterLabel} maxLines={1} style={{ fontSize: 14.5, fontWeight: '500', color: c.onTonal }} />
                    </FlexWidget>
                </FlexWidget>
            </FlexWidget>
        );
    }

    // Small: + logs a frame, the sun opens the light meter.
    return (
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', backgroundColor: c.surface, borderRadius: 28, padding: 16, flexDirection: 'column', flexGap: 10 }}>
            {roll}
            <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
                <FlexWidget
                    clickAction="OPEN_URI"
                    clickActionData={{ uri: props.logUrl }}
                    accessibilityLabel={props.logFrameLabel}
                    style={{ flex: 1, height: 40, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <SvgWidget svg={plusSvg(c.onPrimary)} style={{ width: 20, height: 20 }} />
                </FlexWidget>
                <FlexWidget
                    clickAction="OPEN_URI"
                    clickActionData={{ uri: props.meterUrl }}
                    accessibilityLabel={props.lightMeterLabel}
                    style={{ flex: 1, height: 40, borderRadius: 14, backgroundColor: c.tonal, alignItems: 'center', justifyContent: 'center' }}>
                    <SvgWidget svg={sunSvg(c.onTonal)} style={{ width: 20, height: 20 }} />
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );
}
