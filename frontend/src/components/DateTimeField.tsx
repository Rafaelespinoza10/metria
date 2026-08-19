import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';

interface DateTimeFieldProps {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  maximumDate?: Date;
}

function formatDateTime(value: Date): string {
  const date = value.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** Back-dating control for entry forms: a field-styled pressable that opens the
 *  native picker (single datetime on iOS; date → time steps on Android). */
export function DateTimeField({ label, value, onChange, maximumDate }: DateTimeFieldProps) {
  const [stage, setStage] = useState<'closed' | 'date' | 'time'>('closed');

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === 'dismissed' || !picked) {
      setStage('closed');
      return;
    }
    if (Platform.OS === 'android' && stage === 'date') {
      onChange(picked);
      setStage('time');
      return;
    }
    onChange(picked);
    if (Platform.OS === 'android') setStage('closed');
  };

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
      <PressableScale
        onPress={() => setStage(stage === 'closed' ? 'date' : 'closed')}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="rounded-2xl border border-black/5 bg-ink-900 px-4 py-3.5"
      >
        <Text className="text-base text-content-primary">{formatDateTime(value)}</Text>
      </PressableScale>
      {stage !== 'closed' ? (
        <DateTimePicker
          value={value}
          mode={Platform.OS === 'ios' ? 'datetime' : stage}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
