import * as React from 'react';

import { MySegmentedControlViewProps } from './MySegmentedControl.types';

export default function MySegmentedControlView(props: MySegmentedControlViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
