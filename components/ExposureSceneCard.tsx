import { EV_PLANNER_VALUES, formatEv, sceneForEv } from '@/services/exposurePlanner';
import RulerPicker from '@/components/RulerPicker';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ColorValue, Platform, StyleSheet, Text, View } from 'react-native';

/** Height of the card including its ruler; the sheet offsets the pill and columns by this. */
export const EXPOSURE_SCENE_CARD_HEIGHT = 134;

const SCENE_ROW_HEIGHT = 66;
const GLYPH_SIZE = 22;

export type ExposureSceneCardProps = {
    ev: number;
    /** Every tick passed during the drag. */
    onTick: (ev: number) => void;
    /** The ruler settled on a tick. */
    onSettle: (ev: number) => void;
    labelColor: ColorValue;
    secondaryLabelColor: ColorValue;
    /** The sheet's wheel surface colour: transparent under glass, a fill otherwise. */
    surfaceColor: ColorValue;
    /** Plain View instead of GlassView (the Android bottom sheet has no glass). */
    flat: boolean;
};

export function ExposureSceneCard({
    ev,
    onTick,
    onSettle,
    labelColor,
    secondaryLabelColor,
    surfaceColor,
    flat,
}: ExposureSceneCardProps) {
    const { t } = useTranslation();
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
                values={EV_PLANNER_VALUES}
                initial={ev}
                onTick={(value) => onTick(Number(value))}
                onChange={(value) => onSettle(Number(value))}
            />
        </>
    );

    const style = [styles.card, { backgroundColor: surfaceColor }];
    if (flat) {
        return <View style={style}>{content}</View>;
    }
    return (
        <GlassView style={style} glassEffectStyle="clear" isInteractive>
            {content}
        </GlassView>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        height: EXPOSURE_SCENE_CARD_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
    },
    sceneRow: {
        height: SCENE_ROW_HEIGHT,
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
