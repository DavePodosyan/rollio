import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
    const colorScheme = useColorScheme();
    return (
        <Stack screenOptions={{
            headerShown: true,
            headerBackVisible: true,
            headerLargeTitle: true,
            headerTransparent: true,
            headerTintColor: colorScheme === 'dark' ? '#fff' : '#100528',
            headerLargeStyle: { backgroundColor: "transparent" },
            headerTitleStyle: { fontFamily: 'LufgaMedium', color: colorScheme === 'dark' ? '#fff' : '#100528' },
            headerLargeTitleStyle: { fontFamily: 'LufgaMedium', color: colorScheme === 'dark' ? '#fff' : '#100528' },
            headerBlurEffect: isGlassAvailable ? undefined : "systemMaterialDark",
            title: "",
            contentStyle: { backgroundColor: "transparent" },

        }}> {/* Hide root header; show per-screen */}
            <Stack.Screen
                name="index"
                options={{
                    title: "About Rollio",
                    // headerRight: () => (
                    //     <View>
                    //         <Pressable onPress={() => router.push('/home/new_film')} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                    //             <SymbolView name="minus" size={22} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                    //         </Pressable>
                    //     </View>
                    // ),
                }}
            />
        </Stack>
    );
}
