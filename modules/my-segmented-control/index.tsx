import { requireNativeView } from 'expo';
import React from 'react';
import { ViewProps } from 'react-native';

export type MySegmentedControlProps = {
  values: string[];
  selectedIndex?: number;
  activeColors?: string[];
  
  // New Props
  activeTextColor?: string;
  inactiveTextColor?: string;
  segmentBackgroundColor?: string; 

  onValueChange?: (event: { nativeEvent: { value: string; index: number } }) => void;
} & ViewProps;

const NativeView: React.ComponentType<MySegmentedControlProps> =
  requireNativeView('MySegmentedControl');

export default function MySegmentedControl(props: MySegmentedControlProps) {
  return <NativeView {...props} />;
}
