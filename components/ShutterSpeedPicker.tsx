import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import * as Haptics from "expo-haptics";
import { Svg, Path, Defs, Rect, G, ClipPath } from "react-native-svg";

import { shutterSpeedValues } from '@/utils/values';

const { width } = Dimensions.get("window");
const ITEM_WIDTH = 20;
const CENTER_OFFSET = (width - ITEM_WIDTH) / 2;

const DEFAULT_SHUTTER_SPEED_INDEX = shutterSpeedValues.findIndex(
    (item) => item.value === '1/125'
);

interface ShutterSpeedPickerProps {
    onValueChange?: (value: string) => void;
}

export default function ShutterSpeedPicker({ onValueChange }: ShutterSpeedPickerProps) {
    const [shutterSpeed, setShutterSpeed] = React.useState(shutterSpeedValues[DEFAULT_SHUTTER_SPEED_INDEX].value);
    const flatListRef = React.useRef<FlatList>(null);
    const scrollPosition = React.useRef(0);

    React.useEffect(() => {
        scrollToShutterSpeed(DEFAULT_SHUTTER_SPEED_INDEX)
    }, []);

    const renderItem = (item: any, index: any) => {
        return (
            <TouchableOpacity onPress={() => handleSelectShutterSpeed(index)}>
                <View
                    style={[
                        styles.line,
                        item.major ? styles.majorLine : styles.minorLine,
                        item.value === shutterSpeed && styles.selectedLine,
                    ]}
                />
            </TouchableOpacity>
        );
    }

    // Handle manual selection
    const handleSelectShutterSpeed = (index: number) => {
        setShutterSpeed(shutterSpeedValues[index].value);
        if (onValueChange) {
            onValueChange(shutterSpeedValues[index].value);
        }
        scrollToShutterSpeed(index);
    };

    const scrollToShutterSpeed = (index: number) => {
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

        if (index >= 0 && index < shutterSpeedValues.length) {
            const newShutterSpeed = shutterSpeedValues[index].value;
            if (newShutterSpeed !== shutterSpeed) {
                setShutterSpeed(newShutterSpeed);

                if (onValueChange) {
                    onValueChange(newShutterSpeed);
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
                            <G clipPath="url(#clip0_2024_6893)">
                                <Path d="M18.4827 10.625C18.1647 14.475 14.9147 17.5 10.9827 17.5C8.99354 17.5 7.08589 16.7098 5.67937 15.3033C4.27284 13.8968 3.48267 11.9891 3.48267 10C3.48267 6.06797 6.50767 2.81797 10.3577 2.5" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                                <Path d="M10.9827 5.625V10H15.3577" stroke="#FAFAFA" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                            </G>
                            <Defs>
                                <ClipPath id="clip0_2024_6893">
                                    <Rect width="20" height="20" fill="white" transform="translate(0.982666)" />
                                </ClipPath>
                            </Defs>
                        </Svg>


                    </View>
                    <Text style={styles.label}>Shutter Speed</Text>
                </View>
                <Text style={[styles.label, styles.value]}>{shutterSpeed}</Text>
            </View>

            <View style={styles.pickerContainer}>
                <FlatList
                    ref={flatListRef}
                    data={shutterSpeedValues}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{
                        paddingHorizontal: CENTER_OFFSET,
                    }}
                    onScroll={handleScroll}
                    initialScrollIndex={DEFAULT_SHUTTER_SPEED_INDEX}
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