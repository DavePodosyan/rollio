import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Alert,
    Platform,
    Linking,
    ActivityIndicator,
    Share,
    useColorScheme,
    Pressable,
    Image,
} from 'react-native';
import React, { useRef, useState } from 'react';

import { useIAP, ErrorCode } from 'expo-iap';

import { LinearGradient } from 'expo-linear-gradient';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as HapticFeedback from 'expo-haptics';
import * as Application from 'expo-application';

const productSkus = [
    'support.1',
    'support.5',
    'support.10'
];

const operations = ['getProducts', 'getSubscriptions', 'validateReceipt'] as const;
type Operation = (typeof operations)[number];

export default function Support() {
    const colorScheme = useColorScheme();
    const isGlassAvailable = isLiquidGlassAvailable();

    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];


    const productIcons: Record<string, { name: SFSymbol; color: string }> = {
        'support.1': {
            name: 'sparkles',
            color: '#A855F7',
        },
        'support.5': {
            name: 'bolt.fill',
            color: '#FFB800',
        },
        'support.10': {
            name: 'heart.fill',
            color: '#FF3B30',
        }
    }


    const [purchaseInProgress, setPurchaseInProgress] = useState({
        status: false, sku: ''
    });
    // Track processed transaction IDs to avoid duplicate alerts
    const processedTransactionIdsRef = useRef(new Set());
    const {
        connected,
        products,
        fetchProducts,
        requestPurchase,
        finishTransaction
    } = useIAP({
        onPurchaseSuccess: async (purchase) => {
            setPurchaseInProgress({ status: false, sku: '' });
            // Only process if transactionId is new
            if (purchase?.transactionId && !processedTransactionIdsRef.current.has(purchase.transactionId)) {
                try {
                    await finishTransaction({ purchase, isConsumable: true });
                    processedTransactionIdsRef.current.add(purchase.transactionId);
                    Alert.alert('Thank you ❤️', 'Your support is greatly appreciated!');
                } catch (e) {
                    console.error('Error finishing transaction:', e);
                }
            } else {
                // Ignore duplicate or invalid purchases
                console.log('Purchase already processed or invalid:', purchase?.transactionId);
            }
        },
        onPurchaseError: (error) => {
            setPurchaseInProgress({ status: false, sku: '' });
            if (error.code !== ErrorCode.UserCancelled) {
                console.error('Purchase failed:', error);
            }
        },
    });

    React.useEffect(() => {
        if (connected) {
            fetchProducts({ skus: productSkus, type: 'in-app' });
        }
    }, [connected]);


    const storeURL = Platform.select({
        ios: 'itms-apps://itunes.apple.com/app/6744120369?action=write-review',
        android: 'market://details?id=com.davitpodosyan.rollio',
    });

    const handleSharing = async () => {
        try {
            await Share.share({
                message: 'Check out Rollio – the app for film photography enthusiasts!\n\nhttps://rollio.davitp.dev/app-link',
            }, {
                dialogTitle: 'Share Rollio',
                subject: 'Rollio - Film Photography App'

            });
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Failed to share the app. Please try again later.');
        }
    };

    return (
        <View style={{ flex: 1 }}>

            <LinearGradient
                // colors={['#09090B', '#100528', '#09090B']}
                colors={gradientColors}
                locations={[0.1, 0.4, 0.9]}
                // dither={false}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }} // Optional: start from top-left
                end={{ x: 1, y: 1 }}   // Optional: end at bottom-right
            >
                <ScrollView contentInsetAdjustmentBehavior="automatic"
                    style={{
                        paddingTop: 10,
                        paddingLeft: 18,
                        paddingRight: 18,
                    }}>


                    <View
                        // isInteractive={false}
                        // glassEffectStyle='regular'
                        style={{
                            borderRadius: 24,
                            // padding: 20,
                            opacity: 0.8,
                            marginBottom: 36,
                        }}
                    >
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaRegular',
                            fontSize: 15,
                            lineHeight: 22
                        }}>
                            Rollio is a passion project built with love for the film photography community.
                            If you enjoy using the app and want to show your appreciation, you can make a small contribution below.
                        </Text>
                    </View>

                    <View style={{ marginBottom: 36 }}>
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaMedium',
                            fontSize: 18,
                            marginBottom: 12,
                        }}>
                            Support the Project
                        </Text>
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle='regular'
                            style={{
                                borderRadius: 24,
                                padding: 20,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                minHeight: 80,
                                backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#a583ef1f' : '#ffffffcc'),

                            }}
                        >
                            {(!products || products.length === 0) ? (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#ffffff' : '#100528'} />
                                </View>
                            ) : (
                                products
                                    .sort((a, b) => productSkus.indexOf(a.id) - productSkus.indexOf(b.id))
                                    .map((product) => (
                                        <Pressable
                                            key={product.id}
                                            onPress={async () => {
                                                console.log('Pressed');
                                                HapticFeedback.selectionAsync();
                                                setPurchaseInProgress({ status: true, sku: product.id });
                                                await requestPurchase({
                                                    request: {
                                                        ios: { sku: product.id },
                                                        android: { skus: [product.id] }
                                                    },
                                                    type: 'in-app'
                                                });
                                            }}
                                            disabled={purchaseInProgress.status}
                                            style={{
                                                padding: 10,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                gap: 8,
                                                width: 100,
                                                opacity: purchaseInProgress.status ? purchaseInProgress.sku === product.id ? 1 : 0.5 : 1,
                                            }}>
                                            <SymbolView
                                                name={productIcons[product.id].name}
                                                size={52}
                                                tintColor={productIcons[product.id].color}
                                            />
                                            <View style={{
                                                height: 24,
                                                minWidth: 60,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}>
                                                {purchaseInProgress.status && purchaseInProgress.sku === product.id ? (
                                                    <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#ffffff' : '#100528'} />
                                                ) : (
                                                    <Text style={{
                                                        fontFamily: 'LufgaMedium',
                                                        fontSize: 16,
                                                        color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                                                    }}>
                                                        {product.displayPrice}
                                                    </Text>
                                                )}
                                            </View>
                                        </Pressable>
                                    ))
                            )}
                        </GlassView>
                    </View>
                    <View style={{ marginBottom: 36 }}>
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaMedium',
                            fontSize: 18,
                            marginBottom: 12,
                        }}>
                            Spread the Word
                        </Text>
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle='regular'
                            style={{
                                borderRadius: 24,
                                padding: 20,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                backgroundColor: isGlassAvailable ? 'transparent' : (colorScheme === 'dark' ? '#a583ef1f' : '#ffffffcc'),

                            }}
                        >
                            <Pressable
                                onPress={() => {
                                    HapticFeedback.selectionAsync();
                                    if (storeURL) {
                                        Linking.openURL(storeURL).catch((err) => {
                                            console.error('Failed to open store URL:', err);
                                            Alert.alert('Error', 'Failed to open the store URL. Please try again later.');
                                        });
                                    }
                                }}

                                style={{
                                    padding: 10,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>

                                <SymbolView
                                    name='star.fill'
                                    size={48}
                                    tintColor='#FFB800'
                                />

                                <View style={{
                                    height: 24,
                                    // minWidth: 60,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{
                                        fontFamily: 'LufgaMedium',
                                        fontSize: 16,
                                        color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                                    }}>
                                        Write a Review
                                    </Text>
                                </View>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    HapticFeedback.selectionAsync();
                                    handleSharing();
                                }}

                                style={{
                                    padding: 10,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>

                                <SymbolView
                                    name='square.and.arrow.up'
                                    size={48}
                                    tintColor='#34C759'
                                />

                                <View style={{
                                    height: 24,
                                    // minWidth: 60,
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{
                                        fontFamily: 'LufgaMedium',
                                        fontSize: 16,
                                        color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                                    }}>
                                        Share the App
                                    </Text>
                                </View>
                            </Pressable>
                        </GlassView>
                    </View>

                    {/* <View style={{ marginBottom: 24 }}>
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaMedium',
                            fontSize: 18,
                            marginBottom: 12,
                        }}>
                            Know a Photographer?
                        </Text>
                    </View> */}

                    <View style={{ marginTop: 80, marginBottom: 36, alignItems: 'center' }}>
                        <Image source={require('@/assets/images/splash-icon-light.png')} style={{ width: 64, height: 64 }} />
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaRegular',
                            fontSize: 18,
                            lineHeight: 26,
                        }}>
                            {Application.applicationName}
                        </Text>
                        <Text style={{
                            color: colorScheme === 'dark' ? '#ffffff' : '#100528',
                            fontFamily: 'LufgaRegular',
                            fontSize: 15,
                            lineHeight: 22,
                            opacity: 0.5,
                        }}>
                            Version {Application.nativeApplicationVersion} ({Application.nativeBuildVersion})
                        </Text>
                    </View>

                </ScrollView>
            </LinearGradient>
        </View >
    );
}
