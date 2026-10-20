import { Platform, Pressable, Switch, Text, View, useColorScheme } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { fixedSubtitle, type FrameFix } from '@/services/frameLocation';
import type { LocationStatus } from '@/hooks/useFrameLocation';

interface LocationRowProps {
    enabled: boolean;
    status: LocationStatus;
    fix: FrameFix | null;
    onToggle: (next: boolean) => void;
    onOpenMaps: () => void;
}

/** The "Save Location" row of the frame form; styled like the Attach Image card. */
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

    const fixed = status === 'fixed' && fix
        ? fixedSubtitle(fix, {
            accuracy: (meters) => t('newFrame.location.accuracy', { meters }),
            openInMaps: t('newFrame.location.openInMaps'),
        })
        : null;
    const plainSubtitle = status === 'finding'
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
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderWidth: isAndroid ? 1 : 0,
                borderColor: surfaceBorder,
                backgroundColor: surfaceBackground,
            }}
        >
            <Pressable
                disabled={!fixed}
                onPress={onOpenMaps}
                accessibilityRole={fixed ? 'link' : undefined}
                style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    opacity: pressed ? 0.7 : 1,
                })}
            >
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
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
                        {fixed ? fixed[0] : plainSubtitle}
                    </Text>
                    {fixed && (
                        <Text numberOfLines={1} style={{ fontFamily: 'LufgaRegular', fontSize: 13, lineHeight: 18, color: accent, marginTop: 1 }}>
                            {fixed[1]}
                        </Text>
                    )}
                </View>
            </Pressable>
            <Switch
                value={enabled}
                onValueChange={(next) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggle(next);
                }}
                trackColor={{ true: accent }}
                thumbColor="#ffffff"
                accessibilityLabel={t('newFrame.location.title')}
            />
        </GlassView>
    );
}
