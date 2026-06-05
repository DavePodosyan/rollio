import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from '@/services/database';
import { Stack } from 'expo-router';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';

SplashScreen.preventAutoHideAsync();

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

    useEffect(() => {
        setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark', true);
    }, [colorScheme]);

    if (!fontsLoaded) {
        return null; // Or splash component
    }

    return (
        <SafeAreaProvider>
            <SQLiteProvider databaseName="rollio.db" onInit={initDatabase}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                        <StatusBar
                            style={colorScheme === 'dark' ? 'light' : 'dark'}
                        />
                        <Stack screenOptions={{
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
    );
}
