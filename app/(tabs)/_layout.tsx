// import { useNavigation } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

export default function TabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs
      // minimizeBehavior="onScrollDown"  // Uncomment for scroll-hide
      iconColor={colorScheme === 'dark' ? '#fff' : '#100528'}
      tintColor={colorScheme === 'dark' ? '#a583ef' : '#39128f'}
    // backgroundColor="#09090B"
    // disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger.TabBar
        backgroundColor="red"  // Temp for testing; adjust
        iconColor="red"

      />

      <NativeTabs.Trigger name="films" options={{ backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4', }} >
        <Icon sf="film.stack.fill" />
        <Label>Films</Label>

      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="support" options={{ backgroundColor: colorScheme === 'dark' ? '#09090B' : '#EFF0F4' }}>
        <Icon sf="heart.fill" />
        <Label>Support</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}