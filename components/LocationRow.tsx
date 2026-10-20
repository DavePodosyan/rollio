import { Platform, Pressable, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { fixedSubtitle, formatCoordinates, type FrameFix } from '@/services/frameLocation';
import type { LocationStatus } from '@/hooks/useFrameLocation';

interface LocationRowProps {
    enabled: boolean;
    status: LocationStatus;
    fix: FrameFix | null;
    onToggle: (next: boolean) => void;
    onOpenMaps: () => void;
}

const ICON_SIZE = 40;
const GAP = 14;

/**
 * The "Save Location" card of the frame form: a title row with the switch
 * and, once there is a fix, an address row underneath that opens Maps.
 * Styled like the Attach Image card.
 */
export default function LocationRow({ enabled, status, fix, onToggle, onOpenMaps }: LocationRowProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const dark = colorScheme === 'dark';
    const isAndroid = Platform.OS === 'android';
    const isGlassAvailable = isLiquidGlassAvailable();

    const accent = dark ? '#A583EF' : '#39128F';
    const textColor = dark ? '#ffffff' : '#100528';
    const surfaceBackground = isGlassAvailable && !isAndroid ? 'transparent' : dark ? '#1c1c1e' : '#f6f6fa';
    const surfaceBorder = dark ? '#2a2a2d' : '#e6e6ee';
    const on = status !== 'off';
    const fixed = status === 'fixed' && !!fix;

    const subtitle = fixed
        ? fixedSubtitle(fix, { on: t('newFrame.location.on'), accuracy: (meters) => t('newFrame.location.accuracy', { meters }) })
        : status === 'finding'
            ? t('newFrame.location.finding')
            : status === 'waiting'
                ? t('newFrame.location.waiting')
                : t('newFrame.location.off');

    return (
        <GlassView
            isInteractive={true}
            glassEffectStyle="regular"
            tintColor={dark ? '#09090b6d' : '#ffffff'}
            style={{
                borderRadius: 22,
                borderWidth: isAndroid ? 1 : 0,
                borderColor: surfaceBorder,
                backgroundColor: surfaceBackground,
                overflow: 'hidden',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 14, paddingHorizontal: 16 }}>
                <View
                    style={{
                        width: ICON_SIZE,
                        height: ICON_SIZE,
                        borderRadius: ICON_SIZE / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: on ? accent : dark ? '#09090b6d' : '#e5e0ff4d',
                    }}
                >
                    <SymbolView
                        name={{ ios: 'mappin.and.ellipse', android: 'location_on' }}
                        size={20}
                        tintColor={on ? (dark ? '#100528' : '#ffffff') : textColor}
                    />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 22, color: textColor }}>
                        {t('newFrame.location.title')}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: 'LufgaRegular', fontSize: 13, lineHeight: 18, color: textColor, opacity: 0.6, marginTop: 2 }}>
                        {subtitle}
                    </Text>
                </View>
                {/* UISwitch draws 51×31 inside a taller native frame; centre it by hand. */}
                <View style={{ height: 31, justifyContent: 'center', alignSelf: 'center' }}>
                    <Switch
                        value={enabled}
                        onValueChange={(next) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onToggle(next);
                        }}
                        trackColor={{ true: accent }}
                        thumbColor="#ffffff"
                        accessibilityLabel={t('newFrame.location.title')}
                        style={{ alignSelf: 'center' }}
                    />
                </View>
            </View>

            {fixed && (
                <>
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: textColor, opacity: 0.12, marginHorizontal: 16 }} />
                    <Pressable
                        onPress={onOpenMaps}
                        accessibilityRole="link"
                        accessibilityLabel={t('newFrame.location.openInMaps')}
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            backgroundColor: pressed ? (dark ? '#ffffff14' : '#10052810') : 'transparent',
                        })}
                    >
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text numberOfLines={2} style={{ fontFamily: 'LufgaRegular', fontSize: 14, lineHeight: 19, color: textColor }}>
                                {fix.place ?? formatCoordinates(fix.latitude, fix.longitude)}
                            </Text>
                            <Text numberOfLines={1} style={{ fontFamily: 'LufgaRegular', fontSize: 13, lineHeight: 18, color: accent, marginTop: 2 }}>
                                {t('newFrame.location.openInMaps')}
                            </Text>
                        </View>
                        <SymbolView name={{ ios: 'chevron.forward', android: 'chevron_right' }} size={16} tintColor={textColor} style={{ opacity: 0.35 }} />
                    </Pressable>
                </>
            )}
        </GlassView>
    );
}
