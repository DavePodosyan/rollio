import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View, Pressable, Platform, PlatformColor } from "react-native";

const platformColor = (iosName: string, androidName: string) => (
    PlatformColor(Platform.OS === 'ios' ? iosName : androidName)
);

const lightMeterLayoutColors = {
    label: platformColor('label', '?android:attr/textColorPrimary'),
    systemBackground: platformColor('systemBackground', '?android:attr/windowBackground'),
};

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
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
                    headerTintColor: String(lightMeterLayoutColors.label),
                    title: '',
                    headerTitleStyle: { fontFamily: 'LufgaMedium', fontSize: 20 },
                    presentation: "formSheet",
                    gestureEnabled: false,
                    sheetGrabberVisible: false,
                    contentStyle: { backgroundColor: isGlassAvailable ? "transparent" : lightMeterLayoutColors.systemBackground },
                    sheetAllowedDetents: [0.45],
                    sheetExpandsWhenScrolledToEdge: false,
                    sheetInitialDetentIndex: 0,
                    sheetLargestUndimmedDetentIndex: 0,
                }}
            />
        </Stack>
    );
}
