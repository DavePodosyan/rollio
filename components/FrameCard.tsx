import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Svg, Path, Defs, Rect, G, ClipPath } from "react-native-svg";
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay
} from 'react-native-reanimated';
import { Link, router } from 'expo-router';
import { type Frame } from '@/utils/types';


interface FrameCardProps {
    item: Frame;
    index: number;
    film_id: number;
    disabled?: boolean;
}

export default function FrameCard({ item, index, film_id, disabled }: FrameCardProps) {

    const scale = useSharedValue(1);
    const translateY = useSharedValue(50);
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
        opacity: opacity.value
    }));

    useEffect(() => {
        translateY.value = withDelay(index * 60, withSpring(0, { damping: 12, stiffness: 90 }));
        opacity.value = withDelay(index * 60, withTiming(1, { duration: 500 }));
    }, []);

    function handlePressIn() {
        scale.value = withSpring(0.95);
    }

    function handlePressOut() {
        scale.value = withSpring(1);
    }

    return (

        <Reanimated.View style={[animatedStyle, { paddingLeft: 12, paddingRight: 12, paddingBottom: 4 }]}>
            <Pressable
                onPress={() => {
                    router.push({
                        pathname: disabled ? '/(modal)/disabled_frame' : '/(modal)/frame',
                        params: {
                            film_id: film_id,
                            frame_no: item.frame_no,
                            frame_id: item.id,
                            lens: item.lens,
                            aperture: item.aperture,
                            shutter_speed: item.shutter_speed,
                            note: item.note,
                            image: item.image,
                        }
                    })
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >

                <View style={{ backgroundColor: '#FFFFFF0D', borderRadius: 32, padding: 16, flexDirection: 'row' }}>
                    <View>
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                backgroundColor: "#ffffff0D",
                                borderRadius: 20,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaMedium', fontSize: 18, lineHeight: 26 }}>{item.frame_no}</Text>
                        </View >
                    </View>
                    <View style={{ marginLeft: 16, minHeight: 52, flex: 1 }}>
                        <Text
                            style={{
                                flex: 1,
                                color: '#FFFFFF',
                                fontFamily: 'LufgaRegular',
                                fontSize: 18,
                                lineHeight: 26,
                                marginBottom: 4
                            }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >{item.note}</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                backgroundColor: '#ffffff0D',
                                paddingBlock: 4,
                                paddingLeft: 4,
                                paddingRight: 12,
                                borderRadius: 24,
                                marginRight: 8
                            }}>
                                <Svg width="25" height="24" viewBox="0 0 25 24" fill="none">
                                    <G clip-path="url(#clip0_2023_5481)">
                                        <Path d="M12.9827 21C17.9532 21 21.9827 16.9706 21.9827 12C21.9827 7.02944 17.9532 3 12.9827 3C8.0121 3 3.98267 7.02944 3.98267 12C3.98267 16.9706 8.0121 21 12.9827 21Z" stroke="#FAFAFA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                        <Path d="M12.9827 3L16.4214 12.6281" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M5.18823 7.5L15.2457 9.33563" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M5.18823 16.5001L11.807 8.7085" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M12.9827 20.9999L9.54395 11.3718" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M20.777 16.5L10.7195 14.6644" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M20.777 7.5L14.1582 15.2916" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </G>
                                    <Defs>
                                        <ClipPath id="clip0_2023_5481">
                                            <Rect width="24" height="24" fill="white" transform="translate(0.982666)" />
                                        </ClipPath>
                                    </Defs>
                                </Svg>

                                <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaRegular', fontSize: 16, lineHeight: 24, marginLeft: 8 }}>{Number(item.aperture) === 0 ? 'Auto' : 'f/' + item.aperture}</Text>
                            </View >

                            <View style={{
                                flexDirection: 'row',
                                backgroundColor: '#ffffff0D',
                                paddingBlock: 4,
                                paddingLeft: 4,
                                paddingRight: 12,
                                borderRadius: 24,
                                marginRight: 8
                            }}>
                                <Svg width="25" height="24" viewBox="0 0 25 24" fill="none">
                                    <G clip-path="url(#clip0_2023_5494)">
                                        <Path d="M21.9827 12.75C21.6011 17.37 17.7011 21 12.9827 21C10.5957 21 8.30653 20.0518 6.6187 18.364C4.93088 16.6761 3.98267 14.3869 3.98267 12C3.98267 7.28156 7.61267 3.38156 12.2327 3" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <Path d="M12.9827 6.75V12H18.2327" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </G>
                                    <Defs>
                                        <ClipPath id="clip0_2023_5494">
                                            <Rect width="24" height="24" fill="white" transform="translate(0.982666)" />
                                        </ClipPath>
                                    </Defs>
                                </Svg>

                                <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaRegular', fontSize: 16, lineHeight: 24, marginLeft: 8 }}>{item.shutter_speed}</Text>
                            </View >

                        </View>

                    </View>


                </View >
            </Pressable>
        </Reanimated.View >
    )

}