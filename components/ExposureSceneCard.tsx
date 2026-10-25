import { formatEv, plannerEvValues, sceneForEv } from '@/services/exposurePlanner';
import RulerPicker from '@/components/RulerPicker';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ColorValue, LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';

/** Expected height of the card at the default text size; the sheet measures the real one. */
export const EXPOSURE_SCENE_CARD_HEIGHT = 142;

const SCENE_ROW_MIN_HEIGHT = 74;
const GLYPH_SIZE = 22;

export type ExposureSceneCardProps = {
    /**
     * The EV the card opens on. The card owns the live value from then on, so
     * a caller that changes the tick spacing remounts the card (by key) with a
     * snapped `initialEv`.
     */
    initialEv: number;
    /** Whole-stop ticks, matching the sheet's "full stops only" setting; thirds otherwise. */
    fullStopsOnly: boolean;
    /** The ruler started moving (first tick of a drag). */
    onMoveStart: () => void;
    /** The ruler settled on a tick. */
    onSettle: (ev: number) => void;
    /** Reports the card's laid-out height so the sheet can place what sits below it. */
    onHeight?: (height: number) => void;
    labelColor: ColorValue;
    secondaryLabelColor: ColorValue;
    /** The sheet's wheel surface colour: transparent under glass, a fill otherwise. */
    surfaceColor: ColorValue;
    /** Plain View instead of GlassView (the Android bottom sheet has no glass). */
    flat: boolean;
};

export function ExposureSceneCard({
    initialEv,
    fullStopsOnly,
    onMoveStart,
    onSettle,
    onHeight,
    labelColor,
    secondaryLabelColor,
    surfaceColor,
    flat,
}: ExposureSceneCardProps) {
    const { t } = useTranslation();
    // The ruler's starting tick never changes after mount: feeding the live
    // value back as `initial` would make the ruler re-scroll itself on every tick.
    const [rulerInitial] = useState(initialEv);
    const [ev, setEv] = useState(initialEv);
    const isMoving = useRef(false);
    const scene = sceneForEv(ev);
    const lastSceneKey = useRef(scene.key);
    const [rowOpacity] = useState(() => new Animated.Value(1));

    // Crossing into another band: a short fade on the row and a light tap.
    useEffect(() => {
        if (lastSceneKey.current === scene.key) return;
        lastSceneKey.current = scene.key;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        rowOpacity.setValue(0.35);
        Animated.timing(rowOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }, [scene.key, rowOpacity]);

    const glyph = Platform.OS === 'android'
        ? <MaterialIcons name={scene.md as never} size={GLYPH_SIZE} color={labelColor} />
        : <SymbolView name={scene.sf as never} style={styles.glyph} tintColor={labelColor} />;

    const content = (
        <>
            <Animated.View style={[styles.sceneRow, { opacity: rowOpacity }]}>
                <View style={styles.glyphWell}>{glyph}</View>
                <View style={styles.sceneText}>
                    <View style={styles.nameLine}>
                        <Text style={[styles.sceneName, { color: labelColor }]}>
                            {t(`lightMeter.planner.scenes.${scene.key}.name`)}
                        </Text>
                        <Text style={[styles.evValue, { color: labelColor }]}>
                            {t('lightMeter.planner.ev', { value: formatEv(ev) })}
                        </Text>
                    </View>
                    <Text style={[styles.sceneDescription, { color: secondaryLabelColor }]}>
                        {t(`lightMeter.planner.scenes.${scene.key}.description`)}
                    </Text>
                </View>
            </Animated.View>
            <RulerPicker
                variant="bare"
                label=""
                valueKind="plain"
                values={plannerEvValues(fullStopsOnly)}
                initial={rulerInitial}
                onTick={(value) => {
                    if (!isMoving.current) {
                        isMoving.current = true;
                        onMoveStart();
                    }
                    setEv(Number(value));
                }}
                onChange={(value) => {
                    isMoving.current = false;
                    setEv(Number(value));
                    onSettle(Number(value));
                }}
            />
        </>
    );

    const style = [styles.card, { backgroundColor: surfaceColor }];
    const onLayout = (e: LayoutChangeEvent) => onHeight?.(e.nativeEvent.layout.height);
    if (flat) {
        return <View style={style} onLayout={onLayout}>{content}</View>;
    }
    return (
        <GlassView style={style} glassEffectStyle="clear" isInteractive onLayout={onLayout}>
            {content}
        </GlassView>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        minHeight: EXPOSURE_SCENE_CARD_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
    },
    sceneRow: {
        minHeight: SCENE_ROW_MIN_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: 16,
        paddingRight: 18,
        paddingTop: 14,
    },
    glyphWell: {
        width: 28,
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    glyph: {
        width: GLYPH_SIZE,
        height: GLYPH_SIZE,
    },
    sceneText: {
        flex: 1,
    },
    nameLine: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
    },
    sceneName: {
        flexShrink: 1,
        fontFamily: 'LufgaMedium',
        fontSize: 17,
        lineHeight: 22,
        includeFontPadding: false,
    },
    sceneDescription: {
        fontFamily: 'LufgaRegular',
        fontSize: 13,
        lineHeight: 17,
        marginTop: 2,
        includeFontPadding: false,
    },
    evValue: {
        fontFamily: 'LufgaMedium',
        fontSize: 22,
        lineHeight: 22,
        includeFontPadding: false,
        marginLeft: 12,
        fontVariant: ['tabular-nums'],
    },
});
