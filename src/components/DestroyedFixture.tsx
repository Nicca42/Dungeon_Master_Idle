import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Encounter } from '../game/types';
export function DestroyedFixture({ e, x }: { e: Encounter; x: number }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  const shape =
    e.kind === 'slime'
      ? 'M0 24L4 17L10 17L13 12H22L25 18L31 23L27 29H5Z'
      : e.kind === 'zombie'
        ? 'M6 0H24L29 6L25 30H5L1 6Z'
        : ['trapdoor', 'arrows'].includes(e.kind)
          ? 'M1 22L8 14H24L31 22V29H1ZM8 22L12 18M16 22L20 18'
          : 'M1 13L6 6H26L31 13V29H1ZM1 16H31M14 14H18V21H14Z';
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - 3, top: 95, width: 38, height: 38, opacity }}
      testID={`destroyed-fixture-${e.id}`}
      accessibilityLabel={`Destroyed ${e.kind} · awaiting replacement`}
    >
      <Svg width={38} height={38} viewBox="-3 -3 38 38">
        <Path d={shape} fill="none" stroke="#ef526a" strokeWidth={6} opacity={0.25} />
        <Path d={shape} fill="none" stroke="#ff536b" strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}
