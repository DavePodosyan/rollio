import { AccessoryWidgetBackground, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { background, clipShape, containerBackground, font, foregroundStyle, frame, lineLimit, minimumScaleFactor, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type LightMeterWidgetProps = {
    /** "Light Meter" in the app's language. */
    title: string;
    meterUrl: string;
};

// Everything the widget uses has to live inside this function (see RollWidget).
const LightMeterWidget = (props: LightMeterWidgetProps, environment: WidgetEnvironment) => {
    'widget';
    const dark = environment.colorScheme === 'dark';
    const text = dark ? '#FFFFFF' : '#100528';
    const accent = dark ? '#A583EF' : '#4B1FB8';
    const accentTint = dark ? '#A583EF33' : '#4B1FB81F';
    const surface = {
        type: 'linearGradient' as const,
        colors: dark ? ['#1D1140', '#0D0A1A'] : ['#FFFFFF', '#F1ECFF'],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
    };

    if (environment.widgetFamily === 'accessoryCircular') {
        return (
            <ZStack modifiers={[containerBackground('#00000000', 'widget'), widgetURL(props.meterUrl)]}>
                <AccessoryWidgetBackground />
                <Image systemName="sun.max.fill" size={26} />
            </ZStack>
        );
    }

    return (
        <VStack
            alignment="leading"
            spacing={2}
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }), containerBackground(surface, 'widget'), widgetURL(props.meterUrl)]}>
            <ZStack modifiers={[frame({ width: 46, height: 46 }), background(accentTint), clipShape('circle')]}>
                <Image systemName="sun.max.fill" size={24} color={accent} />
            </ZStack>
            <Spacer />
            <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.7)]}>{props.title}</Text>
        </VStack>
    );
};

// Shown until the app has run once and supplied the title in its own language.
export default createWidget<LightMeterWidgetProps>('LightMeterWidget', LightMeterWidget, {
    title: 'Light Meter',
    meterUrl: 'rollio:///light_meter',
});
