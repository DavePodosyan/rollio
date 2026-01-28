
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { View, Text, Alert, Pressable, useColorScheme, FlatList } from 'react-native';
import { useNavigation, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useEffect } from 'react';
import ContextMenuFilm from '@/components/ContextMenuFilm.ios';
import { useFilm } from '@/hooks/useFilm';
import { SymbolView } from 'expo-symbols';
import { getStatusColor } from '@/utils/statusColors';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useFrames } from '@/hooks/useFrames';
import FrameListItem from '@/components/FrameListItem';
import { Frame } from '@/utils/types';

export default function FilmDetailPage() {
    const { id, title } = useLocalSearchParams<{ id: string, title: string }>();
    const colorScheme = useColorScheme();
    const isGlassAvailable = isLiquidGlassAvailable();
    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    const { film, loading, error, destroyFilm, refreshFilm } = useFilm(Number(id));
    const { frames, loading: framesLoading, error: framesError, refresh: refreshFrames } = useFrames(Number(id));

    // console.log(frames);

    const navigation = useNavigation();


    function handleContextMenuSelect(action: string) {
        console.log('Selected action from context menu:', action);
        // Handle actions like edit, delete, share, etc.
        switch (action) {
            case 'edit':
                router.push({
                    pathname: '/new-film',
                    params: { mode: 'edit', id: film?.id.toString() },
                });
                break;
            case 'delete':
                Alert.alert(
                    'Delete Film',
                    'Are you sure you want to delete this film?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete', style: 'destructive', onPress: () => {
                                deleteFilm();
                            }
                        },
                    ]
                );
                break;
            case 'share':
                // Open share dialog
                break;
            default:
                break;
        }
    }

    async function deleteFilm() {
        // Implement film deletion logic here
        await destroyFilm();
        console.log('Film deleted:', film?.id);
        navigation.goBack();
    }

    useFocusEffect(
        useCallback(() => {
            refreshFilm();
            refreshFrames();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            title: title,
            headerRight: () => (
                <View style={{ width: 85, height: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ backgroundColor: 'transparent' }}>
                        <Pressable onPress={() => router.push({ pathname: '/new-frame', params: { mode: 'new', filmId: film?.id, frameCount: film?.frame_count } })} style={{ width: 35, backgroundColor: 'transparent', height: 35, justifyContent: 'center', alignItems: 'center', }} >
                            <SymbolView name="plus" size={22} tintColor={colorScheme === 'dark' ? '#ffffff' : '#100528'} />
                        </Pressable>
                    </View>
                    <View style={{ backgroundColor: 'transparent' }}>
                        <ContextMenuFilm onSelect={handleContextMenuSelect} />
                    </View>
                </View>
            )
        });
    }, [film, colorScheme]);

    if (loading || error || !film) {
        return null; // ✅ safe now — all hooks already called
    }

    const statusColor = getStatusColor(film.status);
    const maxShots = film.frame_count > film.expected_shots ? film.frame_count : film.expected_shots;

    const renderHeader = () => {
        return (
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 4, marginBottom: 8, marginTop: -8 }}>
                    {film?.camera ? (
                        <>
                            <Text style={{
                                color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                                opacity: 0.6,
                                fontFamily: 'LufgaRegular'
                            }}>{film.camera}</Text>
                            <Text style={{
                                color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                                opacity: 0.6,
                                fontFamily: 'LufgaRegular'
                            }}>•</Text>
                        </>
                    ) : null}
                    <Text style={{
                        color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                        opacity: 0.6,
                        fontFamily: 'LufgaRegular'
                    }}>
                        {film ? new Date(film.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        }) : null}
                    </Text>
                </View>
                <GlassContainer spacing={10} style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 }}>
                    <GlassView
                        isInteractive={true}
                        glassEffectStyle="regular"
                        tintColor={colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d'}
                        style={{
                            paddingLeft: 16,
                            paddingRight: 16,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 12,
                            backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#a583ef1f' : '#fff'),
                            // zIndex: 10,
                        }}>
                        <Text
                            style={{
                                fontSize: 12,
                                lineHeight: 16,
                                fontFamily: 'LufgaMedium',
                                color: colorScheme === 'dark' ? '#fff' : '#100528',
                            }}>
                            ISO: {film.iso}
                        </Text>
                    </GlassView>

                    {film.push_pull !== 0 && (
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle="regular"
                            tintColor={colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d'}
                            style={{
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 6,
                                paddingBottom: 6,
                                borderRadius: 12,
                                backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#a583ef1f' : '#fff'),
                                // zIndex: 10,
                            }}>
                            <Text
                                style={{
                                    fontSize: 12,
                                    lineHeight: 16,
                                    fontFamily: 'LufgaMedium',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528',
                                }}>
                                {film.push_pull < 0 ? 'Pull ' : 'Push +'}{film.push_pull}
                            </Text>
                        </GlassView>
                    )}
                    <GlassView
                        isInteractive={true}
                        glassEffectStyle="regular"
                        tintColor={statusColor}
                        style={{
                            paddingLeft: 16,
                            paddingRight: 16,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 12,
                            backgroundColor: isGlassAvailable ? 'transparent' : statusColor,
                            // zIndex: 10,
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
                </GlassContainer>
                <GlassView
                    isInteractive={true}
                    glassEffectStyle="clear"
                    tintColor={colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d'}
                    style={{
                        borderRadius: 12,
                        height: 28,
                        backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#09090b' : '#fff'),
                    }}
                >
                    <View
                        // tintColor={statusColor}
                        // glassEffectStyle='regular'
                        style={{
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
            </View>
        );
    };


    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={gradientColors}
                locations={[0.1, 0.4, 0.9]}
                // dither={false}
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    height: '100%',
                }}
                start={{ x: 0, y: 0 }} // Optional: start from top-left
                end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
            >
                <FlatList
                    data={frames}
                    // key={frames.length.toString()}
                    keyExtractor={(item: Frame) => String(item.id)}
                    initialNumToRender={10}
                    maxToRenderPerBatch={8}
                    windowSize={8}
                    removeClippedSubviews={true}
                    ListHeaderComponent={renderHeader}
                    ListHeaderComponentStyle={{ marginBottom: 24 }}
                    // disableIntervalMomentum={true}
                    renderItem={({ item }) => <FrameListItem frame={item} />}

                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    ListEmptyComponent={() => (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                    You don't have any film rolls yet.
                                </Text>
                                <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                    Click the + button to add one.
                                </Text>
                            </View>

                        </View>
                    )}
                    contentInsetAdjustmentBehavior="automatic"
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingLeft: 18, paddingRight: 18, paddingBottom: 50 }}
                    refreshing={false}
                    onRefresh={() => {
                        refreshFilm();
                        refreshFrames();
                    }}
                // ListFooterComponent={films && films.length > 0 ? <EnjoyingRollio /> : null}

                />
            </LinearGradient>
        </View>
    );
}
