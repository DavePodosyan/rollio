import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View, useColorScheme, Pressable } from "react-native";

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
    const colorScheme = useColorScheme();
    return (
        <Stack screenOptions={{
            headerShown: true,
            headerBackVisible: true,
            headerBackButtonDisplayMode: 'minimal',
            headerLargeTitle: true,
            headerTransparent: true,
            headerTintColor: colorScheme === 'dark' ? '#fff' : '#100528',
            headerLargeStyle: { backgroundColor: "transparent" },
            headerTitleStyle: { fontFamily: 'LufgaMedium', color: colorScheme === 'dark' ? '#fff' : '#100528' },
            headerLargeTitleStyle: { fontFamily: 'LufgaMedium', color: colorScheme === 'dark' ? '#fff' : '#100528' },
            headerBlurEffect: isGlassAvailable ? undefined : colorScheme === 'dark' ? "dark" : "light",
            title: "",
            contentStyle: { backgroundColor: "transparent" },

        }}>
            <Stack.Screen name="index"
                options={{
                    title: "Film Rolls"
                }}
            />
            <Stack.Screen name="[id]"
                options={{
                    title: "",
                }}
            />
        </Stack>
    );
}
