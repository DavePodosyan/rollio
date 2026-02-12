import { calculateEV100 } from "@/utils/calculations";
import { APERTURE_OPTIONS, SHUTTER_SPEED_OPTIONS } from "@/utils/cameraSettings";
import { ExifTags, readAsync } from "@lodev09/react-native-exify";
import { File, Paths } from "expo-file-system";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";

interface FilmSettingsFromPhotoProps {
    filmIso: number;
    imageUri: string | null;
    onApplySettings: (settings: { aperture: string; shutter_speed: string }) => void;
}

interface Suggestion {
    apertureLabel: string;
    shutterLabel: string;
    shutterValue: number;
    deviationStops: number;
    theoreticalSeconds: number;
}

// Parse "1/60" -> 0.01666, "30" -> 30, "Auto" -> null
const parseShutterString = (str: string) => {
    if (str.includes('/')) {
        const [num, den] = str.split('/');
        return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(str);
};

// Create a lookup map for faster calculations
// Result: [{ label: "1/60", value: 0.0166 }, { label: "30", value: 30 }, ...]
const PARSED_SHUTTERS = SHUTTER_SPEED_OPTIONS
    .filter(s => s !== "Auto")
    .map(s => ({ label: s, value: parseShutterString(s) }))
    .sort((a, b) => a.value - b.value); // Sort for accurate searching if needed

const findClosestShutter = (targetSeconds: number) => {
    // Reduce array to find the item with smallest difference
    return PARSED_SHUTTERS.reduce((prev, curr) => {
        return (Math.abs(curr.value - targetSeconds) < Math.abs(prev.value - targetSeconds)
            ? curr
            : prev);
    });
};

export default function FilmSettingsFromPhoto({ filmIso, imageUri, onApplySettings }: FilmSettingsFromPhotoProps) {
    const colorScheme = useColorScheme();
    const [suggestions, setSuggestions] = useState([] as Suggestion[]);
    const [error, setError] = useState<string | null>(null);

    const asset = useMemo(() => {

        if (imageUri?.startsWith('frames/rollio_')) {
            return new File(Paths.document, imageUri);
        }

        return imageUri ? new File(imageUri) : null;
    }, [imageUri]);

    useEffect(() => {
        if (!asset || !asset.exists) {
            return;
        }
        (async () => {
            calculateMatches(await readAsync(asset.uri));
        })();
    }, [asset, filmIso]);

    const calculateMatches = (exif: ExifTags | undefined) => {
        const { FNumber, ExposureTime, ISOSpeedRatings } = exif || {};

        const phoneIso = Array.isArray(ISOSpeedRatings)
            ? ISOSpeedRatings[0]
            : Number(ISOSpeedRatings);

        if (!FNumber || !ExposureTime || !phoneIso) {
            setError("Attached photo is missing required EXIF data.");
            setSuggestions([]);
            return;
        }
        setError(null);

        // 1. EV at ISO 100 (scene brightness)
        // const ev100 = calculateEV100(FNumber, ExposureTime, phoneIso);
        const ev100 = Math.log2((FNumber ** 2) / ExposureTime)
            - Math.log2(phoneIso / 100);   // ← note: + here (not -)

        // 2. Effective EV to use for the film speed
        const targetEV = ev100 + Math.log2(filmIso / 100);
        // or: ev100 + Math.log2(100 / filmIso);

        // 3. Generate pairs
        const validPairs = APERTURE_OPTIONS
            .filter(a => a !== "Auto")
            .map(apertureStr => {
                const apertureVal = parseFloat(apertureStr);
                // if (isNaN(apertureVal)) return null;

                const theoreticalTime = (apertureVal ** 2) / (2 ** targetEV);

                const bestMatch = findClosestShutter(theoreticalTime);

                // Better deviation metric: in stops (0 = perfect match)
                const actualTime = bestMatch.value;
                const deviationStops = Math.log2(actualTime / theoreticalTime);

                return {
                    apertureLabel: apertureStr,
                    shutterLabel: bestMatch.label,
                    shutterValue: bestMatch.value,
                    deviationStops,                 // ≈0 → good, 0.3≈⅓ stop, 1=full stop off
                    theoreticalSeconds: theoreticalTime
                } as Suggestion;
            })
            .filter(Boolean)
            .filter(item => ["1.4", "1.8", "2", "2.8", "4", "5.6", "8", "11", "16", "22"].includes(item.apertureLabel));

        setSuggestions(validPairs);
    };

    if (!asset || !asset.exists) {
        return null;
    }

    return (
        <View style={{}}>
            <Text style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 17,
                marginBottom: 8,
                fontFamily: 'LufgaMedium',
                color: colorScheme === 'dark' ? '#fff' : '#100528'
            }}
            >Suggested Settings</Text>

            {!error && <Text style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 13,
                marginBottom: 24,
                fontFamily: "LufgaRegular",
                color: "#8E8E93"
            }}>
                {`Based on the attached photo's EXIF data and the film's ISO (${filmIso}), here are some suggested aperture and shutter speed combinations to achieve a similar exposure.`}
            </Text>}

            {error && <Text style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 14,
                marginBottom: 24,
                fontFamily: "LufgaRegular",
                color: "#8E8E93"
            }}>{error}</Text>}


            {suggestions.length > 0 && (
                <GlassContainer
                    spacing={10}
                    style={{
                        flexDirection: 'row',
                        gap: 12,
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                    {suggestions.map((item, index) => (
                        <GlassView
                            key={index}
                            isInteractive={true}
                            style={{
                                borderRadius: 22,
                                // flexBasis: '45%',
                                // flexGrow: 2,
                                // flexShrink: 1,
                                width: '45%'
                            }}>
                            <Pressable
                                onPress={() => onApplySettings({ aperture: item.apertureLabel, shutter_speed: item.shutterLabel })}
                                // key={index}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    paddingVertical: 10,
                                    paddingHorizontal: 20,
                                    // borderBottomWidth: index === suggestions.length - 1 ? 0 : 1,
                                    // borderColor: colorScheme === 'dark' ? '#FFFFFF33' : '#10052833',
                                }}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontFamily: 'LufgaRegular',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528'
                                }}>f/{item.apertureLabel}</Text>
                                <Text style={{
                                    fontSize: 14,
                                    fontFamily: 'LufgaRegular',
                                    color: colorScheme === 'dark' ? '#fff' : '#100528'
                                }}>{item.shutterLabel}s</Text>
                            </Pressable>
                        </GlassView>

                    ))}
                </GlassContainer>
            )}



        </View>
    );
}