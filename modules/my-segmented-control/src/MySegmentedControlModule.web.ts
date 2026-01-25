import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './MySegmentedControl.types';

type MySegmentedControlModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class MySegmentedControlModule extends NativeModule<MySegmentedControlModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(MySegmentedControlModule, 'MySegmentedControlModule');
