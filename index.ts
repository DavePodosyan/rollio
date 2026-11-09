import 'expo-router/entry';
import { Platform } from 'react-native';

// The Android widget library needs its task registered at the app's entry point.
if (Platform.OS === 'android') {
    require('./widgets/android/register');
}
