import { inactiveOfficeStaff } from '../game/idleStaff';
import { StaffTransit, StaffTravel, useStaffTransit } from './StaffTransit';
import { useRouter } from 'expo-router';
import { PixelActionIcon } from './PixelActionIcon';
import { CharacterActions } from './CharacterAction';
import { latestActorCues, cueKey } from '../game/actionVisuals';
import { ActionEffect } from './ActionEffect';
import { roomTier, unlockedTier } from '../game/progression';
import { TierSlime } from './TierArt';
import { installationProgress } from '../game/installation';
import { staffSpeed } from '../game/staffSpeed';
import { arrivalAt } from '../game/spawnTiming';
import { SpawnArt } from './ArtVariants';
import { SpawnerStatus } from './SpawnerStatus';
import { nextLook } from '../game/appearance';
import { fullyRecovered } from '../game/recovery';
import { DestroyedFixture } from './DestroyedFixture';
import { upgradingFloor } from '../game/research';
import { staffRoom } from '../game/staffRest';
import { rule, arrivalInterval, partyFormationTime } from '../game/config';
import { restWaiters } from '../game/rest';
import { securityPose, ADVENTURER_SPAWN_X } from '../game/security';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Easing, View, Text, Pressable, ScrollView, Modal } from 'react-native';
import Svg, { Rect, Path, G, Circle } from 'react-native-svg';
import {
  Clock3,
  Settings2,
  Hammer,
  LockKeyhole,
  LockOpen,
  Swords,
  Shield,
  Heart,
  Eye,
  Mail,
  MousePointerClick,
} from 'lucide-react-native';
import { GameState, Actor, Floor, Party, ActionCue } from '../game/types';
import { movementDuration, UI_PULSE_MS, TIME_SCALE } from '../game/timing';
import { HOUR, gameDate, TICK } from '../game/content';
import { PixelGear } from './PixelGear';
import { HealthBars } from './HealthBars';
import { countdown } from './LiveClock';
import {
  maintenanceNeeded,
  diggersInactive,
  excavationEnd,
  defenseWarning,
  floorMobCount,
  mobLimitReached,
  nextArrivalClass,
  guildPartyForecast,
  waitingPartyCounts,
  meetsEntryRequirements,
} from '../game/engine';
import { dispatch, useGame } from '../game/store';
import { colors as c, fonts } from '../theme';
import { Body, Heading, Label, Row, Pill, Progress, Button } from './ui';
import { Surface, FloorArt, Sprite, SpriteShape, SpriteKind } from './PixelArt';

import {
  FLOOR_ROWS,
  CELL_WIDTH,
  encounterX,
  slotX,
  EXIT_CENTER,
  REST_CENTER,
  ENTRY_CENTER,
} from '../game/layout';
const WIDTH = 640;
const NO_ENCOUNTERS: Floor['encounters'] = [];
export const routeX = encounterX;

function Spinner({
  progress,
  reduced,
  color = c.purple,
}: {
  progress: number;
  reduced: boolean;
  color?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const a = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    a.start();
    return () => a.stop();
  }, [reduced]);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    >
      <Svg width={16} height={16}>
        <Circle cx={8} cy={8} r={6} stroke="#493950" strokeWidth={2} fill="none" />
        <Circle
          cx={8}
          cy={8}
          r={6}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={
            progress >= 1
              ? undefined
              : `${Math.max(0, progress) * 2 * Math.PI * 6} ${2 * Math.PI * 6}`
          }
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}
function Cave({
  x,
  y,
  entry,
  locked = false,
  compact = false,
}: {
  x: number;
  y: number;
  entry: boolean;
  locked?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - 26,
        top: y,
        width: 52,
        height: 65,
        transform: [{ scaleX: compact ? 0.72 : 0.9 }, { scaleY: compact ? 0.85 : 1 }],
        transformOrigin: 'top center',
      }}
    >
      <Svg width={52} height={65}>
        <Path d="M0 62V28H5V17H12V9H21V5H34V12H44V24H50V62Z" fill="#736377" />
        <Path d="M8 62V29H14V21H21V16H31V22H39V32H43V62Z" fill="#100f17" />
        <Path d="M3 29h8v7H3ZM11 17h8v5h-8ZM35 13h7v8h-7Z" fill="#9a8490" />
        <Rect
          x={7}
          y={0}
          width={38}
          height={13}
          fill={locked ? '#68636c' : entry ? '#8d3739' : '#346546'}
        />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          top: 1,
          width: 52,
          textAlign: 'center',
          fontSize: 8,
          fontFamily: fonts.bold,
          color: '#fff4de',
        }}
      >
        {entry ? 'NEXT LVL' : 'EXIT'}
      </Text>
    </View>
  );
}
function SurfaceParty({ g, p, reduced }: { g: GameState; p: Party; reduced: boolean }) {
  const progress = Math.min(1, Math.max(0, 1 - (p.surfaceUntil - g.now) / partyFormationTime(g)));
  const x = useRef(new Animated.Value(ADVENTURER_SPAWN_X)).current;
  useEffect(() => {
    const a = Animated.timing(x, {
      toValue: ADVENTURER_SPAWN_X - 470 * progress,
      duration: movementDuration(reduced, UI_PULSE_MS),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [progress, reduced]);
  return (
    <Animated.View
      accessibilityLabel={`Party ${p.id} walking from spawn to the cave`}
      style={{
        position: 'absolute',
        left: 0,
        top: 103,
        flexDirection: 'row',
        transform: [{ translateX: x }],
      }}
    >
      {p.members
        .map((id) => g.actors.find((a) => a.id === id))
        .filter((a): a is Actor => !!a && a.health > 0)
        .map((a) => (
          <Sprite
            sceneCharacter
            key={a.id}
            kind={a.role}
            saturation={a.outfitSaturation}
            variant={a.variant}
            tier={a.outfitTier}
            size={27}
            facing={-1}
            animate={!reduced}
          />
        ))}
    </Animated.View>
  );
}
function WalkingWorker({
  speed,
  target,
  start,
  reduced,
  children,
  arriveAt,
  now,
}: {
  arriveAt?: number;
  now: number;
  speed: number;
  target: number;
  start: number;
  reduced: boolean;
  children: (arrived: boolean) => React.ReactNode;
}) {
  const x = useRef(new Animated.Value(start)).current;
  const [arrived, setArrived] = useState(start === target);
  useEffect(() => {
    setArrived(false);
    const motion = Animated.timing(x, {
      toValue: target,
      duration: reduced
        ? 0
        : arriveAt !== undefined
          ? Math.max(0, (arriveAt - now) / TIME_SCALE)
          : (8000 * 10) / speed,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    motion.start(({ finished }) => {
      if (finished) setArrived(true);
    });
    return () => motion.stop();
  }, [target, reduced, speed, arriveAt]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: FLOOR_ROWS.actors + 28,
        zIndex: 4,
        transform: [{ translateX: x }],
      }}
    >
      {children(arrived)}
    </Animated.View>
  );
}
function SurfaceMob({ e, reduced }: { e: GameState['escapedMobs'][number]; reduced: boolean }) {
  const x = useRef(new Animated.Value(e.position)).current;
  useEffect(() => {
    const motion = Animated.timing(x, {
      toValue: e.position,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [e.position, reduced]);
  return (
    <Animated.View
      style={{ position: 'absolute', left: 0, top: 105, transform: [{ translateX: x }] }}
    >
      <HealthBars health={e.health} defense={e.defense} />
      <Sprite
        sceneCharacter
        kind={e.kind}
        variant={e.variant}
        saturation={e.saturation}
        size={30}
        facing={1}
        animate={!reduced}
      />
    </Animated.View>
  );
}
function SecurityGuard({
  g,
  a,
  index,
  reduced,
  onActor,
}: {
  g: GameState;
  a: Actor;
  index: number;
  reduced: boolean;
  onActor: (a: Actor) => void;
}) {
  const pose = securityPose(g, a, index);
  const x = useRef(new Animated.Value(pose.x)).current;
  useEffect(() => {
    const motion = Animated.timing(x, {
      toValue: pose.x,
      duration: reduced ? 0 : pose.arriving ? UI_PULSE_MS : 1800,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [pose.x, pose.arriving, reduced]);
  return (
    <Animated.View
      testID={`security-${a.id}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 91 - Math.floor(index / 4) * 22,
        transform: [{ translateX: x }],
        opacity: a.status === 'resting' ? 0.55 : 1,
      }}
    >
      <Pressable
        onPress={() => onActor(a)}
        accessibilityRole="button"
        accessibilityLabel={`Guard ${a.name}`}
      >
        <HealthBars
          health={a.health}
          maxHealth={a.maxHealth}
          defense={a.defense}
          maxDefense={a.maxDefense}
        />
        <View style={{ width: 24 }}>
          <Progress value={a.stamina / a.maxStamina} color={c.green} height={3} />
        </View>
        <Sprite
          sceneCharacter
          kind="defender"
          saturation={a.outfitSaturation}
          variant={a.variant}
          tier={a.outfitTier}
          size={28}
          facing={pose.facing}
          animate={a.status === 'working' && !reduced}
        />
        {a.status === 'resting' && <Text style={{ color: c.gold, fontSize: 10 }}>zzz</Text>}
      </Pressable>
    </Animated.View>
  );
}
function SurfaceLife({
  g,
  travels,
  onAdmin,
  onActor,
  onDiggers,
  onDefenders,
  reduced,
}: {
  g: GameState;
  travels: StaffTravel[];
  onAdmin: () => void;
  onDiggers: () => void;
  onDefenders: () => void;
  onActor: (a: Actor) => void;
  reduced: boolean;
}) {
  const router = useRouter();
  const [showTown, setShowTown] = useState(false);
  const foreground = useGame((s) => s.foreground);
  const guildForecast = guildPartyForecast(g, foreground);
  const town = g.actors.filter(
    (a) =>
      ['fighter', 'wizard', 'healer'].includes(a.role) &&
      ['town', 'recovering', 'training'].includes(a.status) &&
      a.health > 0,
  );
  const waiting = g.opened
    ? town.filter((a) => a.status === 'town' && meetsEntryRequirements(g, a))
    : [];
  const readyRoles = waitingPartyCounts(g);
  const warning = React.useMemo(() => defenseWarning(g), [g.actors, g.escapedMobs, g.officeHealth]);
  const guards = g.actors.filter((a) => a.role === 'defender' && a.health > 0);
  const inactive = inactiveOfficeStaff(g, new Set(travels.map((t) => t.actor.id)));
  return (
    <>
      {['ready', 'open'].includes(g.floors[0]!.stage) && (
        <Cave x={90} y={70} entry locked={g.floors[0]!.stage !== 'open'} />
      )}

      <StaffTransit travels={travels} floor={0} reduced={reduced} onActor={onActor} />
      {g.office && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${inactive.length} inactive staff inside headquarters`}
          onPress={onAdmin}
          style={{
            position: 'absolute',
            left: 309,
            top: 134,
            width: 40,
            zIndex: 65,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: c.gold }}>
            {inactive.length} idle
          </Text>
        </Pressable>
      )}
      {g.office && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Staff-only office rest room"
          onPress={onDefenders}
          style={{
            position: 'absolute',
            left: 353,
            top: 99,
            width: 29,
            height: 35,
            zIndex: 65,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              position: 'absolute',
              top: -13,
              width: 80,
              textAlign: 'center',
              fontFamily: fonts.bold,
              fontSize: 9,
              color: '#8fc7ff',
            }}
          >
            STAFF ONLY
          </Text>
          <Svg width={29} height={35} viewBox="0 0 24 30">
            <Rect x={1} y={0} width={22} height={30} fill="#263b58" />
            <Rect x={4} y={3} width={16} height={26} fill="#397dc1" />
            <Rect x={6} y={5} width={12} height={6} fill="#72b4eb" />
            <Rect x={16} y={17} width={2} height={3} fill="#edc778" />
            <Path d="M7 14V26M12 14V26" stroke="#28609a" strokeWidth={1} />
          </Svg>
          <Text
            style={{
              position: 'absolute',
              top: 35,
              width: 48,
              textAlign: 'center',
              fontFamily: fonts.medium,
              fontSize: 9,
              color: '#8fc7ff',
            }}
          >
            {staffRoom(g).occupants.length}/{staffRoom(g).capacity}
            {staffRoom(g).queue.length ? ` · ${staffRoom(g).queue.length} waiting` : ''}
          </Text>
        </Pressable>
      )}
      {g.office && !g.researchJob && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="No research active: open research"
          onPress={() => router.push('/research')}
          style={{
            position: 'absolute',
            left: 266,
            top: 39,
            padding: 6,
            backgroundColor: c.raised,
            borderWidth: 1,
            borderColor: c.gold,
            zIndex: 60,
          }}
        >
          <PixelActionIcon kind="search" color={c.gold} size={22} />
        </Pressable>
      )}
      {warning && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={warning.text}
          onPress={onDefenders}
          style={{
            position: 'absolute',
            left: 270,
            top: 0,
            padding: 6,
            backgroundColor: c.raised,
            borderWidth: 1,
            borderColor: warning.color === 'red' ? c.red : c.gold,
            zIndex: 60,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              color: warning.color === 'red' ? c.red : c.gold,
              fontSize: 13,
            }}
          >
            ! {warning.text}
          </Text>
        </Pressable>
      )}
      {guards
        .filter(
          (a) =>
            !travels.some((t) => t.actor.id === a.id) &&
            a.status !== 'resting' &&
            (g.escapedMobs.length > 0 || a.stamina === a.maxStamina),
        )
        .map((a, i) => (
          <SecurityGuard key={a.id} g={g} a={a} index={i} reduced={reduced} onActor={onActor} />
        ))}
      {diggersInactive(g) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Diggers inactive"
          onPress={onDiggers}
          style={{
            position: 'absolute',
            left: 300,
            top: 4,
            padding: 7,
            backgroundColor: '#5c4925',
            borderWidth: 1,
            borderColor: c.gold,
            zIndex: 50,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, color: c.gold, fontSize: 14 }}>
            ! Diggers inactive
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Headquarters settings"
        onPress={onAdmin}
        style={{ position: 'absolute', left: 360, top: 42, padding: 8, zIndex: 40 }}
      >
        <PixelGear size={25} />
      </Pressable>
      {g.research.includes('guild') && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Basic Adventurers Guild"
          onPress={onAdmin}
          style={{
            position: 'absolute',
            left: 438,
            top: 100,
            width: 90,
            height: 34,
            alignItems: 'center',
          }}
        >
          <Text
            testID="guild-party-countdown"
            style={{
              position: 'absolute',
              bottom: 36,
              width: 100,
              textAlign: 'center',
              fontSize: 8,
              lineHeight: 12,
              color: c.gold,
            }}
          >
            {g.research.includes('guild2') ? 'GUILD II' : 'GUILD'} ·
            {guildForecast.remaining === null
              ? guildForecast.reason
              : `Party ≈ ${countdown(guildForecast.remaining)}`}
          </Text>
          <Svg testID="guild-building" width={45} height={34} viewBox="0 0 45 34">
            <Path d="M2 6H7V2H38V6H43V13H2Z" fill="#628b71" />
            <Path d="M7 2H14V13H7ZM26 2H33V13H26" fill="#d6bc75" />
            <Rect x={5} y={13} width={3} height={20} fill="#886442" />
            <Rect x={37} y={13} width={3} height={20} fill="#886442" />
            <Rect x={7} y={23} width={31} height={9} fill="#9e794a" />
            <Rect x={16} y={14} width={14} height={10} fill="#e5cd99" />
            <Path d="M19 17H27M19 20H25" stroke="#5b6149" strokeWidth={2} />
          </Svg>
        </Pressable>
      )}
      {Array.from({ length: g.spawnPoints }, (_, point) => (
        <View
          key={point}
          testID={`town-spawner-${point}`}
          style={{ position: 'absolute', left: 554 - point * 48, top: 13, alignItems: 'center' }}
        >
          <View
            accessibilityLabel={`Next adventurer: ${nextArrivalClass(g, point)}`}
            style={{ opacity: 0.4 }}
          >
            <Sprite
              sceneCharacter
              variant={nextLook(g, nextArrivalClass(g, point), false).variant}
              saturation={nextLook(g, nextArrivalClass(g, point), false).saturation}
              kind={nextArrivalClass(g, point)}
              tier={g.spawnTiers?.[point] ?? 1}
              size={25}
            />
          </View>
          <Spinner
            progress={
              g.tutorial < 10
                ? 0
                : Math.max(0, 1 - (arrivalAt(g, point) - g.now) / arrivalInterval(g))
            }
            reduced={reduced || g.gameOver || g.tutorial < 10}
          />
          <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: c.gold }}>
            {g.gameOver
              ? 'Closed'
              : g.tutorial < 10
                ? 'Tutorial'
                : countdown(arrivalAt(g, point) - g.now)}
          </Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: c.text }}>
            Spawn {point + 1}
          </Text>
        </View>
      ))}
      {waiting.slice(0, 6).map((a, i) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          accessibilityLabel={`Waiting ${a.name}`}
          onPress={() => onActor(a)}
          style={{ position: 'absolute', left: 535 + i * 13, top: 104 }}
        >
          {a.spawnedAt !== undefined && g.now - a.spawnedAt < TICK && (
            <View style={{ position: 'absolute', top: -20 }}>
              <ActionEffect
                key={a.spawnedAt}
                kind="Adventurer spawning"
                tier={a.outfitTier}
                once
                hideOnComplete
              />
            </View>
          )}
          <Sprite
            sceneCharacter
            kind={a.role}
            saturation={a.outfitSaturation}
            variant={a.variant}
            tier={a.outfitTier}
            size={27}
          />
        </Pressable>
      ))}
      {g.opened && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Town adventurer roster"
          onPress={() => setShowTown(true)}
          style={{
            position: 'absolute',
            left: 510,
            top: 134,
            width: 125,
            alignItems: 'center',
            zIndex: 70,
          }}
        >
          <Text
            testID="town-waiting-count"
            style={{ fontFamily: fonts.medium, fontSize: 11, color: c.gold }}
          >
            {waiting.length} waiting · View all
          </Text>
        </Pressable>
      )}
      <Modal
        visible={showTown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTown(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000a',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: c.panel,
              borderWidth: 2,
              borderColor: c.gold,
              padding: 20,
              width: '100%',
              maxWidth: 440,
              maxHeight: '80%',
              gap: 12,
            }}
          >
            <Heading size={22}>Adventurers in town</Heading>
            <Body>
              {waiting.length} waiting for a party. Eligible adventurers wait indefinitely; new
              arrivals who fail entry requirements leave immediately.
            </Body>
            <Body>
              Ready: {readyRoles.fighter} fighters · {readyRoles.wizard} wizards ·
              {readyRoles.healer} healers. Only six sprites are shown outside. Training and
              recovering adventurers return to the queue when ready.
            </Body>
            <ScrollView>
              {town.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Town adventurer ${a.id}: ${a.name}`}
                  onPress={() => {
                    setShowTown(false);
                    onActor(a);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Sprite
                    sceneCharacter
                    kind={a.role}
                    saturation={a.outfitSaturation}
                    variant={a.variant}
                    tier={a.outfitTier}
                    size={30}
                  />
                  <View>
                    <Body color={c.text}>
                      {a.name} · {a.role}
                    </Body>
                    <Body>
                      {a.status === 'town'
                        ? !meetsEntryRequirements(g, a)
                          ? 'Entry requirements not met · leaving'
                          : 'Waiting for a party · no time limit'
                        : a.status === 'training'
                          ? 'In training'
                          : 'Recovering after a dungeon visit'}
                    </Body>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Button secondary onPress={() => setShowTown(false)}>
              Close town roster
            </Button>
          </View>
        </View>
      </Modal>
      {g.parties
        .filter((p) => p.status === 'arriving')
        .map((p) => (
          <SurfaceParty key={p.id} g={g} p={p} reduced={reduced} />
        ))}
      {g.escapedMobs.map((e) => (
        <SurfaceMob key={e.id} e={e} reduced={reduced} />
      ))}
      {g.officeHealth < 100 && (
        <View style={{ position: 'absolute', left: 310, top: 15, width: 95 }}>
          <Progress value={g.officeHealth / 100} color={c.red} height={5} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: c.red }}>
            HQ {g.officeHealth}/100
          </Text>
        </View>
      )}
    </>
  );
}
function RestCheck({
  checkedAt,
  now,
  reduced,
}: {
  checkedAt?: number;
  now: number;
  reduced: boolean;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    lift.setValue(0);
    const motion = Animated.timing(lift, {
      toValue: 1,
      duration: reduced ? 0 : 1800,
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [checkedAt, reduced]);
  if (checkedAt === undefined || now - checkedAt > 48000) return null;
  return (
    <Animated.View
      accessibilityLabel="Checking rest room"
      style={{
        position: 'absolute',
        top: -20,
        left: 3,
        opacity: reduced
          ? 1
          : lift.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
        ],
      }}
    >
      <MousePointerClick size={13} color={c.gold} />
    </Animated.View>
  );
}
function PartySprites({
  g,
  f,
  p,
  onActor,
  reduced,
}: {
  g: GameState;
  f: Floor;
  p: Party;
  onActor: (a: Actor) => void;
  reduced: boolean;
}) {
  const odd = true;
  const resting = f.restQueue.includes(p.id);
  const target = resting
    ? odd
      ? 532
      : 108
    : p.checkpointed
      ? odd
        ? 590
        : 50
      : routeX(f, p.node);
  const x = useRef(new Animated.Value(p.node === 0 ? (odd ? 70 : 570) : target)).current;
  const descent = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(descent, {
      toValue: 0,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, []);
  useEffect(() => {
    const a = Animated.timing(x, {
      toValue: target,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [target, reduced]);
  const team = p.members
    .map((id) => g.actors.find((a) => a.id === id)!)
    .filter(
      (a) =>
        a &&
        a.health > 0 &&
        a.status !== 'dead' &&
        !f.restOccupants.some((o) => o.actorId === a.id) &&
        !((resting || p.checkpointed) && fullyRecovered(a)),
    );
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: FLOOR_ROWS.actors + 28,
        transform: [{ translateX: x }, { translateY: descent }],
        zIndex: 3,
      }}
    >
      {resting && team.some((a) => a.health > 0 && !fullyRecovered(a)) && (
        <View style={{ position: 'absolute', top: -30 }}>
          <ActionEffect kind="Waiting for rest" size={28} />
        </View>
      )}
      <View
        style={{
          flexDirection: odd ? 'row-reverse' : 'row',
          marginLeft: odd ? -Math.min(team.length, 6) * 17 : 0,
        }}
      >
        {team.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={`Inspect ${a.name} ${a.id}`}
            onPress={() => onActor(a)}
            style={{ width: 17, opacity: 1 }}
          >
            <CharacterActions
              key={latestActorCues(p.actions, a, team).map(cueKey).join('|')}
              cues={latestActorCues(p.actions, a, team)}
              reduced={reduced}
            />
            {resting && <RestCheck checkedAt={a.restCheckedAt} now={g.now} reduced={reduced} />}
            <View
              style={{ position: 'absolute', top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 18 }}
              testID="floor-character-bars"
            >
              <HealthBars
                health={a.health}
                maxHealth={a.maxHealth}
                defense={a.defense}
                maxDefense={a.maxDefense}
                width={22}
              />
            </View>
            <Sprite
              sceneCharacter
              kind={a.role}
              saturation={a.outfitSaturation}
              variant={a.variant}
              tier={a.outfitTier}
              size={27.3}
              facing={1}
              animate={!reduced && !resting && a.health > 0}
            />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
function MobileMob({
  now,
  f,
  e,
  reduced,
}: {
  f: Floor;
  e: Floor['encounters'][number];
  now: number;
  reduced: boolean;
}) {
  const target = routeX(f, e.position);
  const x = useRef(new Animated.Value(target)).current;
  const old = useRef(target),
    [face, setFace] = useState(1);
  useEffect(() => {
    setFace(target < old.current ? -1 : 1);
    old.current = target;
    const a = Animated.timing(x, {
      toValue: target,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [target, reduced]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: FLOOR_ROWS.actors + 28,
        left: 0,
        transform: [{ translateX: x }],
      }}
    >
      <View
        style={{ position: 'absolute', top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 18 }}
        testID="floor-character-bars"
      >
        <HealthBars health={e.health} defense={e.defense} maxDefense={e.maxDefense} />
      </View>
      {e.spawnedAt !== undefined && now - e.spawnedAt < TICK && (
        <View style={{ position: 'absolute', top: -12 }}>
          <ActionEffect key={e.spawnedAt} kind="Mob spawning" tier={e.tier} once hideOnComplete />
        </View>
      )}
      <Sprite
        sceneCharacter
        kind={e.kind as SpriteKind}
        tier={e.tier}
        variant={e.variant}
        saturation={e.saturation}
        size={31}
        facing={face}
        animate={!reduced}
      />
    </Animated.View>
  );
}
function UpgradeArt({ f, reduced, level }: { f: Floor; reduced: boolean; level: number }) {
  const target = 640 * Math.min(1, (f.upgradeWork ?? 0) / (f.upgradeRequired ?? 6));
  const width = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    const motion = Animated.timing(width, {
      toValue: target,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    motion.start();
    return () => motion.stop();
  }, [target, reduced, width]);
  return (
    <Animated.View
      testID={`upgrade-art-${f.id}`}
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width, height: 112, overflow: 'hidden' }}
    >
      <View style={{ width: 640 }}>
        <FloorArt built digging={false} index={f.id} level={level} encounters={NO_ENCOUNTERS} />
      </View>
    </Animated.View>
  );
}
function ExcavationArt({ f, reduced }: { f: Floor; reduced: boolean }) {
  const target = ['foundation', 'furnishing'].includes(f.stage)
    ? 640
    : 105 + Math.min(1, f.work / Math.max(1, f.required)) * 450;
  const foundationTarget =
    f.stage === 'foundation'
      ? 640 * Math.min(1, f.work / Math.max(1, f.required))
      : f.stage === 'furnishing'
        ? 640
        : 0;
  const foundation = useRef(new Animated.Value(foundationTarget)).current;
  useEffect(() => {
    const motion = Animated.timing(foundation, {
      toValue: foundationTarget,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    motion.start();
    return () => motion.stop();
  }, [foundationTarget, reduced]);
  const front = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    const motion = Animated.timing(front, {
      toValue: target,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    motion.start();
    return () => motion.stop();
  }, [target, reduced]);
  return (
    <View style={{ height: 112 }}>
      <FloorArt built={false} digging={false} index={f.id} encounters={NO_ENCOUNTERS} />
      {!['locked', 'queued'].includes(f.stage) && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 15,
            height: 88,
            width: front,
            overflow: 'hidden',
            backgroundColor: '#28232c',
            borderTopWidth: 6,
            borderTopColor: '#836048',
            borderBottomWidth: 9,
            borderBottomColor: '#594653',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 20,
              top: 0,
              height: 78,
              width: 10,
              backgroundColor: '#725543',
            }}
          />
        </Animated.View>
      )}
      {['foundation', 'furnishing'].includes(f.stage) && (
        <Animated.View
          accessibilityLabel={`Foundation floor ${f.id} ${Math.round((foundationTarget / 640) * 100)} percent`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: foundation,
            height: 112,
            overflow: 'hidden',
          }}
        >
          <View style={{ width: 640 }}>
            <FloorArt
              built
              digging={false}
              index={f.id}
              level={f.level}
              encounters={NO_ENCOUNTERS}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}
function Builder({
  a,
  f,
  index,
  reduced,
}: {
  a: Actor;
  f: Floor;
  index: number;
  reduced: boolean;
}) {
  const target =
    75 +
    Math.min(1, (f.upgradeWork ?? f.work) / Math.max(1, f.upgradeRequired ?? f.required)) * 450 -
    index * 24;
  const x = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    const animation = Animated.timing(x, {
      toValue: target,
      duration: movementDuration(reduced, TICK / TIME_SCALE),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [target, reduced]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: FLOOR_ROWS.actors + 28,
        left: 0,
        zIndex: 5,
        transform: [{ translateX: x }],
      }}
    >
      <View
        style={{ position: 'absolute', top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 18 }}
        testID="floor-character-bars"
      >
        <HealthBars
          health={a.health}
          maxHealth={a.maxHealth}
          defense={a.defense}
          maxDefense={a.maxDefense}
        />
      </View>
      <View
        style={{ width: 25, position: 'absolute', top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 6 }}
      >
        <Progress value={a.stamina / a.maxStamina} height={3} color={c.green} />
      </View>
      {f.stage === 'excavating' && a.stamina > 0 ? (
        <View style={{ width: 36, height: 36 }}>
          <View style={{ position: 'absolute', bottom: 0, left: -6 }}>
            <ActionEffect kind="Digging" tier={a.outfitTier ?? 1} size={48} />
          </View>
        </View>
      ) : (
        <>
          <View style={{ position: 'absolute', top: -12 }}>
            <Hammer size={12} color={c.gold} />
          </View>
          <Sprite
            sceneCharacter
            kind="miner"
            tier={a.outfitTier ?? 1}
            size={30}
            animate={!reduced}
          />
        </>
      )}
    </Animated.View>
  );
}
function FloorCanvas({
  g,
  travels,
  f,
  onActor,
  onRest,
  reduced,
}: {
  g: GameState;
  travels: StaffTravel[];
  f: Floor;
  onActor: (a: Actor) => void;
  onRest: (floor: number) => void;
  reduced: boolean;
}) {
  const [inspected, setInspected] = useState<number | null>(null);
  const trap = f.encounters.find((e) => e.id === inspected);
  const waitingParties = g.parties.filter(
    (p) => p.floor === f.id && (p.checkpointed || f.restQueue.includes(p.id)),
  );
  const built = ['furnishing', 'ready', 'open'].includes(f.stage),
    odd = true;
  const door = REST_CENTER - 14;
  const tasks = g.actors.filter(
    (a) =>
      a.role === 'maintenance' &&
      !travels.some((t) => t.actor.id === a.id) &&
      a.health > 0 &&
      (a.task?.floor ?? a.workFloor) === f.id,
  );
  const crew = g.actors.filter((a) => a.role === 'miner' && a.health > 0);
  const workingFloor =
    upgradingFloor(g) ??
    g.floors.find((f) => ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage));
  const restingIds = f.restOccupants.map((o) => o.actorId);
  const mobCount = floorMobCount(f);
  return (
    <View
      testID={`floor-grid-${f.id}`}
      style={{ height: FLOOR_ROWS.canvasHeight, backgroundColor: '#302934', position: 'relative' }}
    >
      <View
        testID={`floor-shared-background-${f.id}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: FLOOR_ROWS.canvasHeight,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 112,
            transform: [{ scaleY: FLOOR_ROWS.canvasHeight / 112 }],
            transformOrigin: 'top center',
          }}
        >
          {built ? (
            <FloorArt
              built
              digging={false}
              index={f.id}
              level={f.level}
              encounters={NO_ENCOUNTERS}
            />
          ) : (
            <ExcavationArt f={f} reduced={reduced} />
          )}
          {f.upgradeWork !== undefined && (
            <UpgradeArt level={unlockedTier(g, 'floor')} f={f} reduced={reduced} />
          )}
        </View>
      </View>
      <View
        testID={`floor-stats-row-${f.id}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: FLOOR_ROWS.stats,
          height: 18,
          left: 0,
          right: 0,
          backgroundColor: '#00000018',
        }}
      />
      <View
        testID={`floor-info-row-${f.id}`}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: FLOOR_ROWS.info,
          height: FLOOR_ROWS.stats - FLOOR_ROWS.info,
          justifyContent: 'center',
          left: 0,
          right: 0,
          backgroundColor: '#00000018',
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}>
        {Array.from({ length: 15 }, (_, i) => (
          <View
            key={i}
            style={{ width: CELL_WIDTH, borderRightWidth: 1, borderColor: '#ffffff08' }}
          />
        ))}
      </View>
      <Modal
        visible={!!trap}
        transparent
        animationType="fade"
        onRequestClose={() => setInspected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000a',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          {trap && (
            <View
              style={{
                backgroundColor: c.panel,
                padding: 24,
                borderWidth: 2,
                borderColor: c.gold,
                width: '100%',
                maxWidth: 420,
                gap: 10,
              }}
            >
              <Heading>
                {trap.kind === 'mimic' && trap.tier === 2 ? 'Mimics II' : trap.kind} · stats
              </Heading>
              <Body>
                Health: {trap.health} / {rule(g, `${trap.kind}.health`)}
              </Body>
              <Body>
                Defense: {trap.defense} / {trap.maxDefense}
              </Body>
              <Body>Damage: {trap.damage}</Body>
              <Body>
                Perception to detect:
                {trap.kind === 'trapdoor' && trap.tier === 2
                  ? 20
                  : Math.min(10, Math.max(rule(g, `${trap.kind}.perception`), g.trapStealth ?? 5))}
              </Body>
              <Body>
                XP: {trap.xp ?? 0} ·
                {trap.destroyed
                  ? 'Awaiting replacement'
                  : trap.installed === false
                    ? 'Awaiting installation'
                    : trap.active
                      ? 'Armed'
                      : 'Spent'}
              </Body>
              <Button onPress={() => setInspected(null)}>Close trap stats</Button>
            </View>
          )}
        </View>
      </Modal>
      {['ready', 'furnishing'].includes(f.stage) && g.tutorial >= 9 && (
        <View
          style={{
            position: 'absolute',
            top: 30,
            left: 195,
            width: 250,
            alignItems: 'center',
            zIndex: 90,
          }}
        >
          {f.installation === 'pending' || (f.stage === 'furnishing' && !f.installation) ? (
            <Button onPress={() => void dispatch({ type: 'installFloor', floor: f.id })}>
              {`add traps & treasure\n-${rule(g, 'cost.install')} gold`}
            </Button>
          ) : f.installation === 'installing' ? (
            <View style={{ backgroundColor: c.bg, padding: 8 }}>
              <Body>
                Installing
                {f.encounters.filter((e) => e.installed !== false).length}/{f.encounters.length}
              </Body>
              <Body style={{ fontSize: 10 }}>1 stamina per fixture · maintainers working</Body>
            </View>
          ) : (
            <Button
              disabled={f.stage !== 'ready' || (f.id > 1 && g.floors[f.id - 2]!.stage !== 'open')}
              onPress={() => void dispatch({ type: 'openFloor', floor: f.id })}
            >
              {f.stage === 'furnishing' ? 'Fixtures installed · builders finishing' : 'open'}
            </Button>
          )}
        </View>
      )}
      <StaffTransit travels={travels} floor={f.id} reduced={reduced} onActor={onActor} />
      {workingFloor?.id === f.id &&
        crew
          .filter((a) => a.status !== 'resting' && !travels.some((t) => t.actor.id === a.id))
          .map((a, i) => <Builder key={a.id} a={a} f={f} index={i} reduced={reduced} />)}
      {built ? (
        <>
          <Cave
            x={EXIT_CENTER}
            y={FLOOR_ROWS.actors}
            compact
            entry={false}
            locked={f.stage !== 'open'}
          />
          {built && (
            <Cave
              x={ENTRY_CENTER}
              y={FLOOR_ROWS.actors}
              compact
              entry
              locked={f.stage !== 'open'}
            />
          )}
          <Svg width={640} height={60} style={{ position: 'absolute', top: FLOOR_ROWS.actors }}>
            <G transform="translate(0 -76)">
              {[640 / 3, 1280 / 3].map((x) => (
                <Path
                  key={x}
                  d={`M${x} 38v96`}
                  stroke="#776278"
                  strokeOpacity={0.3}
                  strokeDasharray="3 5"
                />
              ))}
              {Array.from({ length: 12 }, (_, slot) => (
                <Rect
                  key={`slot-${slot}`}
                  x={slotX(slot) - 1}
                  y={126}
                  width={32}
                  height={3}
                  fill="#a68caa"
                  opacity={0.25}
                />
              ))}
              {f.restSpots > 0 && (
                <G
                  transform={`translate(${REST_CENTER} 127) scale(0.825) translate(${-REST_CENTER} -127)`}
                >
                  <Rect
                    x={door}
                    y={83}
                    width={28}
                    height={44}
                    fill="#1a1722"
                    stroke={['#b27a42', '#b8c9d0', '#edc45f', '#ebc442'][roomTier(g) - 1]}
                    strokeWidth={4}
                  />
                  <Path d={`M${door + 4} 83v-4h20v4`} fill="#625266" />
                  <Rect
                    x={door + 5}
                    y={87}
                    width={18}
                    height={37}
                    fill={roomTier(g) === 4 ? '#e6b837' : '#675139'}
                  />
                  <Rect x={door + 19} y={105} width={3} height={3} fill="#e9bb70" />
                </G>
              )}
              {f.encounters.map((e, i) =>
                e.destroyed ? null : e.installed !== false &&
                  !['slime', 'zombie'].includes(e.kind) ? (
                  <G key={e.id}>
                    <SpriteShape
                      kind={
                        e.kind === 'wood'
                          ? 'chest'
                          : e.kind === 'trapdoor'
                            ? 'trap'
                            : (e.kind as SpriteKind)
                      }
                      tier={e.tier}
                      x={routeX(f, i)}
                      y={100}
                      scale={1.35}
                      muted={!(e.kind === 'mimic' && (e.revealedUntil ?? 0) > g.now) && !e.active}
                      revealed={e.kind === 'mimic' && (e.revealedUntil ?? 0) > g.now}
                    />
                  </G>
                ) : e.roaming || e.installed === false ? null : (
                  <G key={e.id} transform={`translate(${routeX(f, i) + 15} 108)`}>
                    {e.kind === 'slime' ? (
                      <G transform="translate(-17 -12)">
                        <TierSlime tier={e.tier ?? 1} puddle />
                      </G>
                    ) : g.artChoices?.coffin ? (
                      <G transform="translate(-17 -12)">
                        <SpawnArt kind="coffin" variant={g.artChoices?.coffin} />
                      </G>
                    ) : (
                      <>
                        <Path
                          d="M-9 -5H9L14 1L10 19H-10L-14 1Z"
                          fill="#543e38"
                          stroke="#997458"
                          strokeWidth={2}
                        />
                        <Path d="M-6 -2H6L10 2L6 15H-7L-10 2Z" fill="#886347" />
                        <Path
                          d="M2 -4L-2 2L3 6L-2 11L0 18"
                          stroke="#211c29"
                          strokeWidth={3}
                          fill="none"
                        />
                      </>
                    )}
                  </G>
                ),
              )}
            </G>
          </Svg>
          <View
            pointerEvents="none"
            testID={`party-recovery-${f.id}`}
            style={{
              position: 'absolute',
              left: ENTRY_CENTER - CELL_WIDTH / 2,
              top: FLOOR_ROWS.info,
              height: FLOOR_ROWS.stats - FLOOR_ROWS.info,
              justifyContent: 'center',
              width: CELL_WIDTH,
              alignItems: 'center',
              zIndex: 7,
            }}
          >
            {waitingParties.slice(0, waitingParties.length > 3 ? 2 : 3).map((p) => (
              <Text
                key={p.id}
                style={{ textAlign: 'center', fontFamily: fonts.bold, fontSize: 9, color: c.green }}
              >
                {
                  p.members.filter((id) => {
                    const a = g.actors.find((a) => a.id === id);
                    return a && fullyRecovered(a);
                  }).length
                }
                /{p.members.length}
              </Text>
            ))}
            {waitingParties.length > 3 && (
              <Text style={{ fontSize: 8, color: c.gold }}>4+ parties</Text>
            )}
          </View>
          {f.encounters
            .filter(
              (e) => ['trapdoor', 'arrows', 'mimic'].includes(e.kind) && e.installed !== false,
            )
            .map((e) => (
              <Pressable
                key={`inspect-${e.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Inspect ${e.kind} trap ${e.id}`}
                onPress={() => setInspected(e.id)}
                style={{
                  position: 'absolute',
                  left: routeX(f, f.encounters.indexOf(e)) - 3,
                  top: FLOOR_ROWS.actors + 17,
                  width: 35,
                  height: 40,
                  zIndex: 2,
                }}
              />
            ))}
          {f.encounters
            .filter((e) => e.destroyed)
            .map((e) => (
              <DestroyedFixture key={e.id} e={e} x={routeX(f, f.encounters.indexOf(e))} />
            ))}
          {f.encounters
            .filter(
              (e) => e.installed !== false && !e.roaming && !['zombie', 'slime'].includes(e.kind),
            )
            .map((e) => {
              const worker = tasks.find(
                (a) =>
                  a.task?.encounter === e.id &&
                  ['reset', 'replace', 'refill'].includes(a.task.kind) &&
                  (a.task.arriveAt ?? 0) <= g.now,
              );
              const task = worker?.task;
              const progress = task
                ? Math.min(
                    1,
                    Math.max(
                      0,
                      (g.now - (task.arriveAt ?? g.now)) /
                        Math.max(1, task.until - (task.arriveAt ?? g.now)),
                    ),
                  )
                : 0;
              return (
                <View
                  key={`info-${e.id}`}
                  testID={`encounter-info-${e.id}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: FLOOR_ROWS.info,
                    height: FLOOR_ROWS.stats - FLOOR_ROWS.info,
                    justifyContent: 'center',
                    left: routeX(f, f.encounters.indexOf(e)) + 15 - CELL_WIDTH / 2,
                    width: CELL_WIDTH,
                    alignItems: 'center',
                  }}
                >
                  {worker && task ? (
                    <View
                      testID={`maintenance-progress-${worker.id}`}
                      accessibilityRole="progressbar"
                      accessibilityLabel={`${worker.name} fixture maintenance progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(100 * progress)}
                      style={{ alignItems: 'center' }}
                    >
                      <Spinner progress={progress} reduced={reduced} color={c.gold} />
                      <Text
                        testID={`maintenance-countdown-${worker.id}`}
                        style={{
                          textAlign: 'center',
                          fontFamily: fonts.body,
                          fontSize: 8,
                          color: c.gold,
                        }}
                      >
                        {countdown(task.until - g.now)}
                      </Text>
                    </View>
                  ) : ['wood', 'silver', 'gold'].includes(e.kind) ? (
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        textAlign: 'center',
                        fontSize: 10,
                        color: e.gold === 0 ? c.red : c.gold,
                      }}
                    >
                      {e.gold / 100} g
                    </Text>
                  ) : (
                    <>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontFamily: fonts.medium,
                          color: c.text,
                          fontSize: 8,
                        }}
                      >
                        {e.kind === 'trapdoor'
                          ? 'Trapdoor'
                          : e.kind === 'arrows'
                            ? 'Arrows'
                            : e.tier === 2
                              ? 'Mimics II'
                              : 'Mimic'}
                      </Text>
                      <Text
                        style={{
                          textAlign: 'center',
                          fontFamily: fonts.medium,
                          color: c.muted,
                          fontSize: 8,
                        }}
                      >
                        DMG {e.damage}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          {f.restSpots > 0 && (
            <>
              <View
                style={{
                  position: 'absolute',
                  top: FLOOR_ROWS.info,
                  height: FLOOR_ROWS.stats - FLOOR_ROWS.info,
                  justifyContent: 'center',
                  left: REST_CENTER - CELL_WIDTH / 2,
                  width: CELL_WIDTH,
                  alignItems: 'center',
                }}
              >
                <Text
                  testID={`rest-waiting-${f.id}`}
                  style={{ textAlign: 'center', fontFamily: fonts.bold, color: c.red, fontSize: 9 }}
                >
                  {restWaiters(g, f.id).length}
                </Text>
                <Text
                  testID={`rest-sign-${f.id}`}
                  style={{
                    textAlign: 'center',
                    fontFamily: fonts.bold,
                    color: '#fff4de',
                    fontSize: 8,
                  }}
                >
                  REST
                </Text>
                <Text
                  style={{
                    textAlign: 'center',
                    fontFamily: fonts.medium,
                    color: c.green,
                    fontSize: 8,
                  }}
                >
                  {f.restOccupants.length}/{g.policy.restCapacity}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rest room floor ${f.id}: ${f.restOccupants.length} of ${g.policy.restCapacity} occupied`}
                onPress={() => onRest(f.id)}
                style={{
                  position: 'absolute',
                  left: REST_CENTER - CELL_WIDTH / 2,
                  top: 0,
                  width: CELL_WIDTH,
                  height: FLOOR_ROWS.canvasHeight,
                  zIndex: 6,
                }}
              />
            </>
          )}
          {f.encounters
            .filter((e) => e.installed !== false && ['zombie', 'slime'].includes(e.kind))
            .map((e) => (
              <React.Fragment key={e.id}>
                {e.active && <MobileMob now={g.now} f={f} e={e} reduced={reduced} />}
                {!e.roaming && (
                  <View
                    style={{
                      position: 'absolute',
                      left: routeX(f, f.encounters.indexOf(e)) + 15 - CELL_WIDTH / 2,
                      top: FLOOR_ROWS.info,
                      height: FLOOR_ROWS.stats - FLOOR_ROWS.info,
                      justifyContent: 'center',
                      width: CELL_WIDTH,
                      alignItems: 'center',
                    }}
                  >
                    <SpawnerStatus
                      remaining={Math.max(e.readyAt, f.spawnAt) - g.now}
                      capped={mobLimitReached(g, f)}
                      reduced={reduced}
                    >
                      <Spinner
                        reduced={reduced || e.active || mobLimitReached(g, f)}
                        color={mobLimitReached(g, f) ? c.gold : c.purple}
                        progress={Math.min(
                          1,
                          Math.max(
                            0,
                            1 -
                              (Math.max(e.readyAt, f.spawnAt) - g.now) /
                                (e.kind === 'slime' ? 2 * HOUR : HOUR),
                          ),
                        )}
                      />
                    </SpawnerStatus>
                  </View>
                )}
              </React.Fragment>
            ))}
          {f.encounters.map((e, i) => {
            if (e.installed !== false) return null;
            const worker = tasks.find(
              (a) => a.task?.kind === 'install' && a.task.encounter === e.id,
            );
            if (!worker && !e.installPaid) return null;
            const progress = installationProgress(e, worker?.task ?? null, g.now);
            return (
              <View
                key={`installation-${e.id}`}
                testID={`installation-progress-${e.id}`}
                accessibilityRole="progressbar"
                accessibilityLabel={`${e.kind} installation ${worker ? 'in progress' : 'paused'}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                pointerEvents="none"
                style={{ position: 'absolute', left: routeX(f, i) + 7, top: FLOOR_ROWS.info }}
              >
                <Spinner progress={progress} reduced={reduced || !worker} color={c.gold} />
              </View>
            );
          })}
          {g.parties
            .filter((p) => p.floor === f.id && p.status !== 'arriving')
            .map((p) => (
              <PartySprites key={p.id} g={g} f={f} p={p} reduced={reduced} onActor={onActor} />
            ))}
          {(g.ghosts ?? [])
            .filter((ghost) => ghost.floor === f.id)
            .map((ghost) => {
              const a = g.actors.find((a) => a.id === ghost.actorId);
              if (!a) return null;
              return (
                <View
                  key={`ghost-${a.id}`}
                  accessibilityLabel={`${a.name}: ${ghost.hostile ? 'hostile ghost' : 'awaiting revival'}`}
                  style={{
                    position: 'absolute',
                    left: routeX(f, ghost.node),
                    top: FLOOR_ROWS.actors + 8,
                    alignItems: 'center',
                  }}
                >
                  <HealthBars
                    health={ghost.health}
                    maxHealth={ghost.maxHealth}
                    defense={ghost.defense}
                    maxDefense={ghost.maxDefense}
                  />
                  <View style={{ opacity: ghost.hostile ? 0.7 : 0.35 }}>
                    <Sprite
                      kind={a.role}
                      tier={a.outfitTier}
                      variant={a.variant}
                      sceneCharacter
                      eyeColor={ghost.hostile ? '#ff243e' : undefined}
                    />
                  </View>
                  <Text style={{ fontSize: 8, color: ghost.hostile ? '#ff243e' : '#ddd' }}>
                    {ghost.hostile ? 'Ghost' : countdown(ghost.deadline - g.now)}
                  </Text>
                </View>
              );
            })}
          {tasks.map((a, workerIndex) => {
            const index =
              a.task && a.task.kind !== 'repair'
                ? f.encounters.findIndex((e) => e.id === a.task!.encounter)
                : (a.workPosition ?? workerIndex * 0.6);
            return (
              <WalkingWorker
                speed={staffSpeed(g, a)}
                arriveAt={a.task?.arriveAt}
                now={g.now}
                key={a.id}
                target={a.returnUntil ? 35 : routeX(f, index) + 24}
                start={a.returnUntil ? 35 : routeX(f, index) + 24}
                reduced={reduced}
              >
                {(arrived) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${a.name} ${a.task?.kind ?? a.status}, stamina ${a.stamina}/${a.maxStamina}`}
                    onPress={() => onActor(a)}
                    style={{ alignItems: 'center' }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 18,
                      }}
                      testID="floor-character-bars"
                    >
                      <HealthBars
                        health={a.health}
                        maxHealth={a.maxHealth}
                        defense={a.defense}
                        maxDefense={a.maxDefense}
                      />
                    </View>
                    <View
                      style={{
                        width: 28,
                        position: 'absolute',
                        top: FLOOR_ROWS.stats - FLOOR_ROWS.actors - 6,
                      }}
                    >
                      <Progress value={a.stamina / a.maxStamina} color={c.green} height={3} />
                    </View>
                    {arrived && a.task && (a.task.arriveAt ?? 0) <= g.now && (
                      <View style={{ position: 'absolute', top: -12 }}>
                        <ActionEffect kind="Reset trap" size={28} />
                      </View>
                    )}
                    <Sprite
                      sceneCharacter
                      kind="maintenance"
                      size={30}
                      facing={a.returnUntil ? 1 : -1}
                      animate={!reduced && (!!a.task || !!a.returnUntil)}
                    />
                  </Pressable>
                )}
              </WalkingWorker>
            );
          })}
        </>
      ) : (
        <View
          style={{
            position: 'absolute',
            top: FLOOR_ROWS.actors,
            left: 0,
            right: 0,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Label color={c.dim}>{f.stage === 'locked' ? 'Unexcavated' : f.stage}</Label>
        </View>
      )}
    </View>
  );
}
function FloorHeaderStatus({ g, f }: { g: GameState; f: Floor }) {
  const eta = useMemo(
    () => excavationEnd(g, f.id, true),
    [g.nextTick, g.actors, g.floors, g.research],
  );
  if (f.upgradeWork !== undefined)
    return (
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 12 }}
        testID={`upgrade-progress-${f.id}`}
      >
        <View style={{ flex: 1 }}>
          <Progress value={f.upgradeWork / (f.upgradeRequired ?? 6)} color={c.purple} height={3} />
        </View>
        <Text numberOfLines={1} style={{ fontSize: 10, lineHeight: 12, color: c.muted }}>
          {upgradingFloor(g)?.id === f.id ? 'Building level 2' : 'Upgrade queued'}
        </Text>
      </View>
    );
  if (!['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage)) return null;
  return (
    <View
      testID={`floor-progress-${f.id}`}
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 0,
      }}
    >
      <View style={{ flex: 1, minWidth: 45 }}>
        <Progress value={f.required ? f.work / f.required : 0} height={5} />
      </View>
      <Text
        numberOfLines={1}
        style={{ color: c.gold, fontFamily: fonts.medium, fontSize: 10, flexShrink: 1 }}
      >
        {eta === null ? 'Awaiting crew' : `${countdown(eta - g.now)}`} · {f.stage}
      </Text>
    </View>
  );
}
export function DungeonScene({
  g,
  onFloor,
  onActor,
  onRest,
  onSettings,
  onComplaints,
  onHire,
  onAdmin,
  onDiggers,
  onDefenders,
  reduced,
}: {
  g: GameState;
  onFloor: (f: Floor) => void;
  onActor: (a: Actor) => void;
  onRest: (floor: number) => void;
  onSettings: () => void;
  onComplaints: () => void;
  onHire: () => void;
  onAdmin: () => void;
  onDiggers: () => void;
  onDefenders: () => void;
  reduced: boolean;
}) {
  const travels = useStaffTransit(g, reduced);
  const [availableWidth, setAvailableWidth] = useState(640);
  const [sceneHeight, setSceneHeight] = useState(1350);
  const [zoomed, setZoomed] = useState(false);
  const scale = zoomed ? Math.max(1, availableWidth / 640) : availableWidth / 640;
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: c.panel,
      }}
    >
      <Row style={{ padding: 14, justifyContent: 'space-between' }}>
        <Label color={c.text}>Your dungeon</Label>
        <Pill>{g.opened ? 'OPEN' : 'BUILDING'}</Pill>
      </Row>
      <View onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          scrollEnabled={zoomed}
          showsHorizontalScrollIndicator={zoomed}
          style={{ height: sceneHeight * scale }}
          contentContainerStyle={{ width: 640 * scale, height: sceneHeight * scale }}
        >
          <View
            onLayout={(event) => setSceneHeight(event.nativeEvent.layout.height)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 640,
              transform: [{ scale }],
              transformOrigin: 'top left',
            }}
          >
            <View>
              <Surface office={g.office} now={Math.floor(g.now / 60000) * 60000} />
              <SurfaceLife
                g={g}
                travels={travels}
                reduced={reduced}
                onAdmin={onAdmin}
                onActor={onActor}
                onDiggers={onDiggers}
                onDefenders={onDefenders}
              />
              {maintenanceNeeded(g) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Maintenance backlog: hire another maintainer"
                  onPress={onHire}
                  style={{
                    position: 'absolute',
                    left: 300,
                    top: 25,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#7c3933',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                  }}
                >
                  <Text style={{ fontFamily: fonts.medium, color: c.gold, fontSize: 32 }}>!</Text>
                </Pressable>
              )}
              <View
                style={{
                  position: 'absolute',
                  top: 9,
                  left: 10,
                  backgroundColor: '#211e2ddd',
                  padding: 7,
                  borderRadius: 4,
                }}
              >
                <Row style={{ gap: 6 }}>
                  <Clock3 size={12} color={c.gold} />
                  <Text style={{ fontFamily: fonts.medium, color: c.gold, fontSize: 11 }}>
                    {gameDate(g.now)}
                  </Text>
                </Row>
              </View>
              {g.complaints.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Read complaints at headquarters"
                  onPress={onComplaints}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 12,
                    backgroundColor: '#492c34',
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  <Row>
                    <Mail size={14} color={c.red} />
                    <Body color={c.red} style={{ fontSize: 10 }}>
                      {g.complaints.length} complaints
                    </Body>
                  </Row>
                </Pressable>
              )}
            </View>
            <View style={{ height: 8 }} />
            {Array.from({ length: Math.ceil(g.floors.length / 5) }, (_, group) => (
              <View
                key={group}
                style={{
                  borderWidth: 2,
                  borderColor: '#746047',
                  marginVertical: 4,
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <Row style={{ padding: 10, paddingLeft: 12, justifyContent: 'space-between' }}>
                  <Label color={c.gold}>
                    Floor group {String(group * 5 + 1).padStart(2, '0')}–
                    {String(Math.min(g.floors.length, group * 5 + 5)).padStart(2, '0')}
                  </Label>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      group === 0
                        ? 'Floor group settings'
                        : `Floor group ${group * 5 + 1}–${group * 5 + 5} settings`
                    }
                    onPress={onSettings}
                    style={{ padding: 10 }}
                  >
                    <PixelGear size={22} />
                  </Pressable>
                </Row>
                {g.floors.slice(group * 5, group * 5 + 5).map((f, i) => (
                  <View key={f.id} style={{ zIndex: 5 - i }}>
                    <Pressable
                      testID={`floor-footer-${f.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Inspect floor ${f.id}`}
                      onPress={() => onFloor(f)}
                      style={{
                        height: 28,
                        justifyContent: 'center',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        backgroundColor: '#24212a',
                      }}
                    >
                      <View
                        testID={`floor-header-line-${f.id}`}
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'nowrap',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 6,
                          height: 16,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flexShrink: 1,
                            fontFamily: fonts.medium,
                            color: c.text,
                            fontSize: 11,
                            lineHeight: 14,
                          }}
                        >
                          {String(f.id).padStart(2, '0')} - {f.name}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={{ color: c.dim, fontSize: 11, lineHeight: 14 }}
                        >
                          |
                        </Text>
                        <Text
                          testID={`floor-mob-count-${f.id}`}
                          numberOfLines={1}
                          accessibilityRole={mobLimitReached(g, f) ? 'alert' : undefined}
                          accessibilityLabel={`${floorMobCount(f) > (g.policy.mobLimit ?? g.policy.mobSlots) ? 'Red' : 'Yellow'} ! Mob limit reached ${floorMobCount(f)}/${g.policy.mobLimit ?? g.policy.mobSlots}`}
                          style={{
                            fontSize: 11,
                            lineHeight: 14,
                            color:
                              floorMobCount(f) > (g.policy.mobLimit ?? g.policy.mobSlots)
                                ? c.red
                                : mobLimitReached(g, f)
                                  ? c.gold
                                  : c.muted,
                          }}
                        >
                          Mobs: {floorMobCount(f)}/{g.policy.mobLimit ?? g.policy.mobSlots}
                          {mobLimitReached(g, f) ? ' !' : ''}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ color: c.dim, fontSize: 11, lineHeight: 14 }}
                        >
                          |
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 11, lineHeight: 14, color: c.muted }}
                        >
                          Parties:{' '}
                          {
                            g.parties.filter((p) => p.floor === f.id && p.status !== 'arriving')
                              .length
                          }
                        </Text>
                        {(f.upgradeWork !== undefined ||
                          ['queued', 'excavating', 'foundation', 'furnishing'].includes(
                            f.stage,
                          )) && (
                          <View style={{ flexShrink: 1, width: 160, minWidth: 0 }}>
                            <FloorHeaderStatus g={g} f={f} />
                          </View>
                        )}
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: fonts.medium,
                            color: f.stage === 'open' ? c.green : c.dim,
                            fontSize: 11,
                            lineHeight: 14,
                            flexShrink: 0,
                          }}
                        >
                          {f.stage.toUpperCase()}
                        </Text>
                      </View>
                    </Pressable>
                    <FloorCanvas
                      travels={travels}
                      g={g}
                      f={f}
                      onActor={onActor}
                      onRest={onRest}
                      reduced={reduced}
                    />
                    {i < 4 && <View style={{ height: 3 }} />}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={zoomed ? 'Fit dungeon to panel' : 'Zoom dungeon details'}
        onPress={() => setZoomed(!zoomed)}
        style={{ padding: 14 }}
      >
        <Body color={c.gold} style={{ fontSize: 11 }}>
          {zoomed ? '↙ Fit all stairs in view' : '⊕ Zoom pixel details'}
        </Body>
        <Body style={{ fontSize: 10, marginTop: 4 }}>
          {zoomed
            ? 'Swipe sideways to follow the caves.'
            : 'Tap any floor or character to inspect.'}
        </Body>
      </Pressable>
    </View>
  );
}
