import React, { memo } from 'react';
import { TouchableOpacity, Text, View, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Film } from '@/types';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeInUp,
    FadeOutDown,
    LinearTransition,
    FadeOutLeft,
} from 'react-native-reanimated';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { getStatusColor } from '@/utils/statusColors';
import { router } from 'expo-router';

interface Props {
    film: Film;
    index: number;
    onPress: () => void;
}

function FilmListItemBase({ film, index, onPress }: Props) {
    const colorScheme = useColorScheme();
    const scale = useSharedValue(1);
    const statusColor = getStatusColor(film.status);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const pressIn = () => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 250, mass: 0.9 });
    };

    const pressOut = () => {
        scale.value = withSpring(1, { damping: 18, stiffness: 250, mass: 0.9 });
    };

    const maxShots = film.frame_count > film.expected_shots ? film.frame_count : film.expected_shots;

    return (
        // <Animated.View
        //     entering={index < 10 ? FadeInUp
        //         .delay(index * 90)
        //         .springify()
        //         .stiffness(180)
        //         .damping(18)
        //         .mass(1.2) : undefined
        //     }
        //     exiting={FadeOutLeft
        //         .springify()
        //         .dampingRatio(1.0)
        //         .overshootClamping(1)
        //     }
        //     layout={LinearTransition
        //         .springify()
        //         .stiffness(900)
        //         .damping(120)
        //         .mass(4)
        //     }
        // >
        <Pressable
            onPress={() => router.push({pathname: '/(tabs)/films/[id]', params: { id: film.id.toString(), title: film.title }})}
            // onPressIn={pressIn}
            // onPressOut={pressOut}
            style={{}}>

            <GlassContainer style={{ paddingLeft: 18, paddingRight: 18 }}>
                <GlassView
                    glassEffectStyle={colorScheme === 'dark' ? 'clear' : 'regular'}
                    isInteractive={true}
                    style={{ borderRadius: 24, padding: 20 }}
                // tintColor='#a79be3ff'
                >
                    <GlassView
                        isInteractive={true}
                        glassEffectStyle="clear"
                        tintColor={statusColor}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 20,
                            paddingLeft: 16,
                            paddingRight: 16,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 12,
                            zIndex: 10,
                        }}>
                        <Text
                            style={{
                                fontSize: 12,
                                lineHeight: 16,
                                fontFamily: 'LufgaMedium',
                                color: '#fff'
                            }}>
                            {film.status}
                        </Text>
                    </GlassView>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 4, marginBottom: 8 }}>
                        {film.camera ? (
                            <>
                                <Text style={[styles.cameraDateText, colorScheme === 'dark' ? { color: '#ffffff' } : { color: '#100528' }]}>{film.camera}</Text>
                                <Text style={[styles.cameraDateText, colorScheme === 'dark' ? { color: '#ffffff' } : { color: '#100528' }]}>•</Text>
                            </>
                        ) : null}
                        <Text style={[styles.cameraDateText, colorScheme === 'dark' ? { color: '#ffffff' } : { color: '#100528' }]}>
                            {new Date(film.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium' }}>{film.title}</Text>
                    <GlassView
                        isInteractive={true}
                        glassEffectStyle="clear"
                        tintColor={colorScheme === 'dark' ? '#09090b6d' : '#E6E6EB'}
                        style={{
                            borderRadius: 12,
                            height: 28
                        }}
                    >
                        <View style={{
                            width: `${(film.frame_count / maxShots) * 100}%`,
                            minWidth: '20%',
                            height: '100%',
                            borderRadius: 12,
                            backgroundColor: statusColor,
                            justifyContent: 'center',
                            paddingLeft: 10
                        }}>
                            <Text style={{
                                color: "#fff",
                                fontSize: 12,
                                fontFamily: 'LufgaMedium'
                            }
                            }>
                                {film.frame_count}/{maxShots}
                            </Text>
                        </View>
                    </GlassView>
                </GlassView>
            </GlassContainer>
        </Pressable>
        // </Animated.View>
    );
}

const styles = StyleSheet.create({
    cameraDateText: {
        opacity: 0.6,
        fontFamily: 'LufgaRegular'
    },
});

// export default FilmListItemBase;

export default React.memo(FilmListItemBase, (prev, next) => {
    // re-render only if visible fields actually changed
    return (
        prev.index === next.index &&
        prev.film.id === next.film.id &&
        prev.film.title === next.film.title &&
        prev.film.status === next.film.status &&
        prev.film.frame_count === next.film.frame_count &&
        prev.film.camera === next.film.camera &&
        prev.film.created_at === next.film.created_at
    );
});