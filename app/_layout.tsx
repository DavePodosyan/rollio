import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from '@/services/database';
import { cleanupStaleArchives, recoverInterruptedRestore } from '@/services/backup';
import { Stack } from 'expo-router';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router/react-navigation";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import WidgetSync from '@/components/WidgetSync';
import { headerFollowsSystemAppearance } from '@/utils/headerAppearance';

SplashScreen.preventAutoHideAsync();

// The iOS widgets register themselves on import; Android's are registered in index.ts.
if (Platform.OS === 'ios') {
    require('@/widgets/RollWidget');
    require('@/widgets/LightMeterWidget');
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [fontsLoaded] = useFonts({
        LufgaRegular: require('../assets/fonts/Lufga-Regular.ttf'),
        LufgaMedium: require('../assets/fonts/Lufga-Medium.ttf'),
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    // Backup archives are left in the cache after sharing (the receiving app may
    // still be reading them); sweep them on the next launch instead. Also put
    // the photo folder back if a restore was interrupted by the app being killed.
    useEffect(() => {
        cleanupStaleArchives();
        recoverInterruptedRestore();
    }, []);

    // Android: when the system switches light/dark with the app open, the status bar icons keep
    // their old colour (dark icons on the dark background) although <StatusBar> below is given the
    // new style at once; something native resets it during the switch. Applying the style again
    // just after the switch makes it stick. Found by testing; the delay is a margin, not a measured value.
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const timer = setTimeout(() => setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark'), 400);
        return () => clearTimeout(timer);
    }, [colorScheme]);

    if (!fontsLoaded) {
        return null; // Or splash component
    }

    return (
        <I18nextProvider i18n={i18n}>
            <SafeAreaProvider>
                <SQLiteProvider databaseName="rollio.db" onInit={initDatabase}>
                    <WidgetSync />
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                            <StatusBar
                                style={colorScheme === 'dark' ? 'light' : 'dark'}
                            />
                            <Stack screenOptions={{
            ...headerFollowsSystemAppearance,
                                headerShown: false,
                            }}>
                                <Stack.Screen name="(tabs)" />

                                <Stack.Screen name="(modal)" options={{
                                    presentation: "modal",
                                    gestureEnabled: true,
                                    headerShown: false
                                }} />
                            </Stack>
                        </ThemeProvider>

                    </GestureHandlerRootView>
                </SQLiteProvider>
            </SafeAreaProvider>
        </I18nextProvider>
    );
}
