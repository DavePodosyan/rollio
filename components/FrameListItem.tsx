import { View, Text, Pressable } from 'react-native';
import { Frame } from '@/types';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

interface FrameListItemProps {
    frame: Frame;
}

function FrameListItem({ frame }: FrameListItemProps) {
    return (
        <Pressable onPress={() => router.push({ pathname: '/(modal)/new-frame', params: { mode: 'edit', filmId: frame.film_id, frameId: frame.id } })}>
            <GlassView isInteractive={true} glassEffectStyle='clear' style={{ padding: 20, borderRadius: 24 }}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <GlassView isInteractive={true} glassEffectStyle='regular' tintColor='#09090b6d' style={{ width: 32, height: 32, borderRadius: 50, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: 'LufgaMedium',
                            color: '#fff',
                        }}>
                            {frame.frame_no}
                        </Text>
                    </GlassView>
                    <View style={{ flex: 1, gap: 8 }}>
                        {frame.lens && (
                            <GlassView isInteractive={true} glassEffectStyle='regular' tintColor='#09090b6d' style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBlock: 8, paddingInline: 12, borderRadius: 16 }}>
                                <SymbolView name="circle.circle" size={20} tintColor="#fff" />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: '#fff',
                                }}>
                                    {frame.lens}
                                </Text>
                            </GlassView>
                        )}

                        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-start', alignItems: 'center' }}>
                            <GlassView isInteractive={true} glassEffectStyle='regular' tintColor='#09090b6d' style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBlock: 8, paddingInline: 12, borderRadius: 16 }}>
                                <SymbolView name="camera.aperture" size={20} tintColor="#fff" />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: '#fff'
                                }}>
                                    {frame.aperture !== 'Auto' ? `f/${frame.aperture}` : frame.aperture}
                                </Text>
                            </GlassView>
                            <GlassView isInteractive={true} glassEffectStyle='regular' tintColor='#09090b6d' style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBlock: 8, paddingInline: 12, borderRadius: 16 }}>
                                <SymbolView name="timer" size={20} tintColor="#fff" />
                                <Text style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: '#fff',
                                }}>
                                    {frame.shutter_speed}
                                </Text>
                            </GlassView>
                            {frame.image && (
                                <SymbolView name="paperclip" size={20} tintColor="#ffffff" style={{ marginLeft: 'auto' }} />

                            )}
                        </View>

                        {frame.note && (
                            <GlassView isInteractive={true} glassEffectStyle='regular' tintColor='#09090b6d' style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBlock: 8, paddingInline: 12, borderRadius: 16 }}>
                                <Text numberOfLines={1} style={{
                                    fontSize: 14,
                                    lineHeight: 20,
                                    fontFamily: 'LufgaMedium',
                                    color: '#fff',
                                }}>
                                    {frame?.note}
                                </Text>
                            </GlassView>
                        )}
                    </View>

                </View>

            </GlassView>
        </Pressable>
    );
}
export default FrameListItem;