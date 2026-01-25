import {
    View,
    Text,
    ImageBackground,
    InteractionManager,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    Linking,
    ActivityIndicator,
    Share,
    useColorScheme
} from 'react-native';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useIAP } from 'expo-iap';

import HeartShineIcon from '@/assets/icons/HeartShine.svg';
import StarFallIcon from '@/assets/icons/StarFall.svg';
import ShareIcon from '@/assets/icons/Share.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
const productSkus = [
    'support.1',
    'support.5',
    'support.10'
];

const operations = ['getProducts', 'getSubscriptions', 'validateReceipt'] as const;
type Operation = (typeof operations)[number];

export default function Support() {
    const colorScheme = useColorScheme();
    const navigation = useNavigation();
    const parentNav = navigation.getParent();

    const gradientColors: readonly [string, string, ...string[]] = colorScheme === 'dark'
        ? ['#09090B', '#100528', '#09090B']
        : ['#EFF0F4', '#E5E0FF', '#EFF0F4'];

    // useEffect(() => {
    //     parentNav?.setOptions({
    //         title: "Support",

    //         headerRight: () => null,
    //         // headerRight: () => (
    //         //     <View>
    //         //         <TouchableOpacity onPress={() => router.push('/tabs/home/new_film')} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
    //         //             <SymbolView name="minus" size={22} />
    //         //         </TouchableOpacity>
    //         //     </View>
    //         // ),
    //     });
    // }, []);

    useFocusEffect(
        useCallback(() => {
            parentNav?.setOptions({
                // title: "Support",
                headerRight: () => null,
                // headerRight: () => (
                //     <View>
                //         <TouchableOpacity onPress={() => router.push('/tabs/home/new_film')} style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center', }} >
                //             <SymbolView name="minus" size={22} />
                //         </TouchableOpacity>
                //     </View>
                // ),
            });
        }, [parentNav, colorScheme])
    );

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
                <ScrollView contentInsetAdjustmentBehavior="automatic">
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                    <Text style={{ color: colorScheme === "dark" ? "#fff" : "#100528", fontFamily: "LufgaMedium", fontSize: 18, margin: 20 }}>Support Page</Text>
                </ScrollView>
            </LinearGradient>
        </View>
    );

    const backgroundImage = require("@/assets/images/background.png");
    const insets = useSafeAreaInsets();

    const animatedValues = Array.from({ length: 4 }, () => ({
        translateY: useSharedValue(50),
        opacity: useSharedValue(0),
    }));


    // Helper to reset and play the enter animation
    const playEnter = () => {
        animatedValues.forEach((value, index) => {
            const delay = index * 90; // snappier stagger
            // reset to initial state before animating
            value.translateY.value = 50;
            value.opacity.value = 0;

            value.translateY.value = withDelay(
                delay,
                withSpring(0, {
                    duration: 750,
                    dampingRatio: 0.7,
                    mass: 1,
                })
            );
            value.opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
        });
    };

    useFocusEffect(
        React.useCallback(() => {
            playEnter();
            // optional: return a cleanup if you want to do something on blur
            return () => { };
        }, [])
    );

    const getAnimatedStyle = (index: number) =>
        useAnimatedStyle(() => ({
            transform: [{ translateY: animatedValues[index].translateY.value }],
            opacity: animatedValues[index].opacity.value,
        }));

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

    const [syncError, setSyncError] = useState<Error | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [loadingSku, setLoadingSku] = useState<string | null>(null);
    const processedTransactionIds = new Set();

    const {
        connected,
        products,
        currentPurchase,
        currentPurchaseError,
        getProducts,
        requestPurchase,
        validateReceipt,
        finishTransaction
    } = useIAP({
        onPurchaseSuccess: async (purchase) => {
            if (processedTransactionIds.has(purchase.transactionId)) {
                console.log('Transaction already processed:', purchase.transactionId);
                return;
            }

            processedTransactionIds.add(purchase.transactionId);

            try {
                await finishTransaction({
                    purchase: purchase,
                    isConsumable: true
                });

                InteractionManager.runAfterInteractions(() => {
                    Alert.alert('Thank you ❤️', 'Your support is greatly appreciated!');
                    console.log('Purchase successful:');
                });

                setLoadingSku(null);
            } catch (e) {
                console.log('Error finishing transaction', e);
                setLoadingSku(null);
            }


        },
        onPurchaseError: (error) => {
            InteractionManager.runAfterInteractions(() => {
                Alert.alert('An error occured while processing your purchase. Please try again later.');
                setLoadingSku(null);
            });
        },
        onSyncError: (error) => {
            console.log('Sync error occurred:', error);
            setSyncError(error);
            InteractionManager.runAfterInteractions(() => {
                Alert.alert(
                    'Sync Error',
                    'Failed to synchronize with App Store. You may need to enter your password to verify subscriptions.',
                    [{ text: 'OK', onPress: () => setSyncError(null) }],
                );
            });
        },
    });

    const initializeIAP = async () => {
        try {
            await Promise.all([
                getProducts(productSkus),
            ]);
            setIsReady(true);
            setLoadError(false);
        } catch (error) {
            setLoadError(true);
            console.error('Error initializing IAP:', error);
        }
    };

    // Fetch products and subscriptions only when connected
    useEffect(() => {
        if (!connected) return;

        initializeIAP();
    }, [connected, getProducts]);

    // useEffect(() => {
    //     if (currentPurchase) {
    //         InteractionManager.runAfterInteractions(async () => {
    //             console.log('Current purchase:', currentPurchase);

    //             try {
    //                 await finishTransaction({
    //                     purchase: currentPurchase,
    //                     isConsumable: true
    //                 });
    //             } catch (error) {
    //                 console.error('Error finishing transaction:', error);
    //             }
    //         });
    //     }

    //     if (currentPurchaseError) {
    //         InteractionManager.runAfterInteractions(() => {
    //             Alert.alert('Purchase error', JSON.stringify(currentPurchaseError));
    //         });
    //     }
    // }, [currentPurchase, currentPurchaseError]);


    return (
        <GestureHandlerRootView>
            <View style={{ backgroundColor: '#09090B', flex: 1 }}>

                <LinearGradient
                    colors={['#09090B', '#100528', '#09090B']}
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

                    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 0 }}>
                        {/* <View style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 22, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', }}>
                            <BackButton />
                            <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaMedium', fontSize: 18, lineHeight: 24, marginLeft: 10 }}>About Rollio</Text>
                        </View> */}

                        <ScrollView
                            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                            keyboardShouldPersistTaps="handled"
                            contentInsetAdjustmentBehavior="always"
                            // contentInsetAdjustmentBehavior="automatic"
                            showsVerticalScrollIndicator={false}

                        >
                            <Reanimated.View style={[getAnimatedStyle(0), styles.blocks]}>
                                <Text style={{ color: '#D1D1D1', fontFamily: 'LufgaRegular', fontSize: 15, lineHeight: 22 }}>
                                    Rollio is a passion project built with love for the film photography community. If you enjoy using the app and want to show your appreciation, you can make a small contribution below.
                                </Text>
                            </Reanimated.View>

                            <Reanimated.View style={[getAnimatedStyle(1), styles.blocks]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <HeartShineIcon width={24} height={24} style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaMedium', fontSize: 18 }}>
                                        Support the Project
                                    </Text>
                                </View>
                                <Text style={{ color: '#D1D1D1', fontFamily: 'LufgaRegular', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                    The support options are completely optional and do not unlock additional features.
                                </Text>

                                {syncError && (
                                    <View style={{}}>
                                        <Text style={{}}>
                                            Sync error: Please verify your App Store credentials
                                        </Text>
                                    </View>
                                )}

                                {((!isReady && loadError) || (!connected)) && (
                                    <View style={{}}>
                                        <Text style={{ color: '#DC3E42', marginBottom: 10 }}>
                                            Error loading items. Please check your internet connection and try again.
                                        </Text>
                                        <TouchableOpacity
                                            style={{}}
                                            onPress={initializeIAP}
                                        >
                                            <Text style={{ color: '#fff', textDecorationLine: 'underline', textDecorationColor: '#fff' }}>Retry</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View>
                                    {!connected ? (
                                        <Text style={{ color: '#D1D1D1', fontFamily: 'LufgaRegular', fontSize: 12, lineHeight: 20 }}>
                                            Connecting to the App Store... Please wait.
                                        </Text>
                                    ) : (
                                        <View style={{ gap: 20 }}>
                                            {[...products]
                                                .sort((a, b) => productSkus.indexOf(a.id) - productSkus.indexOf(b.id))
                                                .map((item) => {
                                                    if (item.platform === 'android') {

                                                        return (
                                                            <View key={item.title} style={{ gap: 0 }}>
                                                                <TouchableOpacity
                                                                    style={[styles.supportButton]}
                                                                    onPress={() => {
                                                                        setLoadingSku(item.id);

                                                                        setTimeout(() => {
                                                                            requestPurchase({
                                                                                request: {
                                                                                    skus: [item.id],
                                                                                },
                                                                            });
                                                                        }, 1000);

                                                                        setTimeout(() => {
                                                                            setLoadingSku((prev) => prev === item.id ? null : prev);
                                                                        }, 20000);
                                                                    }}>
                                                                    {loadingSku === item.id ? (
                                                                        <ActivityIndicator color="#FFFFFF" />
                                                                    ) : (
                                                                        <Text style={styles.buttonText}>
                                                                            {item.oneTimePurchaseOfferDetails?.formattedPrice} - {item.displayName}
                                                                        </Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                        );
                                                    }

                                                    if (item.platform === 'ios') {
                                                        return (
                                                            <View key={item.title} style={{ gap: 0 }}>
                                                                <TouchableOpacity
                                                                    style={[styles.supportButton]}
                                                                    onPress={() => {
                                                                        setLoadingSku(item.id);
                                                                        requestPurchase({
                                                                            request: {
                                                                                sku: item.id,
                                                                            },
                                                                        });
                                                                        setTimeout(() => {
                                                                            setLoadingSku((prev) => prev === item.id ? null : prev);
                                                                        }, 20000);
                                                                    }}>
                                                                    {loadingSku === item.id ? (
                                                                        <ActivityIndicator color="#FFFFFF" />
                                                                    ) : (
                                                                        <Text style={styles.buttonText}>
                                                                            {item.displayPrice} - {item.title}
                                                                        </Text>
                                                                    )}
                                                                </TouchableOpacity>
                                                            </View>
                                                        );
                                                    }
                                                })}
                                        </View>
                                    )}
                                </View>

                            </Reanimated.View>

                            <Reanimated.View style={[getAnimatedStyle(2), styles.blocks]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <StarFallIcon width={24} height={24} style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaMedium', fontSize: 18 }}>
                                        Leave a Review
                                    </Text>

                                </View>
                                <Text style={{ color: '#D1D1D1', fontFamily: 'LufgaRegular', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                    Love using Rollio? Let others know by leaving a review!
                                </Text>

                                <TouchableOpacity
                                    style={[styles.supportButton, { marginBottom: 0 }]}
                                    onPress={() => {
                                        if (storeURL) {
                                            Linking.openURL(storeURL).catch((err) => {
                                                console.error('Failed to open store URL:', err);
                                                Alert.alert('Error', 'Failed to open the store URL. Please try again later.');
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.buttonText}>Write a Review</Text>
                                </TouchableOpacity>
                            </Reanimated.View>

                            <Reanimated.View style={[getAnimatedStyle(3), styles.blocks]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <ShareIcon width={24} height={24} style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFFFFF', fontFamily: 'LufgaMedium', fontSize: 18 }}>
                                        Spread the Word
                                    </Text>
                                </View>
                                <Text style={{ color: '#D1D1D1', fontFamily: 'LufgaRegular', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                    Know someone who is into film photography? Share Rollio with them and help it reach more film lovers.
                                </Text>

                                <TouchableOpacity
                                    style={[styles.supportButton, { marginBottom: 0 }]}
                                    onPress={handleSharing}
                                >
                                    <Text style={styles.buttonText}>Share Rollio</Text>
                                </TouchableOpacity>
                            </Reanimated.View>
                        </ScrollView>

                    </View >


                </LinearGradient>
            </View>

        </GestureHandlerRootView >


    );
}

const styles = StyleSheet.create({
    blocks: {
        paddingLeft: 18,
        paddingRight: 18,
        paddingTop: 24,
        paddingBottom: 24,
        backgroundColor: '#ffffff0D',
        borderRadius: 24,
        marginBottom: 20,
    },
    supportButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 9999,
        backgroundColor: '#ffffff0D',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontFamily: 'LufgaRegular',
        fontSize: 15,
    },
});