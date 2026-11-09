import { Gauge, HStack, Image, Link, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
    background,
    clipShape,
    containerBackground,
    font,
    foregroundStyle,
    frame,
    gaugeStyle,
    lineLimit,
    minimumScaleFactor,
    padding,
    tint,
    widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetSnapshot } from '@/services/widgetRoll';

/** The app supplies everything, text included: see services/widgetSync.ts. */
export type RollWidgetProps = WidgetSnapshot;

/** "Edit Widget" settings: `roll` is a film id, or "latest" (also when never set). */
export type RollWidgetConfiguration = { roll?: string | null };

// The widget runs in its own runtime: everything it uses has to live inside
// this function (no hooks, no module-level constants, no app imports).
const RollWidget = (snapshot: RollWidgetProps, environment: WidgetEnvironment<RollWidgetConfiguration>) => {
    'widget';
    // This widget's own roll: the one chosen in "Edit Widget" while it is in the camera, otherwise
    // the most recently used one. Same rule as widgetView() in services/widgetRoll.ts, repeated
    // here because a widget cannot import app code.
    const rolls = snapshot.rolls ?? [];
    const chosen = environment.configuration?.roll;
    const pinned = rolls.find((candidate) => candidate.id === chosen);
    const roll = pinned ?? rolls[0];
    const props = {
        hasRoll: !!roll,
        title: roll ? roll.title : '',
        camera: roll ? roll.camera : '',
        count: roll ? roll.count : 0,
        total: roll ? roll.total : 0,
        progressLabel: roll ? roll.progressLabel : '',
        rollUrl: roll ? roll.rollUrl : snapshot.filmsUrl,
        logUrl: pinned ? pinned.logUrl : snapshot.logUrl,
        meterUrl: snapshot.meterUrl,
        newRollUrl: snapshot.newRollUrl,
        noRollTitle: snapshot.noRollTitle,
        noRollBody: snapshot.noRollBody,
        startRollLabel: snapshot.startRollLabel,
        logFrameLabel: snapshot.logFrameLabel,
        lightMeterLabel: snapshot.lightMeterLabel,
    };
    const dark = environment.colorScheme === 'dark';
    const text = dark ? '#FFFFFF' : '#100528';
    const secondary = dark ? '#FFFFFF99' : '#10052899';
    const accent = dark ? '#A583EF' : '#4B1FB8';
    const onAccent = dark ? '#14092E' : '#FFFFFF';
    const accentTint = dark ? '#A583EF33' : '#4B1FB81F';
    const inCamera = '#4CAF50';
    const surface = {
        type: 'linearGradient' as const,
        colors: dark ? ['#1D1140', '#0D0A1A'] : ['#FFFFFF', '#F1ECFF'],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
    };
    const family = environment.widgetFamily ?? 'systemSmall';
    const progress = props.total > 0 ? Math.min(1, props.count / props.total) : 0;

    // Lock Screen: the system draws these in its own vibrant style.
    if (family === 'accessoryInline') {
        return (
            <Text modifiers={[containerBackground('#00000000', 'widget'), widgetURL(props.hasRoll ? props.logUrl : props.newRollUrl)]}>
                {props.hasRoll ? `${props.title} · ${props.count}/${props.total}` : props.noRollTitle}
            </Text>
        );
    }
    if (family === 'accessoryCircular') {
        // The ring fills with the roll's progress; the frame count sits in the middle.
        return (
            <ZStack modifiers={[containerBackground('#00000000', 'widget'), widgetURL(props.hasRoll ? props.logUrl : props.newRollUrl)]}>
                <Gauge value={props.hasRoll ? props.count : 0} min={0} max={props.hasRoll && props.total > 0 ? props.total : 1} modifiers={[gaugeStyle('circularCapacity')]} />
                <Text modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' }), lineLimit(1), minimumScaleFactor(0.6)]}>
                    {props.hasRoll ? `${props.count}` : '+'}
                </Text>
            </ZStack>
        );
    }
    if (family === 'accessoryRectangular') {
        return (
            <VStack
                alignment="leading"
                spacing={2}
                modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), containerBackground('#00000000', 'widget'), widgetURL(props.hasRoll ? props.logUrl : props.newRollUrl)]}>
                <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>
                    {props.hasRoll ? props.title : props.noRollTitle}
                </Text>
                <Text modifiers={[font({ size: 13 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1), minimumScaleFactor(0.7)]}>
                    {props.hasRoll ? props.progressLabel : props.startRollLabel}
                </Text>
                {props.hasRoll && <ProgressView value={progress} />}
            </VStack>
        );
    }

    if (!props.hasRoll) {
        return (
            <VStack
                alignment="leading"
                spacing={4}
                modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }), containerBackground(surface, 'widget'), widgetURL(props.newRollUrl)]}>
                <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(text)]}>{props.noRollTitle}</Text>
                {/* The small size has no room for a second sentence in every language. */}
                {family !== 'systemSmall' && <Text modifiers={[font({ size: 12.5 }), foregroundStyle(secondary)]}>{props.noRollBody}</Text>}
                <Spacer />
                <HStack alignment="center">
                    <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(accent), lineLimit(1), minimumScaleFactor(0.7)]}>{props.startRollLabel}</Text>
                    <Spacer />
                    <Image systemName="plus.circle.fill" size={32} color={accent} />
                </HStack>
            </VStack>
        );
    }

    if (family === 'systemSmall') {
        // A small widget has a single tap target: the whole tile logs a frame.
        return (
            <VStack
                alignment="leading"
                spacing={2}
                modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }), containerBackground(surface, 'widget'), widgetURL(props.logUrl)]}>
                <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(2)]}>{props.title}</Text>
                <Text modifiers={[font({ size: 12.5 }), foregroundStyle(secondary), lineLimit(1)]}>{props.camera}</Text>
                <Spacer />
                <HStack alignment="lastTextBaseline" spacing={2}>
                    <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.6)]}>
                        {`${props.count}`}
                    </Text>
                    <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(secondary)]}>{`/${props.total}`}</Text>
                    <Spacer />
                    <Image systemName="plus.circle.fill" size={32} color={accent} />
                </HStack>
                <ProgressView value={progress} modifiers={[tint(inCamera)]} />
            </VStack>
        );
    }

    // Medium: roll on the left (a tap there opens it), two links on the right.
    return (
        <HStack
            spacing={16}
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), containerBackground(surface, 'widget'), widgetURL(props.rollUrl)]}>
            <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' })]}>
                <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(2)]}>{props.title}</Text>
                <Text modifiers={[font({ size: 12.5 }), foregroundStyle(secondary), lineLimit(1)]}>{props.camera}</Text>
                <Spacer />
                <HStack alignment="lastTextBaseline" spacing={2}>
                    <Text modifiers={[font({ size: 40, weight: 'bold', design: 'rounded' }), foregroundStyle(text), lineLimit(1), minimumScaleFactor(0.6)]}>
                        {`${props.count}`}
                    </Text>
                    <Text modifiers={[font({ size: 17, weight: 'semibold', design: 'rounded' }), foregroundStyle(secondary)]}>{`/${props.total}`}</Text>
                </HStack>
                <ProgressView value={progress} modifiers={[tint(inCamera)]} />
            </VStack>
            <VStack spacing={10} modifiers={[frame({ width: 150 }), frame({ maxHeight: Infinity })]}>
                <Link destination={props.logUrl}>
                    <HStack
                        spacing={8}
                        modifiers={[padding({ horizontal: 14 }), frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }), background(accent), clipShape('roundedRectangle', 17)]}>
                        <Image systemName="plus" size={16} color={onAccent} />
                        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(onAccent), lineLimit(1), minimumScaleFactor(0.7)]}>{props.logFrameLabel}</Text>
                    </HStack>
                </Link>
                <Link destination={props.meterUrl}>
                    <HStack
                        spacing={8}
                        modifiers={[padding({ horizontal: 14 }), frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'leading' }), background(accentTint), clipShape('roundedRectangle', 17)]}>
                        <Image systemName="sun.max" size={16} color={accent} />
                        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(accent), lineLimit(1), minimumScaleFactor(0.7)]}>{props.lightMeterLabel}</Text>
                    </HStack>
                </Link>
            </VStack>
        </HStack>
    );
};

// Shown until the app has run once and supplied the real rolls (and its own language).
export default createWidget<RollWidgetProps, RollWidgetConfiguration>('RollWidget', RollWidget, {
    rolls: [],
    logUrl: 'rollio:///log-frame',
    meterUrl: 'rollio:///light_meter',
    newRollUrl: 'rollio:///new-film',
    filmsUrl: 'rollio:///films',
    noRollTitle: 'No roll in camera',
    noRollBody: 'Load a film to start logging.',
    startRollLabel: 'Start a roll',
    logFrameLabel: 'Log Frame',
    lightMeterLabel: 'Light Meter',
});
