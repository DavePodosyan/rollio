import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import * as Haptics from "expo-haptics";
import { Svg, Path, Defs, Rect, G, ClipPath } from "react-native-svg";

import { isoValues } from '@/utils/values';

const { width } = Dimensions.get("window");
const ITEM_WIDTH = 20;
const CENTER_OFFSET = (width - ITEM_WIDTH) / 2;

const DEFAULT_ISO_INDEX = isoValues.findIndex(
    (item) => item.value === 400
);

interface IsoPickerProps {
    onValueChange?: (value: number) => void;
}

export default function IsoPicker({ onValueChange }: IsoPickerProps) {
    const [iso, setiso] = React.useState(isoValues[DEFAULT_ISO_INDEX].value);
    const flatListRef = React.useRef<FlatList>(null);
    const scrollPosition = React.useRef(0);

    React.useEffect(() => {
        scrollToiso(DEFAULT_ISO_INDEX)
    }, []);

    const renderItem = (item: any, index: any) => {
        return (
            <TouchableOpacity onPress={() => handleSelectiso(index)}>
                <View
                    style={[
                        styles.line,
                        item.major ? styles.majorLine : styles.minorLine,
                        item.value === iso && styles.selectedLine,
                    ]}
                />
            </TouchableOpacity>
        );
    }

    // Handle manual selection
    const handleSelectiso = (index: number) => {
        setiso(isoValues[index].value);
        if (onValueChange) {
            onValueChange(isoValues[index].value);
        }
        scrollToiso(index);
    };

    const scrollToiso = (index: number) => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
                offset: index * ITEM_WIDTH,
                animated: true,
            });
        }
    };

    const handleScroll = (event: any) => {
        const currentScrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(currentScrollPosition / ITEM_WIDTH);

        if (index >= 0 && index < isoValues.length) {
            const newiso = isoValues[index].value;
            if (newiso !== iso) {
                setiso(newiso);

                if (onValueChange) {
                    onValueChange(newiso);
                }

                // Trigger adaptive haptic feedback
                handleHapticFeedback();

                // Update scroll position and time
                scrollPosition.current = currentScrollPosition;
            }
        }
    };

    const handleHapticFeedback = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '50%' }}>
                    <Text style={styles.label}>ISO</Text>
                </View>
                <Text style={[styles.label, styles.value]}>{iso}</Text>
            </View>

            <View style={styles.pickerContainer}>
                <FlatList
                    ref={flatListRef}
                    data={isoValues}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{
                        paddingHorizontal: CENTER_OFFSET,
                    }}
                    onScroll={handleScroll}
                    initialScrollIndex={DEFAULT_ISO_INDEX}
                    getItemLayout={(data, index) => ({
                        length: ITEM_WIDTH,
                        offset: ITEM_WIDTH * index,
                        index,
                    })}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => renderItem(item, index)}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0
    },
    labelContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    iconContainer: {
        width: 30,
        height: 30,
        backgroundColor: '#ffffff0D',
        borderRadius: 12,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    label: {
        fontFamily: 'Lufga-Regular',
        color: '#fff',
        fontSize: 14,
        lineHeight: 24,
    },
    value: {
        width: '50%',
        color: '#A8A7FF'
    },
    pickerContainer: {
        width: "100%",
        height: 60,
        position: "relative",
        overflow: "visible",
        justifyContent: "center",
    },
    line: {
        width: 1,
        marginHorizontal: (ITEM_WIDTH) / 2,
        backgroundColor: "#FAFAFA",
        opacity: 0.4
    },
    majorLine: {
        height: 12,
        backgroundColor: "#FAFAFA",
        opacity: 1
    },
    minorLine: {
        height: 9,
    },
    selectedLine: {
        backgroundColor: "#A89EFF",
        height: 32,
        width: 3,
        opacity: 1
    },

});