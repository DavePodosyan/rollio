// import { useNavigation } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { PlatformColor, useColorScheme } from 'react-native';

export default function TabsLayout() {
  // const colorScheme = useColorScheme();
  const isGlassAvailable = isLiquidGlassAvailable();
  const colorScheme = useColorScheme();
  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"
      iconColor={PlatformColor('label')}
      tintColor={colorScheme === 'dark' ? '#a583ef' : '#39128f'}
      backgroundColor={colorScheme === 'dark' ? '#09090B' : '#EFF0F4'}
      disableTransparentOnScrollEdge={isGlassAvailable ? false : true}
    >

      <NativeTabs.Trigger name="films">
        <NativeTabs.Trigger.Icon sf="film.stack.fill" drawable="home_drawable" />
        <NativeTabs.Trigger.Label>Films</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="light_meter">
        <NativeTabs.Trigger.Icon sf="sun.max.fill" />
        <NativeTabs.Trigger.Label>Light Meter</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support">
        <NativeTabs.Trigger.Icon sf="heart.fill" />
        <NativeTabs.Trigger.Label>Support</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}