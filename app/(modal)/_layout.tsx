// app/(modal)/_layout.tsx
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { TouchableOpacity, useColorScheme, View } from "react-native";

export default function ModalLayout() {

    const colorScheme = useColorScheme();

    return (
        <Stack screenOptions={{
            presentation: "modal",
            headerShown: true,
            headerTransparent: true,
            headerTintColor: colorScheme === "dark" ? "#fff" : "#100528",
            headerTitleStyle: { fontFamily: 'LufgaMedium' },
            contentStyle: { backgroundColor: colorScheme === 'dark' ? "#1c1c1e" : "#F2F2F6" },
            headerLeft: () => (
                <View>
                    <TouchableOpacity onPress={() => router.back()} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                        <SymbolView name="xmark" size={22} tintColor={colorScheme === 'dark' ? "#ffffff" : "#100528"} />
                    </TouchableOpacity>
                </View>
            ),
        }}>
            <Stack.Screen name="new-film" options={{
                title: "Add New Film"
            }} />

            <Stack.Screen name="new-frame" options={{
                title: "Add New Frame"
            }} />
        </Stack>
    );
}