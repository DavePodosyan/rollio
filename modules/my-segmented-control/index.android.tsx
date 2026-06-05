import { Host, Picker } from '@expo/ui/jetpack-compose';
import React, { useMemo } from 'react';
import { ColorValue, ViewProps } from 'react-native';

export type MySegmentedControlProps = {
  values: string[];
  selectedIndex?: number;
  activeColors?: string[];
  activeTextColor?: string;
  inactiveTextColor?: string;
  segmentBackgroundColor?: string;
  onValueChange?: (event: { nativeEvent: { value: string; index: number } }) => void;
} & ViewProps;

export default function MySegmentedControl({
  values,
  selectedIndex = 0,
  activeColors,
  activeTextColor,
  inactiveTextColor,
  segmentBackgroundColor,
  onValueChange,
  style,
}: MySegmentedControlProps) {
  const activeColor = activeColors?.[selectedIndex] as ColorValue | undefined;

  const elementColors = useMemo(
    () => ({
      activeContainerColor: activeColor,
      activeContentColor: activeTextColor as ColorValue | undefined,
      inactiveContainerColor: segmentBackgroundColor as ColorValue | undefined,
      inactiveContentColor: inactiveTextColor as ColorValue | undefined,
    }),
    [activeColor, activeTextColor, inactiveTextColor, segmentBackgroundColor]
  );

  return (
    <Host style={style}>
      <Picker
        options={values}
        selectedIndex={selectedIndex}
        variant="segmented"
        color={activeColor}
        elementColors={elementColors}
        onOptionSelected={({ nativeEvent }) => {
          onValueChange?.({
            nativeEvent: {
              value: nativeEvent.label,
              index: nativeEvent.index,
            },
          });
        }}
      />
    </Host>
  );
}
