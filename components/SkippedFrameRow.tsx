import { Platform, Switch, Text, View, useColorScheme } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface SkippedFrameRowProps {
    skipped: boolean;
    onToggle: (next: boolean) => void;
}

/**
 * The "Skipped Frame" card of the frame form, shown only for a frame that was
 * logged as skipped. Same Reminders-style row as Save Location: a plain grey
 * glyph, title and hint, the system switch. Turning it off brings the normal
 * fields back so the frame can be logged after all.
 */
export default function SkippedFrameRow({ skipped, onToggle }: SkippedFrameRowProps) {
    const { t } = useTranslation();
    const dark = useColorScheme() === 'dark';
    const isAndroid = Platform.OS === 'android';
    const isGlassAvailable = isLiquidGlassAvailable();

    const textColor = dark ? '#ffffff' : '#100528';
    const secondary = '#8E8E93';
    const surfaceBackground = isGlassAvailable && !isAndroid ? 'transparent' : dark ? '#1c1c1e' : '#ffffff';
    const surfaceBorder = dark ? '#2a2a2d' : '#e6e6ee';

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
                <View style={{ width: 24, alignItems: 'center' }}>
                    <SymbolView name={{ ios: 'rectangle.dashed', android: 'crop_free' }} size={22} tintColor={secondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: 'LufgaMedium', fontSize: 16, lineHeight: 22, color: textColor }}>
                        {t('newFrame.skipped.title')}
                    </Text>
                    <Text style={{ fontFamily: 'LufgaRegular', fontSize: 13, lineHeight: 18, color: secondary, marginTop: 2 }}>
                        {skipped ? t('newFrame.skipped.on') : t('newFrame.skipped.off')}
                    </Text>
                </View>
                {/* UISwitch draws 51×31 inside a taller native frame; centre it by hand. */}
                <View style={{ height: 31, justifyContent: 'center', alignSelf: 'center' }}>
                    <Switch
                        value={skipped}
                        onValueChange={(next) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onToggle(next);
                        }}
                        accessibilityLabel={t('newFrame.skipped.title')}
                        style={{ alignSelf: 'center' }}
                    />
                </View>
            </View>
        </GlassView>
    );
}
