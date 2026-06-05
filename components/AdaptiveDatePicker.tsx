import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Host as SwiftHost, DatePicker as SwiftDatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';
import { Platform, Pressable, Text, View, useColorScheme } from 'react-native';

type AdaptiveDatePickerMode = 'date' | 'datetime';

type AdaptiveDatePickerProps = {
  value: string;
  onChange: (nextIsoValue: string) => void;
  mode?: AdaptiveDatePickerMode;
};

export default function AdaptiveDatePicker({ value, onChange, mode = 'date' }: AdaptiveDatePickerProps) {
  const colorScheme = useColorScheme();
  const isAndroid = Platform.OS === 'android';
  const currentDate = useMemo(() => new Date(value), [value]);

  const formattedDate = useMemo(() => {
    if (mode === 'datetime') {
      return currentDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return currentDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [currentDate, mode]);

  const openAndroidPicker = useCallback(() => {
    const applyDatePart = (selectedDate: Date) => {
      const next = new Date(currentDate);
      next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      onChange(next.toISOString());
      return next;
    };

    const applyTimePart = (baseDate: Date, selectedTime: Date) => {
      const next = new Date(baseDate);
      next.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        selectedTime.getSeconds(),
        selectedTime.getMilliseconds()
      );
      onChange(next.toISOString());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'date',
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type !== 'set' || !selectedDate) {
          return;
        }

        const dateWithUpdatedDay = applyDatePart(selectedDate);

        if (mode !== 'datetime') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }

        DateTimePickerAndroid.open({
          value: dateWithUpdatedDay,
          mode: 'time',
          is24Hour: false,
          onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
            if (timeEvent.type !== 'set' || !selectedTime) {
              return;
            }

            applyTimePart(dateWithUpdatedDay, selectedTime);
          },
        });
      },
    });
  }, [currentDate, mode, onChange]);

  if (isAndroid) {
    return (
      <View
        style={{
          width: '100%',
          paddingTop: 18,
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={openAndroidPicker}
          style={({ pressed }) => ({
            minHeight: 56,
            borderRadius: 50,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            width: '78%',
            maxWidth: mode === 'datetime' ? 280 : 180,
            borderWidth: 1,
            borderColor: colorScheme === 'dark' ? '#2a2a2d' : '#e6e6ee',
            backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f6f6fa',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month' }}
            size={18}
            tintColor={colorScheme === 'dark' ? '#8E8E93' : '#7b8192'}
          />

          <Text
            style={{
              fontFamily: 'LufgaMedium',
              fontSize: 16,
              color: colorScheme === 'dark' ? '#fff' : '#100528',
            }}
          >
            {formattedDate}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SwiftHost matchContents>
      <SwiftDatePicker
        onDateChange={date => {
          onChange(date.toISOString());
        }}
        displayedComponents={mode === 'datetime' ? ['date', 'hourAndMinute'] : ['date']}
        selection={currentDate}
        modifiers={[datePickerStyle('compact')]}
      />
    </SwiftHost>
  );
}
