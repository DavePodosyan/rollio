import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { useColorScheme, StyleSheet } from "react-native";

export default function Index() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

  const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
    ? ['#09090B', '#100528', '#09090B']
    : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0.1, 0.4, 0.9]}
      // dither={false}
      style={StyleSheet.absoluteFillObject}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Redirect href="/(tabs)/films" />
    </LinearGradient>

  );
}