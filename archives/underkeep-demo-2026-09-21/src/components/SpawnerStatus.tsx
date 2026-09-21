import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { colors as c, fonts } from '../theme';
import { countdown } from './LiveClock';
export function SpawnerStatus({
  remaining,
  capped,
  reduced,
  children,
}: {
  remaining: number;
  capped: boolean;
  reduced: boolean;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const waiting = capped && remaining <= 0;
  useEffect(() => {
    opacity.setValue(1);
    if (!waiting || reduced) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [waiting, reduced]);
  return (
    <Animated.View
      accessibilityLabel={
        waiting
          ? 'Spawn ready, waiting for capacity'
          : capped
            ? 'Spawn timer at capacity'
            : 'Spawn timer'
      }
      style={{ opacity, alignItems: 'center' }}
    >
      {children}
      <Text style={{ fontFamily: fonts.body, fontSize: 8, color: capped ? c.gold : c.purple }}>
        {countdown(Math.max(0, remaining))}
      </Text>
    </Animated.View>
  );
}
