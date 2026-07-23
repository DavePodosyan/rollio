import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Stack } from "expo-router";
import { Platform, useColorScheme, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
            headerBackButtonDisplayMode: 'minimal',
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
            headerBlurEffect: !isAndroid && !isGlassAvailable ? colorScheme === 'dark' ? "dark" : "light" : undefined,
            title: "",
            contentStyle: { backgroundColor: isAndroid ? androidBackgroundColor : "transparent" },

        }}>
            <Stack.Screen name="index"
                options={{
                    title: t('rollList.title'),
                    headerRight: isAndroid ? () => (
                        <Pressable
                            onPress={() => router.push('/new-film')}
                            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <MaterialIcons
                                name="add"
                                size={24}
                                color={colorScheme === 'dark' ? '#fff' : '#100528'}
                            />
                        </Pressable>
                    ) : undefined,
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
