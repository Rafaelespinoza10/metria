import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../../../theme';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
}

export function AuthTextField({ label, ...props }: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.content.tertiary}
        selectionColor={theme.colors.brand.DEFAULT}
        className={`rounded-2xl border bg-ink-900 px-4 py-4 text-base text-content-primary ${
          focused ? 'border-brand' : 'border-black/5'
        }`}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
      />
    </View>
  );
}
