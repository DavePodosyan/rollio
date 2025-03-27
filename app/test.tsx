import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import ScrollTickBar from '@/components/ScrollTickBar';

export default function App() {
    const apertureValues = ['1.4', '2', '2.5', '2.8', '4', '5.6', '8', '11', '16'];
    const [apertureIndex, setApertureIndex] = useState(2); // f/2.5

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.block}>
                <View style={styles.row}>
                    <View style={styles.iconLabel}>
                        <Text style={styles.label}>Aperture</Text>
                    </View>
                    <Text style={styles.value}>f/{apertureValues[apertureIndex]}</Text>
                </View>

                <ScrollTickBar
                    values={apertureValues}
                    selectedIndex={apertureIndex}
                    onValueChange={setApertureIndex}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D021B',
        justifyContent: 'center',
        padding: 20,
    },
    block: {
        marginBottom: 60,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        color: '#FFF',
        fontSize: 16,
    },
    value: {
        color: '#A78BFA',
        fontSize: 16,
        fontWeight: '600',
    },
});