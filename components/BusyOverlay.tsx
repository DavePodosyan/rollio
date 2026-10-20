import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
    visible: boolean;
    label: string;
};

/** Full-screen translucent overlay that blocks touches while a job runs. */
export default function BusyOverlay({ visible, label }: Props) {
    if (!visible) return null;
    return (
        <View
            style={styles.overlay}
            pointerEvents="auto"
            accessibilityViewIsModal
            accessibilityLiveRegion="polite"
            accessibilityLabel={label}
        >
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(9, 9, 11, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        zIndex: 100,
    },
    label: {
        fontFamily: 'LufgaMedium',
        fontSize: 15,
        color: '#ffffff',
    },
});
