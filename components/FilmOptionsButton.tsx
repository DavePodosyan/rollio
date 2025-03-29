// components/AddButton.tsx
import { TouchableOpacity, Image } from "react-native";
import { ViewStyle, Text } from "react-native";
import { Svg, Path, G, ClipPath, Rect, Defs } from "react-native-svg";
import { router } from 'expo-router';

interface AddButtonProps {
    onPress?: () => void;
    style?: ViewStyle;
}

export default function FilmOptionsButton({ style, onPress }: AddButtonProps) {

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
                <G clipPath="url(#clip0_2017_5151)">
                    <Path d="M16.9827 17.5C17.8111 17.5 18.4827 16.8284 18.4827 16C18.4827 15.1716 17.8111 14.5 16.9827 14.5C16.1542 14.5 15.4827 15.1716 15.4827 16C15.4827 16.8284 16.1542 17.5 16.9827 17.5Z" fill="#FAFAFA" />
                    <Path d="M16.9827 9C17.8111 9 18.4827 8.32843 18.4827 7.5C18.4827 6.67157 17.8111 6 16.9827 6C16.1542 6 15.4827 6.67157 15.4827 7.5C15.4827 8.32843 16.1542 9 16.9827 9Z" fill="#FAFAFA" />
                    <Path d="M16.9827 26C17.8111 26 18.4827 25.3284 18.4827 24.5C18.4827 23.6716 17.8111 23 16.9827 23C16.1542 23 15.4827 23.6716 15.4827 24.5C15.4827 25.3284 16.1542 26 16.9827 26Z" fill="#FAFAFA" />
                </G>
                <Defs>
                    <ClipPath id="clip0_2017_5151">
                        <Rect width="32" height="32" fill="white" transform="translate(0.982666)" />
                    </ClipPath>
                </Defs>
            </Svg>



        </TouchableOpacity >

    );
}