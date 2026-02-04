import { View, Text, Pressable, useColorScheme } from 'react-native';
import { Frame } from '@/types';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { memo } from 'react';

interface FrameListItemProps {
    frame: Frame;
    iso: number;
}

function FrameListItem({ frame, iso }: FrameListItemProps) {

    const colorScheme = useColorScheme();
    const isGlassAvailable = isLiquidGlassAvailable();

    return (
        <Pressable
            onPress={() => router.push({
                pathname: '/(modal)/new-frame', params: {
                    mode: 'edit',
                    filmId: frame.film_id,
                    iso: iso,
                    frameId: frame.id
                }
            })}
            style={({ pressed }) => [
                {
                    transform: isGlassAvailable ? [] : [{ scale: pressed ? 0.97 : 1 }],
                },
            ]}>
            <GlassView
                isInteractive={true}
                glassEffectStyle={colorScheme === 'dark' ? 'clear' : 'regular'}
                style={{
                    padding: 20,
                    borderRadius: 24,
                    backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#a583ef1f' : '#ffffffcc'),

                }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View
                        // isInteractive={true}
                        // glassEffectStyle='regular'
                        // tintColor='#09090b6d'
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 50,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d',
                        }}>
                        <Text style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: 'LufgaMedium',
                            color: colorScheme === 'dark' ? '#fff' : '#100528',
                        }}>
                            {frame.frame_no}
                        </Text>
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                        {frame.lens && (
                            <View
                                // isInteractive={true}
                                // glassEffectStyle='regular'
                                // tintColor='#09090b6d'
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingBlock: 6,
                                    paddingInline: 12,
                                    borderRadius: 16,
                                    backgroundColor: colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d',

                                }}>
                                <SymbolView name="circle.circle" size={20} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528'
                                }}>
                                    {frame.lens}
                                </Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-start', alignItems: 'center' }}>
                            <View
                                // isInteractive={true}
                                // glassEffectStyle='regular'
                                // tintColor='#09090b6d'
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingBlock: 6,
                                    paddingInline: 12,
                                    borderRadius: 16,
                                    backgroundColor: colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d',

                                }}>
                                <SymbolView name="camera.aperture" size={20} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528'
                                }}>
                                    {frame.aperture !== 'Auto' ? `f/${frame.aperture}` : frame.aperture}
                                </Text>
                            </View>
                            <View
                                // isInteractive={true} 
                                // glassEffectStyle='regular' 
                                // tintColor='#09090b6d' 
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingBlock: 6,
                                    paddingInline: 12,
                                    borderRadius: 16,
                                    backgroundColor: colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d',
                                }}>
                                <SymbolView name="timer" size={20} tintColor={colorScheme === 'dark' ? '#fff' : '#100528'} />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528',
                                }}>
                                    {frame.shutter_speed !== 'Auto' ? `${frame.shutter_speed}s` : frame.shutter_speed}
                                </Text>
                            </View>
                            {frame.image && (
                                <SymbolView name="paperclip" size={20} tintColor={colorScheme === 'dark' ? '#ffffff' : '#100528'} style={{ marginLeft: 'auto' }} />

                            )}
                        </View>

                        {frame.note && (
                            <View
                                // isInteractive={true}
                                // glassEffectStyle='regular'
                                // tintColor='#09090b6d'
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    paddingBlock: 6,
                                    paddingInline: 12,
                                    borderRadius: 16,
                                    backgroundColor: colorScheme === 'dark' ? '#09090b6d' : '#e5e0ff4d',

                                }}>
                                <Text numberOfLines={1} style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528',
                                }}>
                                    {frame?.note}
                                </Text>
                            </View>
                        )}
                    </View>

                </View>

            </GlassView>
        </Pressable>
    );
}
// export default FrameListItem;

export default memo(FrameListItem, (prev, next) => {
    // re-render only if visible fields actually changed
    return (
        prev.frame.id === next.frame.id &&
        prev.frame.frame_no === next.frame.frame_no &&
        prev.frame.lens === next.frame.lens &&
        prev.frame.aperture === next.frame.aperture &&
        prev.frame.shutter_speed === next.frame.shutter_speed &&
        prev.frame.note === next.frame.note &&
        prev.frame.image === next.frame.image
    );
}); 