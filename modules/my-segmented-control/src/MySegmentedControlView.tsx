import { requireNativeView } from 'expo';
import * as React from 'react';

import { MySegmentedControlViewProps } from './MySegmentedControl.types';

const NativeView: React.ComponentType<MySegmentedControlViewProps> =
  requireNativeView('MySegmentedControl');

export default function MySegmentedControlView(props: MySegmentedControlViewProps) {
  return <NativeView {...props} />;
}
