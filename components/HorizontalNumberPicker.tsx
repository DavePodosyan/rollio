import React, { FunctionComponent } from "react";
import { Dimensions, FlatList, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { SvgProps } from "react-native-svg";

interface HorizontalNumberPickerProps {
    values: { value: number; major: boolean }[];
    defaultValue: number,
    label: string,
    icon?: React.FC<SvgProps>,
    formatValue?: (value: number) => string | number,
    onValueChange?: (value: number) => void,
}

const ITEM_WIDTH = 20;

export default function HorizontalNumberPicker({ values, defaultValue, label, icon, formatValue, onValueChange }: HorizontalNumberPickerProps) {

    const CENTER_OFFSET = (Dimensions.get("window").width - ITEM_WIDTH) / 2;

    const DEFAULT_VALUE_INDEX = values.findIndex(
        (item) => item.value === defaultValue
    );
    const [value, setValue] = React.useState(values[DEFAULT_VALUE_INDEX].value);
    const flatListRef = React.useRef<FlatList>(null);

    React.useEffect(() => {
        scrollToValue(DEFAULT_VALUE_INDEX);
    }, []);

    const handleSelectValue = (index: number) => {
        setValue(values[index].value);
        if (onValueChange) {
            onValueChange(values[index].value);
        }
        scrollToValue(index);
    };

    const scrollToValue = (index: number) => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
                offset: index * ITEM_WIDTH,
                animated: true,
            });
        }
    };

    const handleScroll = (event: any) => {
        const currentScrollPosition = event.nativeEvent.contentOffset.x;
        var index = Math.round(currentScrollPosition / ITEM_WIDTH);

        if (index >= 0 && index < values.length) {
            const newiso = values[index].value;
            if (newiso !== value) {
                setValue(newiso);

                if (onValueChange) {
                    onValueChange(newiso);
                }

                handleHapticFeedback();
            }
        }
    };

    const handleScrollEnd = (event: any) => {
        const scrollX = event.nativeEvent.contentOffset.x;
        const maxScroll = ITEM_WIDTH * (values.length - 1);

        if (scrollX > maxScroll) {
            handleSelectValue(values.length - 1);
        }
    };

    const handleHapticFeedback = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const renderItem = (item: any, index: any) => {
        return (
            <TouchableOpacity style={{ width: ITEM_WIDTH, alignItems: 'center', }} onPress={() => handleSelectValue(index)}>
                <View
                    style={[
                        styles.line,
                        item.major ? styles.majorLine : styles.minorLine,
                        item.value === value && styles.selectedLine,
                    ]}
                />
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.labelContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '50%' }}>
                    {icon && (
                        <View style={styles.iconContainer}>
                            {React.createElement(icon)}
                        </View>
                    )}
                    <Text style={styles.label}>{label}</Text>
                </View>
                <Text style={[styles.label, styles.value]}>
                    {formatValue ? formatValue(value) : value}
                </Text>
            </View>

            <View style={styles.pickerContainer}>
                <FlatList
                    ref={flatListRef}
                    data={values}
                    horizontal
                    // bounces={false}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={{
                        paddingLeft: CENTER_OFFSET,
                        paddingRight: CENTER_OFFSET,
                    }}
                    onScroll={handleScroll}
                    // onScrollEndDrag={handleScrollEnd}
                    onMomentumScrollEnd={handleScrollEnd}
                    initialScrollIndex={DEFAULT_VALUE_INDEX}
                    getItemLayout={(data, index) => ({
                        length: ITEM_WIDTH,
                        offset: ITEM_WIDTH * index,
                        index,
                    })}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => renderItem(item, index)} />
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
        // position: "relative",/
        // overflow: "visible",
        // justifyContent: "center",
    },
    line: {
        width: 1,
        // marginHorizontal: (ITEM_WIDTH) / 2,
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