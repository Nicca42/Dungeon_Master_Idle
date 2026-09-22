import { RESEARCH_ART, ResearchIcon } from './ResearchArt';
import { TierCharacter, TierSlime, TierTrap, TierFloor, TierChest } from './TierArt';
import { characterColors } from '../art/tierStyle';
import React, { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, ScrollView, View } from 'react-native';
import Svg, { G, Rect, Path } from 'react-native-svg';
import { ACTIONS, FRAME_COUNT, FRAME_MS, ActionKind } from '../art/actionFrames';
import { ACTION_IMAGES } from '../art/actionImages';
import { SpriteShape, SpriteKind } from './PixelArt';
import { SpawnArt } from './ArtVariants';
import { Body, Button, Heading, Row } from './ui';
import { ArtChoices } from '../game/types';

const tiers = [1, 2, 3, 4, 5];
const groups: { title: string; rows: { name: string; kind: string; variants?: boolean }[] }[] = [
  {
    title: 'Adventurers',
    rows: [
      { name: 'Wizards', kind: 'wizard', variants: true },
      { name: 'Fighters', kind: 'fighter', variants: true },
      { name: 'Healers', kind: 'healer', variants: true },
    ],
  },
  {
    title: 'Mobs',
    rows: [
      { name: 'Zombies', kind: 'zombie', variants: true },
      { name: 'Slimes', kind: 'slime' },
    ],
  },
  {
    title: 'Mob spawners',
    rows: [
      { name: 'Zombie coffin', kind: 'coffin' },
      { name: 'Slime puddle', kind: 'puddle' },
    ],
  },
  {
    title: 'Traps',
    rows: [
      { name: 'Trapdoors', kind: 'trap' },
      { name: 'Arrow walls', kind: 'arrows' },
      { name: 'Mimics', kind: 'mimic' },
    ],
  },
  { title: 'Treasure', rows: [{ name: 'Chests', kind: 'chest' }] },
  {
    title: 'Staff',
    rows: [
      { name: 'Builders', kind: 'miner' },
      { name: 'Maintainers', kind: 'maintenance' },
      { name: 'Defenders', kind: 'defender' },
    ],
  },
  {
    title: 'Dungeon',
    rows: [
      { name: 'Floor architecture', kind: 'floor' },
      { name: 'Visitor rest door', kind: 'rest' },
      { name: 'Staff rest door', kind: 'staffRest' },
    ],
  },
];
const metals = ['#b27a42', '#b8c9d0', '#edc45f', '#bda1eb', '#f2db93'];
const Asset = memo(function Asset({
  kind,
  tier,
  variant,
}: {
  kind: string;
  tier: number;
  variant: number;
}) {
  const color = metals[tier - 1];
  if (kind === 'floor') return <TierFloor tier={tier} />;
  return (
    <Svg
      width={58}
      height={64}
      viewBox={kind === 'chest' || kind === 'mimic' ? '-5 -10 40 44' : '-5 -14 40 48'}
      accessibilityLabel={`${kind} level ${tier} variant ${variant}`}
    >
      {characterColors[kind] ? (
        <TierCharacter kind={kind} tier={tier} variant={variant} />
      ) : kind === 'slime' || kind === 'puddle' ? (
        <TierSlime tier={tier} puddle={kind === 'puddle'} />
      ) : kind === 'trap' || kind === 'arrows' ? (
        <TierTrap tier={tier} arrows={kind === 'arrows'} />
      ) : kind === 'chest' || kind === 'mimic' ? (
        <TierChest tier={tier} />
      ) : kind === 'coffin' ? (
        <SpawnArt kind="coffin" variant={tier === 1 ? variant : tier} />
      ) : kind === 'rest' || kind === 'staffRest' ? (
        <G>
          <Rect
            x={3}
            y={2}
            width={24}
            height={30}
            fill={kind === 'rest' && tier === 4 ? '#ebc442' : color}
          />
          <Rect
            x={6}
            y={5}
            width={18}
            height={27}
            fill={kind === 'staffRest' ? '#386ea1' : tier === 4 ? '#e6b837' : '#675139'}
          />
          <Rect x={19} y={19} width={3} height={3} fill="#ffe7a2" />
        </G>
      ) : kind === 'arrows' ? (
        <G>
          <Rect x={1} y={5} width={28} height={25} fill="#615952" />
          {[0, 1, 2].map((i) => (
            <G key={i}>
              <Rect x={4 + i * 8} y={12} width={3} height={10} fill="#181e21" />
              <Path d={`M${5 + i * 8} 23v-8l-2 3m2-3l2 3`} stroke={color} />
            </G>
          ))}
        </G>
      ) : (
        <SpriteShape
          kind={
            (kind === 'chest'
              ? tier === 1
                ? 'chest'
                : tier === 2
                  ? 'silver'
                  : 'gold'
              : kind) as SpriteKind
          }
          tier={tier}
          variant={variant}
          saturation={1 + (tier - 1) * 0.08}
        />
      )}
    </Svg>
  );
});
const cell = {
  width: 224,
  minHeight: 118,
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderColor: '#454039',
  padding: 10,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};
const labelCell = { ...cell, width: 170, alignItems: 'flex-start' as const };
const ActionPreview = memo(function ActionPreview({
  kind,
  tier,
  clock,
}: {
  kind: ActionKind;
  tier: number;
  clock: Animated.Value;
}) {
  return (
    <View
      accessibilityLabel={`${kind} level ${tier} animation`}
      style={{ width: 80, height: 80, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          width: 640,
          height: 80,
          transform: [
            { translateX: clock.interpolate({ inputRange: [0, 7], outputRange: [0, -560] }) },
          ],
        }}
      >
        <Image
          source={ACTION_IMAGES[kind][tier - 1]}
          style={{ width: 640, height: 80 }}
          resizeMode="stretch"
        />
      </Animated.View>
    </View>
  );
});
function ArtAssetTableImpl({ choices, active }: { choices: ArtChoices; active: boolean }) {
  const [playing, setPlaying] = useState(true),
    [reduce, setReduce] = useState(false),
    [foreground, setForeground] = useState(AppState.currentState === 'active');
  const clock = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduce(v);
    });
    const r = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    const a = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => {
      alive = false;
      r.remove();
      a.remove();
    };
  }, []);
  useEffect(() => {
    if (!active || !playing || reduce || !foreground) {
      clock.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence(
        Array.from({ length: FRAME_COUNT }, (_, i) =>
          Animated.sequence([
            Animated.timing(clock, {
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
    loop.start();
    return () => loop.stop();
  }, [active, playing, reduce, foreground, clock]);
  return (
    <View style={{ gap: 12 }}>
      <Heading>Asset library · levels I–V</Heading>
      <Body>
        Three character variants per class and tier. Existing selected designs are retained;
        higher-tier trim and action strips are preview concepts. Scroll across to compare levels.
      </Body>
      <Button compact onPress={() => setPlaying((v) => !v)}>
        {playing ? 'Pause animations' : 'Play animations'}
      </Button>
      {reduce && <Body>Reduced motion is enabled; previews remain still.</Body>}
      <ScrollView horizontal accessibilityLabel="Art table horizontal scroll">
        <View>
          <Row style={{ gap: 0 }}>
            <View style={labelCell}>
              <Body>Track / asset</Body>
            </View>
            {tiers.map((t) => (
              <View key={t} style={cell}>
                <Heading size={18}>Level {t}</Heading>
              </View>
            ))}
          </Row>
          {groups.map((group) => (
            <View key={group.title}>
              <View style={{ padding: 10, backgroundColor: '#302d29' }}>
                <Heading size={18}>{group.title}</Heading>
              </View>
              {group.rows.map((row) => (
                <Row key={row.kind} style={{ gap: 0, alignItems: 'stretch' }}>
                  <View style={labelCell}>
                    <Body>{row.name}</Body>
                  </View>
                  {tiers.map((tier) => {
                    const unavailable =
                      (row.kind === 'rest' && tier > 4) || (row.kind === 'staffRest' && tier > 3);
                    const picked = choices[row.kind as keyof ArtChoices];
                    const variants = row.variants
                      ? Array.isArray(picked) && picked.length === 3
                        ? picked
                        : [1, 2, 3]
                      : [typeof picked === 'number' ? picked : 1];
                    return (
                      <View key={tier} style={cell}>
                        {unavailable ? (
                          <Body>Not unlocked</Body>
                        ) : (
                          <Row style={{ gap: 4 }}>
                            {variants.map((v, i) => (
                              <View key={i} style={{ alignItems: 'center' }}>
                                <Asset kind={row.kind} tier={tier} variant={v} />
                                {row.variants && <Body>V{i + 1}</Body>}
                              </View>
                            ))}
                          </Row>
                        )}
                      </View>
                    );
                  })}
                </Row>
              ))}
            </View>
          ))}
          <View style={{ padding: 10, backgroundColor: '#302d29' }}>
            <Heading size={18}>Research icons</Heading>
          </View>
          {RESEARCH_ART.map((branch) => (
            <Row key={branch.id} style={{ gap: 0 }}>
              <View style={labelCell}>
                <Body>{branch.name}</Body>
              </View>
              {tiers.map((level) => (
                <View key={level} style={cell}>
                  <ResearchIcon branch={branch} level={level} />
                </View>
              ))}
            </Row>
          ))}
          <View style={{ padding: 10, backgroundColor: '#302d29' }}>
            <Heading size={18}>Animated actions</Heading>
          </View>
          {ACTIONS.map((kind) => (
            <Row key={kind} style={{ gap: 0 }}>
              <View style={labelCell}>
                <Body>{kind}</Body>
              </View>
              {tiers.map((tier) => (
                <View key={tier} style={cell}>
                  <ActionPreview kind={kind} tier={tier} clock={clock} />
                  {kind === 'Lightning spell' && (
                    <Body>
                      {tier} {tier === 1 ? 'bolt' : 'bolts'}
                    </Body>
                  )}
                </View>
              ))}
            </Row>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export const ArtAssetTable = memo(ArtAssetTableImpl);
