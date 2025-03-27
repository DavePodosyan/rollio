// components/AddButton.tsx
import { TouchableOpacity, Image } from "react-native";
import { ViewStyle, Text } from "react-native";
import { Svg, Path } from "react-native-svg";
import { Link, router, type Href } from 'expo-router';

interface AddButtonProps {
    href: Href;
    style?: ViewStyle;
}

export default function AddButton({ style, href }: AddButtonProps) {

    const onPress = () => {
        router.push(href);
    };

    return (

        <TouchableOpacity
            onPress={onPress}
            style={[{
                width: 52,
                height: 52,
                backgroundColor: "#ffffff",
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
            }, [style]]}
        >
            <Svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                <Path d="M16.9827 16V8M16.9827 16H8.98267M16.9827 16H24.9827M16.9827 16V24" stroke="#09090B" strokeWidth="1.5" strokeLinecap="round" />
            </Svg>

        </TouchableOpacity >

    );
}