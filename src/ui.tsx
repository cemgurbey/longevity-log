import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { palette } from './theme';
import type { ThemeColors } from './theme';
import { formatDate, toLocalDateString } from './db';

/** The app is dark-mode only. */
export function useThemeColors(): ThemeColors {
  return palette.dark;
}

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useThemeColors();
  return <View style={[{ flex: 1, backgroundColor: c.bg, padding: 16 }, style]}>{children}</View>;
}

/** Screen variant for forms: shifts content up so the focused field and buttons stay visible above the keyboard. */
export function FormScreen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <Screen style={style}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        {children}
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Floating "Done" button just above the iOS keyboard, banking-app style: a
 * filled squircle that dismisses the keyboard. This is what makes the keyboard
 * dismissable on number pads, which have no return key of their own.
 *
 * Note: each field gets its own InputAccessoryView with a unique ID. Sharing
 * one ID across fields is broken since React Native 0.76 (facebook/react-native#47865):
 * the bar would only appear for the first-focused field.
 */
function DoneBar({ nativeID }: { nativeID: string }) {
  const c = useThemeColors();
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={{ alignItems: 'flex-end', paddingRight: 16, paddingBottom: 10 }}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          style={({ pressed }) => ({
            backgroundColor: c.accent,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 14,
            opacity: pressed ? 0.8 : 1,
          })}>
          <Text style={{ color: c.accentText, fontSize: 16, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/**
 * Form scroll container. Tapping anywhere outside a text input dismisses the
 * keyboard — the conventional iOS way to get rid of it, and it works for
 * number pads too. Taps on fields, chips and buttons are unaffected.
 */
export function FormScrollView({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}>
      <Pressable onPress={() => Keyboard.dismiss()} style={{ flex: 1 }}>
        {children}
      </Pressable>
    </ScrollView>
  );
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
  const accessoryID = `doneBar-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
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
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryID : undefined}
      />
      {Platform.OS === 'ios' && <DoneBar nativeID={accessoryID} />}
    </View>
  );
}

function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * Date picker. Tapping the field opens the calendar directly:
 * a bottom sheet with an inline calendar on iOS, the native dialog on Android.
 */
export function DateField({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseLocalDate(value));

  function openPicker() {
    setDraft(parseLocalDate(value));
    setOpen(true);
  }

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Date</Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => ({
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          opacity: pressed ? 0.7 : 1,
        })}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{formatDate(value)}</Text>
      </Pressable>

      {Platform.OS === 'android'
        ? open && (
            <DateTimePicker
              value={draft}
              mode="date"
              display="default"
              onChange={(event, selected) => {
                setOpen(false);
                if (event.type === 'set' && selected) {
                  onChange(toLocalDateString(selected));
                }
              }}
            />
          )
        : (
          <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => setOpen(false)}>
            <Pressable
              onPress={() => setOpen(false)}
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: c.card,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 16,
                  paddingBottom: 32,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                  <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                    <Text style={{ color: c.sub, fontSize: 16 }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onChange(toLocalDateString(draft));
                      setOpen(false);
                    }}
                    hitSlop={10}>
                    <Text style={{ color: c.accent, fontSize: 16, fontWeight: '700' }}>Done</Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="inline"
                  onChange={(_event, selected) => {
                    if (selected) setDraft(selected);
                  }}
                />
              </View>
            </Pressable>
          </Modal>
        )}
    </View>
  );
}

export function DangerButton({
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
        backgroundColor: 'transparent',
        borderColor: c.danger,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        marginTop: 10,
      })}>
      <Text style={{ color: c.danger, fontSize: 16, fontWeight: '700' }}>{title}</Text>
    </Pressable>
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
