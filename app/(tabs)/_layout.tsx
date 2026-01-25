// import { useNavigation } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

export default function TabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"  // Uncomment for scroll-hide
      iconColor="#A8A7FF"
    // backgroundColor="#09090B"
    // disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger.TabBar
        backgroundColor="red"  // Temp for testing; adjust
        iconColor="red"
      />

      <NativeTabs.Trigger name="films" options={{ backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4', }}>
        <Label>Films</Label>
        <Icon sf="film.stack" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support" options={{ backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4' }}>
        <Icon sf="heart.fill" drawable="custom_settings_drawable" />
        <Label>Support</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}