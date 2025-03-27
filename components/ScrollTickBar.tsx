import React, { useRef } from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_WIDTH = 14;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ScrollTickBar({ values, selectedIndex, onValueChange }) {
  const listRef = useRef();
  const lastIndex = useRef(selectedIndex);

  const handleScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    if (index !== lastIndex.current && index >= 0 && index < values.length) {
      lastIndex.current = index;
      Haptics.selectionAsync();
      onValueChange(index);
    }
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={values}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_WIDTH / 2 - ITEM_WIDTH / 2,
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        initialScrollIndex={selectedIndex}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ width: '100%' }}
        renderItem={({ index }) => (
          <View
            style={[
              styles.tick,
              index % 5 === 0 && styles.majorTick,
              index === selectedIndex && styles.selectedTick,
            ]}
          />
        )}
      />
      <View style={styles.centerIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  tick: {
    height: 10,
    width: 2,
    backgroundColor: '#444',
    marginHorizontal: ITEM_WIDTH / 4,
    opacity: 0.5,
  },
  majorTick: {
    height: 18,
    opacity: 0.9,
    backgroundColor: '#999',
  },
  selectedTick: {
    backgroundColor: '#A78BFA',
    height: 22,
    opacity: 1,
  },
  centerIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: SCREEN_WIDTH / 2 - 1,
    width: 2,
    backgroundColor: '#A78BFA',
  },
});