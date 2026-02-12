import { Button, Host } from "@expo/ui/swift-ui";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View, StyleSheet, useColorScheme, Pressable, PlatformColor } from "react-native";

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
    const colorScheme = useColorScheme();
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },

        }}> {/* Hide root header; show per-screen */}
            <Stack.Screen name="index" />

            <Stack.Screen
                name="formsheet"
                options={{
                    headerShown: true,
                    headerTransparent: true,
                    headerTintColor: String(PlatformColor('label')),
                    title: '',
                    headerTitleStyle: { fontFamily: 'LufgaMedium', fontSize: 20 },
                    headerLeft: () => (
                        <View>
                            <Pressable onPress={() => router.back()} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                                <SymbolView name="xmark" size={22} tintColor={PlatformColor('label')} />
                            </Pressable>
                        </View>
                    ),
                    presentation: "formSheet",
                    gestureEnabled: false,
                    sheetGrabberVisible: false,
                    contentStyle: { backgroundColor: isGlassAvailable ? "transparent" : PlatformColor('systemBackground') },
                    sheetAllowedDetents: [0.45],
                    sheetExpandsWhenScrolledToEdge: false,
                    sheetInitialDetentIndex: 0,
                    sheetLargestUndimmedDetentIndex: 0,
                }}
            />
        </Stack>
    );
}
