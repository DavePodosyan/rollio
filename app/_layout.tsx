import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { View, ImageBackground } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Lufga-Regular': require('../assets/fonts/Lufga-Regular.ttf'),
    'Lufga-Medium': require('../assets/fonts/Lufga-Medium.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (

    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#09090B",
          }
        }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="film" />
        <Stack.Screen name="add_film" options={{ presentation: 'modal' }} />
      </Stack>

      <StatusBar style="light" />
    </>

  );
}
