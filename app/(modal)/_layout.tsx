// app/(modal)/_layout.tsx
import { Stack } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { useTranslation } from "react-i18next";
import { headerFollowsSystemAppearance } from '@/utils/headerAppearance';

export default function ModalLayout() {

    const colorScheme = useColorScheme();
    const isAndroid = Platform.OS === 'android';
    const { t } = useTranslation();
    const androidBackgroundColor = colorScheme === 'dark' ? '#09090B' : '#EFF0F4';

    return (
        <Stack screenOptions={{
            ...headerFollowsSystemAppearance,
            presentation: "modal",
            headerShown: true,
            headerTransparent: !isAndroid,
            headerTintColor: colorScheme === "dark" ? "#fff" : "#100528",
            headerStyle: { backgroundColor: isAndroid ? androidBackgroundColor : 'transparent' },
            headerTitleStyle: {
                fontFamily: 'LufgaMedium',
                fontSize: isAndroid ? 22 : undefined,
            },
            contentStyle: { backgroundColor: isAndroid ? androidBackgroundColor : colorScheme === 'dark' ? "#1c1c1e" : "#F2F2F6" },
        }}>
            <Stack.Screen name="new-film" options={{
                title: t('newFilm.addTitle')
            }} />

            <Stack.Screen name="new-frame" options={{
                title: t('newFrame.addTitle')
            }} />

            {/* Hands over to new-frame at once (see log-frame.tsx); same title so nothing flickers. */}
            <Stack.Screen name="log-frame" options={{
                title: t('newFrame.addTitle')
            }} />

            <Stack.Screen name="whats-new" options={{
                headerShown: false,
            }} />
        </Stack>
    );
}
