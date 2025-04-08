import React from "react";
import {
    FlatList,
    Dimensions,
    StyleSheet,
    View,
    Text
} from "react-native";

const ITEM_WIDTH = 80;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDE_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

const DATA = [
    { id: "1", label: "Item 1" },
    { id: "2", label: "Item 2" },
    { id: "3", label: "Item 3" },
    { id: "4", label: "Item 4" },
    { id: "5", label: "Item 5" },
];

export default function Test() {
    return (
        <FlatList
            data={DATA}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
                // The key to centering both the first and last item
                paddingHorizontal: SIDE_PADDING,
            }}
            renderItem={({ item }) => (
                <View style={[styles.itemContainer, { width: ITEM_WIDTH }]}>
                    <Text style={styles.itemText}>{item.label}</Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    itemContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    itemText: {
        fontSize: 18,
        color: "#fff"
    },
});