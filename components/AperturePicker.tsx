import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import * as Haptics from "expo-haptics";
import { Svg, Path, Defs, Rect, G, ClipPath } from "react-native-svg";

import { apertureValues } from '@/utils/constants';

const { width } = Dimensions.get("window");
const ITEM_WIDTH = 20;
const CENTER_OFFSET = (width - ITEM_WIDTH) / 2;

const DEFAULT_APERTURE_INDEX = apertureValues.findIndex(
    (item) => item.value === 5.6
);

interface AperturePickerProps {
    onValueChange?: (value: number) => void;
}

export default function AperturePicker({ onValueChange }: AperturePickerProps) {
    const [aperture, setAperture] = React.useState(apertureValues[DEFAULT_APERTURE_INDEX].value);
    const flatListRef = React.useRef<FlatList>(null);
    const scrollPosition = React.useRef(0);

    React.useEffect(() => {
        scrollToAperture(DEFAULT_APERTURE_INDEX)
    }, []);

    const renderItem = (item: any, index: any) => {
        return (
            <TouchableOpacity onPress={() => handleSelectAperture(index)}>
                <View
                    style={[
                        styles.line,
                        item.major ? styles.majorLine : styles.minorLine,
                        item.value === aperture && styles.selectedLine,
                    ]}
                />
            </TouchableOpacity>
        );
    }

    // Handle manual selection
    const handleSelectAperture = (index: number) => {
        setAperture(apertureValues[index].value);
        if (onValueChange) {
            onValueChange(apertureValues[index].value);
        }
        scrollToAperture(index);
    };

    const scrollToAperture = (index: number) => {
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

        if (index >= 0 && index < apertureValues.length) {
            const newAperture = apertureValues[index].value;
            if (newAperture !== aperture) {
                setAperture(newAperture);

                if (onValueChange) {
                    onValueChange(newAperture);
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
                    <View style={styles.iconContainer}>
                        <Svg width="21" height="20" viewBox="0 0 21 20" fill="none">
                            <G clipPath="url(#clip0_2024_6830)">
                                <Path d="M10.9827 17.5C15.1248 17.5 18.4827 14.1421 18.4827 10C18.4827 5.85786 15.1248 2.5 10.9827 2.5C6.84053 2.5 3.48267 5.85786 3.48267 10C3.48267 14.1421 6.84053 17.5 10.9827 17.5Z" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M10.9827 2.5L13.8483 10.5234" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M4.4873 6.25L12.8686 7.77969" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M4.4873 13.75L10.0029 7.25708" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M10.9827 17.4999L8.11707 9.4765" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M17.4779 13.75L9.09668 12.2203" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M17.4779 6.25L11.9623 12.743" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                            </G>
                            <Defs>
                                <ClipPath id="clip0_2024_6830">
                                    <Rect width="20" height="20" fill="white" transform="translate(0.982666)" />
                                </ClipPath>
                            </Defs>
                        </Svg>

                    </View>
                    <Text style={styles.label}>Aperture</Text>
                </View>
                <Text style={[styles.label, styles.value]}>f/{aperture}</Text>
            </View>

            <View style={styles.pickerContainer}>
                <FlatList
                    ref={flatListRef}
                    data={apertureValues}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{
                        paddingHorizontal: CENTER_OFFSET,
                    }}
                    onScroll={handleScroll}
                    initialScrollIndex={DEFAULT_APERTURE_INDEX}
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