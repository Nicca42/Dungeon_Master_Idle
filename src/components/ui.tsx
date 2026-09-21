import React, { Children, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { ChevronRight, Coins, LucideIcon } from 'lucide-react-native';
import { colors as c, fonts } from '../theme';

export function Label({
  children,
  color = c.muted,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}
export function Body({
  children,
  color = c.muted,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  return <Text style={[styles.body, { color }, style]}>{children}</Text>;
}
export function Heading({
  children,
  size = 24,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: TextStyle;
}) {
  return (
    <Text style={[styles.heading, { fontSize: size }, style]}>
      {Children.map(children, (child) =>
        typeof child === 'string' || typeof child === 'number'
          ? String(child)
              .split(/(\d+)/)
              .map((part, i) =>
                /\d/.test(part) ? (
                  <Text key={i} style={{ fontFamily: fonts.medium }}>
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )
          : child,
      )}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  icon: Icon,
  compact = false,
  testID,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  compact?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        compact && { paddingHorizontal: 13, minHeight: 38 },
        hover && !disabled && { backgroundColor: secondary ? '#38323e' : '#f5ce8d' },
        disabled && { opacity: 0.35 },
        pressed && { transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      {Icon && <Icon size={16} color={secondary ? c.text : '#2c2318'} strokeWidth={1.8} />}
      <Text style={[styles.buttonText, secondary && { color: c.text }]}>{children}</Text>
    </Pressable>
  );
}
export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
export function Pill({
  children,
  color = c.green,
  background = c.greenDark,
}: {
  children: ReactNode;
  color?: string;
  background?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: background,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 10, color, letterSpacing: 0.5 }}>
        {children}
      </Text>
    </View>
  );
}
export function Progress({
  value,
  color = c.gold,
  height = 5,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <View
      style={{
        height,
        backgroundColor: '#37313f',
        borderRadius: 3,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function Divider() {
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />;
}
export function Coin({ size = 14 }: { size?: number }) {
  return <Coins size={size} color={c.gold} strokeWidth={1.7} />;
}
export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>
  );
}
export function TextLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 }}
    >
      <Text style={{ color: c.gold, fontFamily: fonts.medium, fontSize: 12 }}>{children}</Text>
      <ChevronRight color={c.gold} size={13} />
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
  heading: { fontFamily: fonts.pixel, color: c.text, lineHeight: undefined },
  button: {
    backgroundColor: c.gold,
    borderRadius: 5,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondary: { backgroundColor: '#29252f', borderWidth: 1, borderColor: '#48404e' },
  buttonText: { fontFamily: fonts.bold, fontSize: 12, color: '#2c2318' },
  panel: {
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    padding: 20,
  },
});
