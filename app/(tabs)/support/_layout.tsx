import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";

export default function HomeLayout() {
    const isGlassAvailable = isLiquidGlassAvailable();
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isAndroid = Platform.OS === "android";
    const androidBackgroundColor = colorScheme === 'dark' ? '#09090B' : '#EFF0F4';

    return (
        <Stack screenOptions={{
            headerShown: true,
            headerBackVisible: true,
            headerLargeTitle: !isAndroid,
            headerTransparent: !isAndroid,
            headerTintColor: colorScheme === 'dark' ? '#fff' : '#100528',
            headerStyle: { backgroundColor: isAndroid ? androidBackgroundColor : "transparent" },
            headerLargeStyle: { backgroundColor: isAndroid ? androidBackgroundColor : "transparent" },
            headerTitleStyle: {
                fontFamily: 'LufgaMedium',
                color: colorScheme === 'dark' ? '#fff' : '#100528',
                fontSize: isAndroid ? 22 : undefined,
            },
            headerLargeTitleStyle: { fontFamily: 'LufgaMedium', color: colorScheme === 'dark' ? '#fff' : '#100528' },
            headerBlurEffect: !isAndroid && !isGlassAvailable ? "systemMaterialDark" : undefined,
            title: "",
            contentStyle: { backgroundColor: isAndroid ? androidBackgroundColor : "transparent" },

        }}> {/* Hide root header; show per-screen */}
            <Stack.Screen
                name="index"
                options={{
                    title: t('support.aboutTitle'),
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
