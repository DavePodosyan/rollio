import { NativeModule, requireNativeModule } from 'expo';

import { MySegmentedControlModuleEvents } from './MySegmentedControl.types';

declare class MySegmentedControlModule extends NativeModule<MySegmentedControlModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MySegmentedControlModule>('MySegmentedControl');
