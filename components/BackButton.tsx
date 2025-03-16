// components/AddButton.tsx
import { TouchableOpacity, Image } from "react-native";
import { ViewStyle, Text } from "react-native";
import { Svg, Path, G, ClipPath, Rect, Defs } from "react-native-svg";
import { router } from 'expo-router';

interface AddButtonProps {
    style?: ViewStyle;
}

export default function BackButton({ style }: AddButtonProps) {

    const onPress = () => {
        router.back();
    };

    return (

        <TouchableOpacity
            onPress={onPress}
            style={[{
                width: 52,
                height: 52,
                backgroundColor: "#ffffff0D",
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
            }, [style]]}
        >
            <Svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                <G clip-path="url(#clip0_2017_4992)">
                    <Path d="M27.9827 16H5.98267" stroke="#FAFAFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M14.9827 7L5.98267 16L14.9827 25" stroke="#FAFAFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </G>
                <Defs>
                    <ClipPath id="clip0_2017_4992">
                        <Rect width="32" height="32" fill="white" transform="translate(0.982666)" />
                    </ClipPath>
                </Defs>
            </Svg>


        </TouchableOpacity >

    );
}