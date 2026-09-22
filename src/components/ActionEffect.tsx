import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Image, View, AccessibilityInfo } from 'react-native';
import { ACTION_IMAGES } from '../art/actionImages';
import { ActionKind, FRAME_MS } from '../art/actionFrames';
const frame = new Animated.Value(0);
let users = 0,
  motion: Animated.CompositeAnimation | undefined;
function start() {
  motion?.stop();
  motion = Animated.loop(
    Animated.sequence(
      Array.from({ length: 8 }, (_, i) =>
        Animated.sequence([
          Animated.timing(frame, {
            toValue: i,
            duration: 0,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.delay(FRAME_MS),
        ]),
      ),
    ),
  );
  motion.start();
}
function stop() {
  motion?.stop();
  frame.setValue(0);
}
let cleanup: (() => void) | undefined;
function subscribe() {
  if (users++ === 0) {
    let reduced = false,
      alive = true;
    const sync = () => {
      if (!reduced && AppState.currentState === 'active') start();
      else stop();
    };
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) {
        reduced = v;
        sync();
      }
    });
    const app = AppState.addEventListener('change', sync),
      pref = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
        reduced = v;
        sync();
      });
    cleanup = () => {
      alive = false;
      app.remove();
      pref.remove();
      stop();
    };
  }
  return () => {
    if (--users === 0) cleanup?.();
  };
}
/** Shared 8fps clock: no per-character React updates or timers. */
export const ActionEffect = memo(function ActionEffect({
  kind,
  tier = 1,
  size = 36,
  overlay = false,
  once = false,
  hideOnComplete = false,
}: {
  kind: ActionKind;
  tier?: number;
  size?: number;
  overlay?: boolean;
  once?: boolean;
  hideOnComplete?: boolean;
}) {
  const [complete, setComplete] = useState(false);
  const localFrame = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!once) return subscribe();
    const animation = Animated.sequence(
      Array.from({ length: 8 }, (_, i) =>
        Animated.sequence([
          Animated.timing(localFrame, {
            toValue: i,
            duration: 0,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.delay(FRAME_MS),
        ]),
      ),
    );
    animation.start(({ finished }) => {
      if (finished) setComplete(true);
    });
    return () => animation.stop();
  }, [once, localFrame]);
  const activeFrame = once ? localFrame : frame;
  if (once && hideOnComplete && complete) return null;
  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, overflow: 'hidden' }}
      accessibilityLabel={kind}
    >
      <Animated.View
        style={{
          width: size * 8,
          height: size,
          transform: [
            {
              translateX: activeFrame.interpolate({
                inputRange: [0, 7],
                outputRange: [0, -size * 7],
              }),
            },
          ],
        }}
      >
        <Image
          source={
            ACTION_IMAGES[overlay ? (`${kind} effect` as const) : kind][
              Math.min(4, Math.max(0, tier - 1))
            ]
          }
          style={{ width: size * 8, height: size }}
        />
      </Animated.View>
    </View>
  );
});
