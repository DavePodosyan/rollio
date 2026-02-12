// import { useNavigation } from 'expo-router';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';

export default function TabsLayout() {
  // const colorScheme = useColorScheme();
  const isGlassAvailable = isLiquidGlassAvailable();

  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"  // Uncomment for scroll-hide
      // iconColor={colorScheme === 'dark' ? '#fff' : '#100528'}
      iconColor={DynamicColorIOS({
        light: '#100528',
        dark: '#ffffff',
      })}
      tintColor={DynamicColorIOS({
        light: '#39128f',
        dark: '#a583ef',
      })}
      backgroundColor={DynamicColorIOS({
        light: '#EFF0F4',
        dark: '#09090B',
      })}
      disableTransparentOnScrollEdge={isGlassAvailable ? false : true}
    >
      {/* <NativeTabs.Trigger.TabBar
        backgroundColor="red"  // Temp for testing; adjust
        iconColor="red"
      /> */}

      <NativeTabs.Trigger name="films"
        options={{
          backgroundColor: DynamicColorIOS({
            light: '#EFF0F4',
            dark: '#09090B',
          }),
        }} >
        <Icon sf="film.stack.fill" />
        <Label>Films</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="light_meter" options={{
        backgroundColor: DynamicColorIOS({
          light: '#EFF0F4',
          dark: '#09090B',
        })
      }}>
        <Icon sf="sun.max.fill" />
        <Label>Light Meter</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support" options={{
        backgroundColor: DynamicColorIOS({
          light: '#EFF0F4',
          dark: '#09090B',
        }),
      }}>
        <Icon sf="heart.fill" />
        <Label>Support</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}