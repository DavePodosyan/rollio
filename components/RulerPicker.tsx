import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Dimensions, View, Text, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Animated, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import GlassView from 'expo-glass-effect/build/GlassView';

import { useColorScheme } from 'react-native';

export type RulerPickerProps = {
  label: string;
  values: Array<number | string>;
  initial: number | string;
  onChange?: (value: number | string) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TICK_THIN = 13;   // small tick height
const TICK_THICK = 26;  // large tick height (for major stops)
const THIN_RATIO = TICK_THIN / TICK_THICK;
const THIN_OFFSET = (TICK_THICK * (1 - THIN_RATIO)) / 2;

const RulerPicker: React.FC<RulerPickerProps> = ({
  label,
  initial,
  values,
  onChange
}) => {
  const colorScheme = useColorScheme();
  const flatListRef = useRef<FlatList>(null);
  const lastHapticIndex = useRef<number | null>(null);
  const scrollX = useRef(new Animated.Value(0));
  const height = 68;
  const tickWidth = 20;

  const startIndex = useMemo(() => {
    return values.indexOf(initial);
  }, [initial, values]);

  const [selectedIndex, setSelectedIndex] = useState<number>(startIndex);


  // pad so the center marker aligns with a tick
  const sidePadding = useMemo(() => (SCREEN_WIDTH - 40 - tickWidth) / 2, [tickWidth]);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    flatListRef.current?.scrollToIndex({ index, animated }); // Center the index
  }, []);

  const clampIndex = useCallback((index: number) => {
    return Math.max(0, Math.min(values.length - 1, index));
  }, [values.length]);

  const notifyChange = useCallback((index: number) => {
    const safe = clampIndex(index);
    onChange?.(values[safe]);
  }, [clampIndex, onChange, values]);

  const maybeHapticForIndex = useCallback((index: number) => {
    if (index !== lastHapticIndex.current) {
      lastHapticIndex.current = index;
      Haptics.selectionAsync().catch(() => { });
    }
  }, []);

  // Snap at end of momentum scroll
  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / tickWidth);
    const safe = clampIndex(index);
    notifyChange(safe);
    if (safe !== selectedIndex) {
      setSelectedIndex(safe);
      // notifyChange(safe);
      maybeHapticForIndex(safe);
    }
  };

  const animatedOnScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX.current } } }],
    {
      useNativeDriver: true, // Now possible with transform/opacity
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        const index = Math.round(x / tickWidth);
        const safe = clampIndex(index);
        if (safe !== selectedIndex) {
          setSelectedIndex(safe);
          // notifyChange(safe);
          maybeHapticForIndex(safe);
        }
      },
    }
  );

  useEffect(() => {
    // 1. Synchronize the animated value immediately (fixes the "invisible" ticks)
    const initialOffset = startIndex * tickWidth;
    scrollX.current.setValue(initialOffset);

    // 2. Perform the scroll jump
    const id = setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: initialOffset,
          animated: false,
        });
      }
    }, 16); // 16ms is roughly 1 frame, usually enough for the native side to bridge

    return () => clearTimeout(id);
  }, [startIndex, tickWidth]);

  const renderTick = useCallback(({ item, index }: { item: number | string; index: number }) => {
    const inputRange = [
      (index - 2) * tickWidth,
      (index - 1) * tickWidth,
      index * tickWidth,
      (index + 1) * tickWidth,
      (index + 2) * tickWidth,
    ];
    const scaleY = scrollX.current.interpolate({
      inputRange,
      outputRange: [THIN_RATIO, THIN_RATIO, 1, THIN_RATIO, THIN_RATIO],
      extrapolate: 'extend',
    });
    const translateY = scrollX.current.interpolate({
      inputRange,
      outputRange: [THIN_OFFSET, THIN_OFFSET, 0, THIN_OFFSET, THIN_OFFSET],
      extrapolate: 'extend',
    });
    const animatedOpacity = scrollX.current.interpolate({
      inputRange,
      outputRange: [0.4, 0.65, 1, 0.65, 0.4],
      extrapolate: 'extend',
    });
    const isSelected = index === selectedIndex;
    const isAuto = item === 'Auto';
    const tickSchemaColor = colorScheme === 'dark' ? '#ffffff' : '#8E8E93';
    const tickColor = isSelected && isAuto ? '#4CAF50' : tickSchemaColor;

    return (
      <View style={[styles.tickCell, { width: tickWidth }]}>
        <Animated.View
          style={[
            styles.tick,
            {
              height: TICK_THICK, // Fixed height
              opacity: animatedOpacity,
              transform: [{ scaleY }, { translateY }],
              backgroundColor: tickColor,
            },
          ]}
        />
      </View>
    );
  }, [tickWidth, selectedIndex, colorScheme]);

  const getItemLayout = useCallback(
    (data: ArrayLike<number | string> | null | undefined, index: number) => ({
      length: tickWidth,
      offset: tickWidth * index,
      index,
    }),
    [tickWidth]
  );

  const keyExtractor = useCallback((item: number | string, index: number) => `${item}-${index}`, []);

  return (
    <GlassView
      isInteractive={true}
      tintColor={colorScheme === 'dark' ? '#09090b6d' : '#ffffff'}
      style={{
        width: '100%',
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 35,
      }}
    >
      <GlassView isInteractive={false} glassEffectStyle="clear" style={{ position: 'absolute', top: 17.5, left: 14, height: 35, paddingLeft: 12, paddingRight: 12, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }} >
        <Text style={{ color: colorScheme === 'dark' ? 'white' : '#100528', fontFamily: 'LufgaMedium', fontSize: 12 }}>{label}</Text>
      </GlassView>

      <Text style={{ color: values[selectedIndex] === 'Auto' ? '#4CAF50' : colorScheme === 'dark' ? 'white' : '#100528', fontFamily: 'LufgaMedium', position: 'absolute', zIndex: 1, top: 6 }}>{values[selectedIndex]}</Text>

      <View style={[styles.container, { height }]}>
        <Animated.FlatList
          ref={flatListRef}
          initialScrollIndex={startIndex}
          data={values}
          renderItem={renderTick}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={tickWidth}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={animatedOnScroll}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          scrollEventThrottle={16}
          bounces
          overScrollMode="always"
          getItemLayout={getItemLayout}
          initialNumToRender={20} // Enough for initial load
          maxToRenderPerBatch={10}
          windowSize={11} // ~5 items on each side; tune if needed (lower = better perf, higher = smoother pre-rendering)
        />
      </View>
    </GlassView>
  );
};

export default RulerPicker;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    borderRadius: 34,
    overflow: 'hidden',
  },
  tickCell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tick: {
    width: 2,
    borderRadius: 1,
    marginBottom: 8
  },
});