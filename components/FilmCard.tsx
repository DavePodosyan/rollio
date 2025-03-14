import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { RectButton, GestureHandlerRootView } from "react-native-gesture-handler";
import { Svg, Path } from "react-native-svg";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
    SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

export default function FilmCard({ item }: any) {
    function RightAction(prog: SharedValue<number>, drag: SharedValue<number>) {
        const styleAnimation = useAnimatedStyle(() => {
            return {
                transform: [{ translateX: drag.value + 50 }],
            };
        });

        return (
            <Reanimated.View style={styleAnimation}>
                <View style={{ flex: 1, width: 50, alignItems: 'center', justifyContent: 'center' }}>
                    <RectButton
                        style={{
                            // backgroundColor: "white",
                            justifyContent: "center",
                            // alignItems: "center",
                            height: "100%",
                            width: '100%'
                            // marginLeft: -12,
                        }}
                        onPress={() => console.log('Delete')}
                    >
                        <Svg width="35px" height="35px" viewBox="0 0 24 24" fill="none">
                            <Path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#DC3E42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </Svg>
                    </RectButton>
                </View>
            </Reanimated.View>
        );
    }

    const height = 38;
    const maxShots = item.shots > 36 ? item.shots : 36;
    const highlightColor = item.status === 'in-camera' ? '#B3F5C3' : item.status === 'developing' ? '#FEF08A' : '#BDBDBD';

    return (
        <GestureHandlerRootView>
            <ReanimatedSwipeable renderRightActions={RightAction}>
                <View style={{ backgroundColor: '#FFFFFF0D', borderRadius: 32, padding: 24, marginBottom: 12, marginLeft: 12, marginRight: 12 }}>
                    <Text style={{ backgroundColor: highlightColor, color: '#18181B', fontFamily: 'Lufga-Regular', fontSize: 12, lineHeight: 20, paddingBlock: 6, paddingInline: 8, borderRadius: 24, position: 'absolute', right: 10, top: 10 }}>{item.status}</Text>
                    <Text style={{ color: '#FFFFFF99', fontFamily: 'Lufga-Regular', fontSize: 16, lineHeight: 24, marginBottom: 4 }}>{item.camera} - {item.date}</Text>
                    <Text style={{ color: '#FAFAFA', fontFamily: 'Lufga-Medium', fontSize: 32, lineHeight: 40, marginBottom: 32 }}>{item.film}</Text>

                    <View
                        style={{
                            width: "100%",
                            height: height,
                            backgroundColor: '#ffffff0D',
                            borderRadius: height / 2,
                            overflow: "hidden",
                        }}
                    >
                        <View
                            style={{
                                width: `${(item.shots / maxShots) * 100}%`,
                                minWidth: '20%',
                                height: "100%",
                                backgroundColor: highlightColor,
                                borderRadius: height / 2,
                            }}
                        >
                            <Text style={{ color: '#18181B', fontFamily: 'Lufga-Medium', fontSize: 18, lineHeight: 26, position: 'absolute', left: 10, top: (height - 26) / 2 }}>{item.shots}/{maxShots}</Text>
                        </View>
                    </View>
                </View >
            </ReanimatedSwipeable>
        </GestureHandlerRootView>
    )

}

const styles = StyleSheet.create({
    rightAction: { width: 50, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'purple' },
    separator: {
        width: '100%',
        borderTopWidth: 1,
    },
    swipeable: {
        height: 50,
        backgroundColor: 'papayawhip',
        alignItems: 'center',
    },
});