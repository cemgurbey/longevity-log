import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps, ViewStyle } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { palette } from './theme';
import type { ThemeColors } from './theme';

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return palette[scheme === 'dark' ? 'dark' : 'light'];
}

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useThemeColors();
  return <View style={[{ flex: 1, backgroundColor: c.bg, padding: 16 }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: 14,
          padding: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          marginBottom: 12,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = useThemeColors();
  return <Text style={{ color: c.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const c = useThemeColors();
  return <Text style={{ color: c.sub, fontSize: 14 }}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: c.accent,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        marginTop: 4,
      })}>
      <Text style={{ color: c.accentText, fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? c.accent : c.card,
        borderColor: selected ? c.accent : c.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ color: selected ? c.accentText : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}

export function Field({ label, value, onChangeText, ...rest }: FieldProps) {
  const c = useThemeColors();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={c.sub}
        style={{
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          color: c.text,
        }}
        {...rest}
      />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const c = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Text style={{ color: c.sub, fontSize: 15, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
