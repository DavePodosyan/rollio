import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View, Pressable, Platform, PlatformColor, useColorScheme } from "react-native";

const platformColor = (iosName: string, androidName: string) => (
    PlatformColor(Platform.OS === 'ios' ? iosName : androidName)
);

const lightMeterLayoutColors = {
    label: platformColor('label', '?android:attr/textColorPrimary'),
    systemBackground: platformColor('systemBackground', '?android:attr/windowBackground'),
};

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
    const colorScheme = useColorScheme();
    const isAndroid = Platform.OS === 'android';
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },

        }}>
            <Stack.Screen
                name="index"
                options={{
                    // iOS carries the planner's sun in a transparent header, the way the
                    // Films tab carries its "+". Android draws its own button on the screen.
                    headerShown: !isAndroid,
                    headerTransparent: true,
                    title: '',
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#100528',
                }}
            />

            <Stack.Screen
                name="formsheet"
                options={({ route }) => {
                    // The exposure planner opens taller: it carries the scene card above the columns.
                    const isSceneMode = (route.params as { mode?: string } | undefined)?.mode === 'scene';
                    return {
                        headerShown: true,
                        headerTransparent: true,
                        headerTintColor: String(lightMeterLayoutColors.label),
                        title: '',
                        headerTitleStyle: { fontFamily: 'LufgaMedium', fontSize: 20 },
                        presentation: "formSheet",
                        gestureEnabled: false,
                        sheetGrabberVisible: false,
                        contentStyle: { backgroundColor: isGlassAvailable ? "transparent" : lightMeterLayoutColors.systemBackground },
                        sheetAllowedDetents: [isSceneMode ? 0.68 : 0.45],
                        sheetExpandsWhenScrolledToEdge: false,
                        sheetInitialDetentIndex: 0,
                        sheetLargestUndimmedDetentIndex: 0,
                    };
                }}
            />
        </Stack>
    );
}
