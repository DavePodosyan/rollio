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

        }}> {/* Hide root header; show per-screen */}
            <Stack.Screen
                name="index"
                options={{
                    title: "Film Rolls",
                    headerRight: () => (
                        <View>
                            <Pressable onPress={() => router.push('/new-film')} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                                <SymbolView name="plus" size={22} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                            </Pressable>
                        </View>
                    ),
                }}
            />
            <Stack.Screen
                name="[id]"
                options={{
                    title: "",
                    // headerRight: () => (
                    //     <View>
                    //         <Pressable onPress={() => router.push('/(modal)/new-film')} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                    //             <SymbolView name="plus" size={22} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                    //         </Pressable>
                    //     </View>
                    // ),
                }}
            />
            {/* <Stack.Screen
                name="new_film"
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                    headerShown: true,
                    headerTransparent: true,
                    headerTintColor: "white",
                    headerTitleStyle: { fontFamily: 'LufgaMedium' },
                    headerBlurEffect: isGlassAvailable ? undefined : "systemMaterialDark",
                    title: "Add New Film",
                    contentStyle: { backgroundColor: "#1c1c1e" },
                    headerLeft: () => (
                        <View>
                            <Pressable onPress={() => router.back()} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                                <SymbolView name="xmark" size={22} />
                            </Pressable>
                        </View>
                    ),
                    // headerRight: () => (
                    //     <View style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }}>
                    //         <Host>
                    //             <Button variant="glassProminent">Glass Prominent</Button>
                    //         </Host>
                    //     </View>
                    // ),
                }} /> */}
        </Stack>
    );
}
