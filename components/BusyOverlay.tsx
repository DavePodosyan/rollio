import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
    visible: boolean;
    label: string;
};

/**
 * Full-screen translucent overlay that blocks touches while a job runs. It is
 * a transparent Modal rather than an absolutely positioned view so it also
 * covers the native header, toolbar, back gesture and tab bar.
 */
export default function BusyOverlay({ visible, label }: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
            <View
                style={styles.overlay}
                accessibilityViewIsModal
                accessibilityLiveRegion="polite"
                accessibilityLabel={label}
            >
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.label}>{label}</Text>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(9, 9, 11, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    label: {
        fontFamily: 'LufgaMedium',
        fontSize: 15,
        color: '#ffffff',
    },
});
