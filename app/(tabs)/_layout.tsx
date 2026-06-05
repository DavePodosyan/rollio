// import { useNavigation } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, PlatformColor, useColorScheme } from 'react-native';

export default function TabsLayout() {
  // const colorScheme = useColorScheme();
  const isGlassAvailable = isLiquidGlassAvailable();
  const colorScheme = useColorScheme();
  const isAndroid = Platform.OS === 'android';
  const androidTabBarBackground = colorScheme === 'dark' ? '#09090B' : '#EFF0F4';
  const androidInactiveColor = colorScheme === 'dark' ? '#9A96A8' : '#6B6877';
  const androidActiveColor = colorScheme === 'dark' ? '#E5E0FF' : '#39128F';
  const androidIndicatorColor = colorScheme === 'dark' ? '#2A2440' : '#E5E0FF';

  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"
      iconColor={isAndroid ? { default: androidInactiveColor, selected: androidActiveColor } : PlatformColor('label')}
      // tintColor={colorScheme === 'dark' ? '#a583ef' : '#39128f'}
      tintColor={isAndroid ? androidActiveColor : PlatformColor('systemIndigo')}
      backgroundColor={isAndroid ? androidTabBarBackground : colorScheme === 'dark' ? '#09090B' : '#EFF0F4'}
      disableTransparentOnScrollEdge={isGlassAvailable ? false : true}
      indicatorColor={androidIndicatorColor}
    >

      <NativeTabs.Trigger name="films">
        <NativeTabs.Trigger.Icon sf="film.stack.fill" md="camera_roll" />
        <NativeTabs.Trigger.Label>Films</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="light_meter">
        <NativeTabs.Trigger.Icon sf="sun.max.fill" md="light_mode" />
        <NativeTabs.Trigger.Label>Light Meter</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support">
        <NativeTabs.Trigger.Icon sf="heart.fill" md="favorite" />
        <NativeTabs.Trigger.Label>Support</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
