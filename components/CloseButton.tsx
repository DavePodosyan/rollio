// components/AddButton.tsx
import { TouchableOpacity, Image } from "react-native";
import { ViewStyle, Text } from "react-native";
import { Svg, Path } from "react-native-svg";
import { router } from 'expo-router';

interface CloseButtonProps {
    style?: ViewStyle;
}

export default function CloseButton({ style }: CloseButtonProps) {

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
            <Svg width="33" height="32" viewBox="0 0 33 32" fill="none" style={{ transform: [{ rotate: '45deg' }] }}>
                <Path d="M16.9827 16V8M16.9827 16H8.98267M16.9827 16H24.9827M16.9827 16V24" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" />
            </Svg>

        </TouchableOpacity >

    );
}