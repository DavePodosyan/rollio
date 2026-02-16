// import { useNavigation } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { PlatformColor, useColorScheme } from 'react-native';

export default function TabsLayout() {
  // const colorScheme = useColorScheme();
  const isGlassAvailable = isLiquidGlassAvailable();
  const colorScheme = useColorScheme();
  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"  // Uncomment for scroll-hide
      // iconColor={colorScheme === 'dark' ? '#fff' : '#100528'}
      iconColor={colorScheme === 'dark' ? '#ffffff' : PlatformColor('label')}
      tintColor={colorScheme === 'dark' ? '#a583ef' : '#39128f'}
      backgroundColor={colorScheme === 'dark' ? '#09090B' : '#EFF0F4'}
      disableTransparentOnScrollEdge={isGlassAvailable ? false : true}
    >
      {/* <NativeTabs.Trigger.TabBar
        backgroundColor="red"  // Temp for testing; adjust
        iconColor="red"
      /> */}

      <NativeTabs.Trigger name="films"
        options={{
          backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4',
        }} >
        <Icon sf="film.stack.fill" drawable="home_drawable" />
        <Label>Films</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="light_meter" options={{
        backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4',
      }}>
        <Icon sf="sun.max.fill" />
        <Label>Light Meter</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support" options={{
        backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4',
      }}>
        <Icon sf="heart.fill" />
        <Label>Support</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}