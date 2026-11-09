
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Alert, Pressable, useColorScheme, FlatList, Platform, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useLocalSearchParams, router, useFocusEffect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useFilm } from '@/hooks/useFilm';
import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import { getStatusColor } from '@/utils/statusColors';
import { getFilmStatusLabel } from '@/utils/filmStatusLabels';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useFrames } from '@/hooks/useFrames';
import FrameListItem from '@/components/FrameListItem';
import { Frame } from '@/types';
import { Button, Host, Menu, Image as SwiftImage } from '@expo/ui/swift-ui';
import { accessibilityLabel as swiftAccessibilityLabel, frame as swiftFrame, tint as swiftTint } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import SkipFrameMenu from '@/components/SkipFrameMenu';
import { useTranslation } from 'react-i18next';
import { DATA_RESTORED_EVENT } from '@/hooks/useBackup';
import { StackActions } from 'expo-router/react-navigation';
import { useFilmExport } from '@/hooks/useFilmExport';
import BusyOverlay from '@/components/BusyOverlay';

export default function FilmDetailPage() {
    const { id, title } = useLocalSearchParams<{ id: string, title: string }>();
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const isAndroid = Platform.OS === 'android';
    const isGlassAvailable = isLiquidGlassAvailable();
    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    const { film, loading, error, destroyFilm, refreshFilm } = useFilm(Number(id));
    const { frames, loading: framesLoading, error: framesError, refresh: refreshFrames, skipNextFrame } = useFrames(Number(id));
    const { busy: exportBusy, exportPdf, exportCsv } = useFilmExport();

    // console.log(frames);

    const navigation = useNavigation();
    // See films/index.tsx: pad content for side rails (iPhone Duo, Split View).
    const insets = useSafeAreaInsets();

    // After a restore this film may no longer exist; leave rather than show stale data.
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener(DATA_RESTORED_EVENT, () => {
            // popToTop stays inside the Films stack; a plain goBack could bubble
            // up to the tab navigator and switch tabs.
            navigation.dispatch(StackActions.popToTop());
        });
        return () => subscription.remove();
    }, [navigation]);


    const listRef = useRef<FlatList<Frame>>(null);
    const listMetrics = useRef({ content: 0, layout: 0 });
    const revealEndUntil = useRef(0);

    // FlatList's own scrollToEnd stops with the last row's bottom edge at the
    // bottom of the list, which on iOS is underneath the tab bar. Aim for the
    // real end instead: all the content, bottom padding included, above the bar.
    const scrollToListEnd = useCallback(() => {
        const { content, layout } = listMetrics.current;
        if (!content || !layout) return;
        const tabBar = Platform.OS === 'ios' ? insets.bottom : 0;
        listRef.current?.scrollToOffset({ offset: Math.max(0, content - layout + tabBar), animated: true });
    }, [insets.bottom]);

    // Rows far below the fold are only estimated until they render, so keep
    // re-aiming for a moment while the list measures them on the way down.
    const revealLastFrame = useCallback(() => {
        revealEndUntil.current = Date.now() + 1500;
        scrollToListEnd();
    }, [scrollToListEnd]);
    // Android: the hold menu under the header "+".
    const [skipMenuOpen, setSkipMenuOpen] = useState(false);

    const openNewFrame = useCallback(() => {
        router.push({ pathname: '/new-frame', params: { mode: 'new', filmId: film?.id, iso: film?.iso, frameCount: film?.frame_count } });
    }, [film?.id, film?.iso, film?.frame_count]);

    // Touch and hold "+": log the next frame as skipped, then show it.
    const handleSkipFrame = useCallback(async () => {
        try {
            await skipNextFrame();
            await refreshFilm();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            revealLastFrame();
        } catch (err) {
            console.error('Failed to skip frame', err);
            Alert.alert(t('shared.error'), t('rollDetail.skipFrame.errorMessage'));
        }
    }, [skipNextFrame, refreshFilm, revealLastFrame, t]);

    function handleContextMenuSelect(action: string) {
        switch (action) {
            case 'edit':
                router.push({
                    pathname: '/new-film',
                    params: { mode: 'edit', id: film?.id.toString() },
                });
                break;
            case 'delete':
                Alert.alert(
                    t('rollDetail.deleteFilm.title'),
                    t('rollDetail.deleteFilm.message'),
                    [
                        { text: t('shared.cancel'), style: 'cancel' },
                        {
                            text: t('shared.delete'), style: 'destructive', onPress: () => {
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
        try {
            await destroyFilm();
        } catch (error) {
            console.error('Failed to delete film', error);
            Alert.alert(t('shared.error'), t('newFilm.deleteErrorMessage'));
            return;
        }
        navigation.goBack();
    }

    // Android alerts show at most three buttons, so export lives one level down,
    // and the contact sheet's photo look one level below that.
    const handleAndroidExportPress = useCallback(() => {
        if (!film) return;
        const askPhotos = () => Alert.alert(t('export.pdf'), t('export.photos.question'), [
            { text: t('export.photos.blackAndWhite'), onPress: () => exportPdf(film, frames, 'blackAndWhite') },
            { text: t('export.photos.color'), onPress: () => exportPdf(film, frames, 'color') },
            { text: t('shared.cancel'), style: 'cancel' },
        ], { cancelable: true });
        Alert.alert(t('export.menu'), undefined, [
            { text: t('export.pdf'), onPress: askPhotos },
            { text: t('export.csv'), onPress: () => exportCsv(film, frames) },
            { text: t('shared.cancel'), style: 'cancel' },
        ], { cancelable: true });
    }, [film, frames, exportPdf, exportCsv, t]);

    const handleAndroidMenuPress = useCallback(() => {
        Alert.alert(t('rollDetail.filmActionsTitle'), undefined, [
            {
                text: t('shared.edit'),
                onPress: () => handleContextMenuSelect('edit'),
            },
            {
                text: t('export.menu'),
                onPress: handleAndroidExportPress,
            },
            {
                text: t('shared.delete'),
                style: 'destructive',
                onPress: () => handleContextMenuSelect('delete'),
            },
        ], { cancelable: true });
    }, [film?.id, t, handleAndroidExportPress]);

    useFocusEffect(
        useCallback(() => {
            refreshFilm();
            refreshFrames();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            title: film?.title ?? title,
            headerRight: isAndroid ? () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <View>
                        <Pressable
                            onPress={openNewFrame}
                            onLongPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setSkipMenuOpen(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('newFrame.addTitle')}
                            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                            hitSlop={8}
                        >
                            <MaterialIcons
                                name="add"
                                size={24}
                                color={colorScheme === 'dark' ? '#fff' : '#100528'}
                            />
                        </Pressable>
                        <SkipFrameMenu
                            open={skipMenuOpen}
                            label={t('rollDetail.skipFrame.action')}
                            onClose={() => setSkipMenuOpen(false)}
                            onSkip={handleSkipFrame}
                        />
                    </View>
                    <Pressable
                        onPress={handleAndroidMenuPress}
                        style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
                        hitSlop={8}
                    >
                        <MaterialIcons
                            name="more-horiz"
                            size={24}
                            color={colorScheme === 'dark' ? '#fff' : '#100528'}
                        />
                    </Pressable>
                </View>
            ) : undefined,
        });
    }, [film, colorScheme, isAndroid, handleAndroidMenuPress, title, skipMenuOpen, openNewFrame, handleSkipFrame, t]);

    if (loading || error || !film) {
        return null;
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
                        {film ? new Date(film.created_at).toLocaleDateString(undefined, {
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
                            {t('rollDetail.isoLabel', { iso: film.iso })}
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
                                {film.push_pull < 0
                                    ? t('rollDetail.pushPull.pull', { stops: film.push_pull })
                                    : t('rollDetail.pushPull.push', { stops: film.push_pull })}
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
                            {getFilmStatusLabel(film.status)}
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
        <>
            {!isAndroid && (
                <Stack.Toolbar placement="right" >
                    {/* A SwiftUI menu rather than a toolbar button: the stock button cannot
                        both act on a tap and open a menu on touch and hold. "…" takes its
                        own glass so the two sit in separate circles. */}
                    <Stack.Toolbar.View>
                        <Host matchContents>
                            <Menu
                                label={<SwiftImage systemName="plus" size={21} modifiers={[swiftFrame({ width: 36, height: 36 })]} />}
                                onPrimaryAction={openNewFrame}
                                modifiers={[
                                    swiftTint(colorScheme === 'dark' ? '#ffffff' : '#100528'),
                                    swiftAccessibilityLabel(t('newFrame.addTitle')),
                                ]}
                            >
                                <Button label={t('rollDetail.skipFrame.action')} systemImage="forward.frame" onPress={handleSkipFrame} />
                            </Menu>
                        </Host>
                    </Stack.Toolbar.View>
                    <Stack.Toolbar.Menu icon="ellipsis" separateBackground>
                        <Stack.Toolbar.MenuAction icon="pencil" onPress={() => handleContextMenuSelect('edit')}>{t('shared.edit')}</Stack.Toolbar.MenuAction>
                        <Stack.Toolbar.Menu icon="square.and.arrow.up">
                            <Stack.Toolbar.Label>{t('export.menu')}</Stack.Toolbar.Label>
                            <Stack.Toolbar.Menu icon="doc.richtext">
                                <Stack.Toolbar.Label>{t('export.pdf')}</Stack.Toolbar.Label>
                                <Stack.Toolbar.MenuAction icon="circle.lefthalf.filled" onPress={() => exportPdf(film, frames, 'blackAndWhite')}>{t('export.photos.blackAndWhite')}</Stack.Toolbar.MenuAction>
                                <Stack.Toolbar.MenuAction icon="paintpalette" onPress={() => exportPdf(film, frames, 'color')}>{t('export.photos.color')}</Stack.Toolbar.MenuAction>
                            </Stack.Toolbar.Menu>
                            <Stack.Toolbar.MenuAction icon="tablecells" onPress={() => exportCsv(film, frames)}>{t('export.csv')}</Stack.Toolbar.MenuAction>
                        </Stack.Toolbar.Menu>

                        {/* <Stack.Toolbar.MenuAction icon="clock" hidden={film.status !== 'in-camera'} onPress={() => null}>Mark as Developing</Stack.Toolbar.MenuAction> */}
                        {/* <Stack.Toolbar.MenuAction icon="archivebox" hidden={film.status !== 'developing'} onPress={() => null}>Mark as Archived</Stack.Toolbar.MenuAction> */}

                        <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => handleContextMenuSelect('delete')}>
                            {t('shared.delete')}
                        </Stack.Toolbar.MenuAction>
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar>
            )}

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
                        ref={listRef}
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
                        renderItem={({ item }) => <FrameListItem frame={item} iso={film?.iso} />}

                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        ListEmptyComponent={() => (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                    <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                        {t('rollDetail.noFramesYet.title')}
                                    </Text>
                                    <Text style={{ color: colorScheme === 'dark' ? '#ffffff' : '#100528', fontFamily: 'LufgaMedium', textAlign: "center", marginTop: 20 }}>
                                        {t('rollDetail.noFramesYet.subtitle')}
                                    </Text>
                                </View>

                            </View>
                        )}
                        contentInsetAdjustmentBehavior="automatic"
                        // iOS clamps scroll commands short of the tab bar inset without this.
                        scrollToOverflowEnabled
                        onLayout={(e) => { listMetrics.current.layout = e.nativeEvent.layout.height; }}
                        onContentSizeChange={(_, height) => {
                            listMetrics.current.content = height;
                            if (Date.now() < revealEndUntil.current) scrollToListEnd();
                        }}
                        onScrollBeginDrag={() => { revealEndUntil.current = 0; }}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? 24 : 20, paddingLeft: 18 + insets.left, paddingRight: 18 + insets.right, paddingBottom: 50 }}
                        refreshing={false}
                        onRefresh={() => {
                            refreshFilm();
                            refreshFrames();
                        }}
                    // ListFooterComponent={films && films.length > 0 ? <EnjoyingRollio /> : null}

                    />
                </LinearGradient>
                <BusyOverlay
                    visible={exportBusy !== 'idle'}
                    label={exportBusy === 'pdf' ? t('export.preparingPdf') : t('export.preparingCsv')}
                />
            </View>
        </>
    );
}
