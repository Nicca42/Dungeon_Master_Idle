import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { Actor, GameState } from '../game/types';
import { staffRoute, staffRoutePose, StaffPoint } from '../game/staffRoute';
import { encounterX, FLOOR_ROWS } from '../game/layout';
import { upgradingFloor } from '../game/research';
import { staffSpeed } from '../game/staffSpeed';
import { TIME_SCALE, UI_PULSE_MS } from '../game/timing';
import { Sprite } from './PixelArt';
export type StaffTravel = {
  actor: Actor;
  floor: number;
  x: number;
  hidden: boolean;
  facing: number;
};
type Journey = {
  key: string;
  path: StaffPoint[];
  start: number;
  end: number;
  destination: StaffPoint;
};
export function useStaffTransit(g: GameState, reduced: boolean): StaffTravel[] {
  const journeys = useRef(new Map<number, Journey>()).current;
  const working =
    upgradingFloor(g) ??
    g.floors.find((f) => ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage));
  const crew = g.actors.filter(
    (a) => ['miner', 'maintenance', 'defender'].includes(a.role) && a.health > 0,
  );
  const result: StaffTravel[] = [];
  for (const [index, actor] of crew.entries()) {
    const task = actor.task;
    const floor =
      actor.status === 'resting'
        ? 0
        : (task?.floor ??
          (actor.role === 'miner'
            ? (working?.id ?? 0)
            : actor.returnUntil
              ? 0
              : (actor.workFloor ?? 0)));
    const x =
      floor === 0
        ? actor.status === 'resting'
          ? 367
          : actor.role === 'defender'
            ? 120
            : 329
        : task
          ? encounterX(
              g.floors[floor - 1],
              Math.max(
                0,
                g.floors[floor - 1].encounters.findIndex((e) => e.id === task.encounter),
              ),
            ) + 24
          : 75;
    const key = `${floor}:${actor.status === 'resting'}:${task?.encounter ?? ''}:${task?.arriveAt ?? ''}`;
    let journey = journeys.get(actor.id);
    if (!journey || journey.key !== key) {
      const from = journey
        ? g.now < journey.end
          ? staffRoutePose(
              journey.path,
              (g.now - journey.start) / Math.max(1, journey.end - journey.start),
            )
          : journey.destination
        : { floor: 0, x: 329 + index * 4 };
      const destination = { floor, x };
      const unfinished =
        floor > 0 &&
        ['locked', 'queued', 'excavating', 'foundation'].includes(g.floors[floor - 1].stage);
      // Existing jobs already underway resume at their real location on reload.
      const settled =
        !journey &&
        ((task && (task.arriveAt ?? 0) <= g.now) || (floor === 0 && actor.status !== 'resting'));
      const deadline =
        task?.arriveAt ?? g.now + ((8000 * 10) / staffSpeed(g, actor) + index * 180) * TIME_SCALE;
      // Stagger the visible cave arrivals within the existing travel window.
      // Front-of-line workers arrive first; nobody is delayed beyond their job deadline.
      const arrivalLead = task
        ? Math.min(
            Math.max(0, deadline - g.now) * 0.3,
            (crew.length - 1 - index) * 180 * TIME_SCALE,
          )
        : 0;
      journey = {
        key,
        path: staffRoute(from, destination, unfinished),
        start: g.now,
        end: reduced || settled ? g.now : Math.max(g.now, deadline - arrivalLead),
        destination,
      };
      journeys.set(actor.id, journey);
    }
    if (g.now < journey.end)
      result.push({
        actor,
        ...staffRoutePose(
          journey.path,
          (g.now - journey.start) / Math.max(1, journey.end - journey.start),
        ),
      });
  }
  const alive = new Set(crew.map((a) => a.id));
  for (const id of journeys.keys()) if (!alive.has(id)) journeys.delete(id);
  return result;
}
function Traveller({
  travel,
  reduced,
  onActor,
}: {
  travel: StaffTravel;
  reduced: boolean;
  onActor: (a: Actor) => void;
}) {
  const x = useRef(new Animated.Value(travel.x)).current;
  useEffect(() => {
    const animation = Animated.timing(x, {
      toValue: travel.x,
      duration: reduced ? 0 : UI_PULSE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [travel.x, reduced, x]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: travel.floor === 0 ? 103 : FLOOR_ROWS.actors + 28,
        zIndex: 6,
        transform: [{ translateX: x }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${travel.actor.name} travelling via cave`}
        onPress={() => onActor(travel.actor)}
      >
        <Sprite
          sceneCharacter
          kind={travel.actor.role}
          tier={travel.actor.outfitTier}
          variant={travel.actor.variant}
          saturation={travel.actor.outfitSaturation}
          size={30}
          facing={travel.facing}
          animate={!reduced}
        />
      </Pressable>
    </Animated.View>
  );
}
export function StaffTransit({
  travels,
  floor,
  reduced,
  onActor,
}: {
  travels: StaffTravel[];
  floor: number;
  reduced: boolean;
  onActor: (a: Actor) => void;
}) {
  return (
    <>
      {travels
        .filter((t) => !t.hidden && t.floor === floor)
        .map((t) => (
          <Traveller key={t.actor.id} travel={t} reduced={reduced} onActor={onActor} />
        ))}
    </>
  );
}
