import { CharacterVariant } from './ArtVariants';
import { saturateColor } from '../game/palette';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { G, Path, Polygon, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export type SpriteKind =
  | 'fighter'
  | 'wizard'
  | 'healer'
  | 'miner'
  | 'maintenance'
  | 'defender'
  | 'zombie'
  | 'slime'
  | 'mimic'
  | 'chest'
  | 'silver'
  | 'gold'
  | 'trap'
  | 'bed';
const outfits: Record<string, string[]> = {
  fighter: ['#a9b7bd', '#627985', '#d5a168'],
  wizard: ['#a58bc9', '#6b519c', '#d6ac85'],
  healer: ['#bad0b1', '#628b71', '#e3b28b'],
  miner: ['#a47b50', '#674932', '#d8a984'],
  defender: ['#64b5ff', '#2563af', '#d5a168'],
  maintenance: ['#cb6559', '#8f393b', '#d2a784'],
  zombie: ['#93aa78', '#59755b', '#8a9a68'],
};
export const outfitColor = (role: string, saturation = 1) =>
  saturateColor(outfits[role]?.[0] ?? '#a9b7bd', saturation);
function SpriteShapeImpl({
  kind,
  x = 0,
  y = 0,
  scale = 1,
  muted = false,
  revealed = false,
  saturation = 1,
  tier = 1,
  variant,
}: {
  kind: SpriteKind;
  x?: number;
  y?: number;
  scale?: number;
  muted?: boolean;
  revealed?: boolean;
  saturation?: number;
  tier?: number;
  variant?: number;
}) {
  const palette = (outfits[kind] ?? outfits.fighter!).map((color, i) =>
    i < 2 ? saturateColor(color, saturation) : color,
  );
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <G
        transform={
          ['fighter', 'wizard', 'healer', 'defender'].includes(kind)
            ? 'translate(21 0) scale(-1 1)'
            : undefined
        }
      >
        {tier === 2 && ['fighter', 'wizard', 'healer', 'defender'].includes(kind) && (
          <G>
            <Path d="M3 8L0 22H22L18 8" fill={palette[1]} />
            <Path d="M4 2L4 -3L8 0L11 -4L14 0L18 -3V2Z" fill="#edc66a" />
            <Rect x={1} y={11} width={4} height={4} fill="#ecd184" />
            <Rect x={17} y={11} width={4} height={4} fill="#ecd184" />
          </G>
        )}
        {muted && ['chest', 'silver', 'gold'].includes(kind) ? (
          <G>
            <Path
              d="M2 10V2H18V10Z"
              fill={kind === 'silver' ? '#b7c7cd' : kind === 'gold' ? '#e8b84c' : '#a76e3c'}
            />
            <Rect x={4} y={4} width={12} height={4} fill="#49352d" />
            <Rect
              x={2}
              y={12}
              width={16}
              height={7}
              fill={kind === 'silver' ? '#8d9fa8' : kind === 'gold' ? '#bf8d30' : '#85522c'}
            />
            <Rect x={4} y={12} width={12} height={3} fill="#231e26" />
            <Path
              d="M5 12V19M15 12V19"
              stroke={kind === 'silver' ? '#dce1dc' : '#dbb068'}
              strokeWidth={2}
            />
          </G>
        ) : muted ? (
          <G opacity={0.55}>
            {kind === 'trap' ? (
              <>
                <Rect x={1} y={15} width={18} height={5} fill="#66636c" />
                <Path d="M3 17L5 12L7 17M9 17L11 12L13 17" fill="#929099" />
              </>
            ) : (
              <>
                <Rect x={2} y={12} width={16} height={7} fill="#737079" />
                <Path d="M2 10V4H18V10Z" fill="#939099" />
                <Rect x={4} y={12} width={12} height={2} fill="#302e35" />
              </>
            )}
          </G>
        ) : kind === 'slime' ? (
          <>
            <Rect x={2} y={13} width={15} height={5} fill="#68a695" />
            <Rect x={4} y={9} width={11} height={4} fill="#8fceb1" />
            <Rect x={6} y={7} width={7} height={2} fill="#a9e1bd" />
            <Rect x={5} y={11} width={2} height={3} fill="#293e40" />
            <Rect x={12} y={11} width={2} height={3} fill="#293e40" />
            <Rect x={2} y={18} width={15} height={2} fill="#456659" />
          </>
        ) : ['chest', 'silver', 'gold', 'mimic'].includes(kind) ? (
          <>
            <Rect x={2} y={9} width={16} height={10} fill="#42352e" />
            <Rect
              x={3}
              y={6}
              width={14}
              height={5}
              fill={
                kind === 'silver' || (kind === 'mimic' && tier === 2)
                  ? '#9babb6'
                  : kind === 'gold'
                    ? '#b48525'
                    : '#915a32'
              }
            />
            <Rect
              x={2}
              y={9}
              width={16}
              height={3}
              fill={
                kind === 'silver' || (kind === 'mimic' && tier === 2)
                  ? '#c1c9c9'
                  : kind === 'gold'
                    ? '#f2d367'
                    : '#b77a45'
              }
            />
            <Rect
              x={3}
              y={13}
              width={14}
              height={5}
              fill={kind === 'silver' || (kind === 'mimic' && tier === 2) ? '#6e818d' : '#8e6338'}
            />
            <Rect
              x={5}
              y={7}
              width={2}
              height={11}
              fill={kind === 'silver' || (kind === 'mimic' && tier === 2) ? '#e0dbc1' : '#d8a55b'}
            />
            <Rect
              x={13}
              y={7}
              width={2}
              height={11}
              fill={kind === 'silver' || (kind === 'mimic' && tier === 2) ? '#e0dbc1' : '#d8a55b'}
            />
            <Rect x={9} y={11} width={3} height={4} fill="#ead08d" />
            {kind === 'mimic' && revealed && (
              <>
                <Path
                  d="M5 13L1 10L0 5L3 4L3 8L8 11M11 12L10 7L13 3L16 3L14 7L14 12M15 14L19 10L19 5L22 7L22 12L18 17"
                  fill="#e85b93"
                />
                <Path d="M6 12L4 8L5 3L7 4L7 9L10 12" fill="#ff99c3" />
                <Rect x={4} y={11} width={12} height={3} fill="#4d2236" />
                <Rect x={5} y={11} width={2} height={2} fill="#eadfb8" />
                <Rect x={12} y={11} width={2} height={2} fill="#eadfb8" />
              </>
            )}
            {(kind === 'chest' || (kind === 'mimic' && tier === 1)) && (
              <Path d="M4 8h4m3 0h5M4 13h5m2 3h5M5 17h3" stroke="#664025" strokeWidth={0.7} />
            )}
          </>
        ) : kind === 'trap' ? (
          <>
            <Rect x={1} y={15} width={18} height={4} fill="#1b1823" />
            <Path d="M3 17 L5 11 L7 17 M8 17 L10 10 L12 17 M13 17 L15 11 L17 17" fill="#9b929e" />
            <Rect x={1} y={19} width={18} height={2} fill="#574553" />
          </>
        ) : kind === 'bed' ? (
          <>
            <Rect x={1} y={7} width={2} height={13} fill="#926348" />
            <Rect x={17} y={7} width={2} height={13} fill="#926348" />
            <Rect x={3} y={9} width={14} height={3} fill="#b4b49f" />
            <Rect x={8} y={8} width={9} height={3} fill="#6c807f" />
            <Rect x={3} y={15} width={14} height={3} fill="#b4b49f" />
            <Rect x={8} y={14} width={9} height={3} fill="#6c807f" />
          </>
        ) : (
          <>
            <Rect x={6} y={18} width={3} height={3} fill="#342d37" />
            <Rect x={12} y={18} width={3} height={3} fill="#342d37" />
            <Rect x={5} y={10} width={11} height={8} fill={palette[1]} />
            <Rect x={6} y={10} width={9} height={5} fill={palette[0]} />
            <Rect x={3} y={11} width={3} height={5} fill={palette[0]} />
            <Rect x={15} y={11} width={3} height={5} fill={palette[0]} />
            <Rect x={7} y={4} width={7} height={7} fill={palette[2]} />
            <Rect x={7} y={3} width={7} height={3} fill="#785545" />
            <Rect x={12} y={6} width={2} height={2} fill="#282232" />
            {kind === 'fighter' && (
              <>
                <Rect x={6} y={2} width={9} height={3} fill="#c5c8b8" />
                <Rect x={5} y={4} width={2} height={5} fill="#83929b" />
                <Rect x={16} y={8} width={2} height={10} fill="#e0d8b8" />
                <Rect x={15} y={14} width={4} height={2} fill="#a87c47" />
                <Rect x={2} y={12} width={5} height={6} fill="#798f9e" />
                <Rect x={3} y={13} width={3} height={3} fill="#b8c1bf" />
              </>
            )}
            {kind === 'wizard' && (
              <>
                <Rect x={5} y={3} width={11} height={2} fill="#987fc0" />
                <Rect x={7} y={0} width={7} height={3} fill="#a990d1" />
                <Rect x={9} y={-3} width={3} height={3} fill="#b5a0d6" />
                <Rect x={17} y={7} width={2} height={14} fill="#a67a55" />
                <Rect x={16} y={5} width={4} height={4} fill="#c2a1e7" />
              </>
            )}
            {kind === 'healer' && (
              <>
                <Rect x={6} y={2} width={9} height={3} fill="#c8d5b6" />
                <Rect x={6} y={5} width={2} height={4} fill="#94af8f" />
                <Rect x={15} y={10} width={2} height={9} fill="#d5c68e" />
                <Rect x={14} y={9} width={4} height={2} fill="#e2d5a2" />
              </>
            )}
            {kind === 'miner' && (
              <>
                <Rect x={5} y={3} width={11} height={3} fill="#dcac51" />
                <Rect x={7} y={1} width={7} height={2} fill="#b8803d" />
                <Rect x={11} y={3} width={3} height={2} fill="#f6dd96" />
                <Rect x={17} y={7} width={2} height={13} fill="#947158" />
                <Rect x={14} y={6} width={7} height={2} fill="#9cabaa" />
              </>
            )}
            {kind === 'maintenance' && (
              <>
                <Rect x={5} y={2} width={10} height={3} fill="#80695f" />
                <Rect x={17} y={10} width={2} height={9} fill="#a7b1ad" />
                <Rect x={16} y={8} width={4} height={3} fill="#abb9b2" />
              </>
            )}
          </>
        )}
        {variant && outfits[kind] && (
          <CharacterVariant kind={kind} variant={variant} palette={palette} />
        )}
      </G>
    </G>
  );
}
function SpriteImpl({
  kind,
  size = 42,
  animate = false,
  facing = 1,
  saturation = 1,
  tier = 1,
  variant,
}: {
  kind: SpriteKind;
  size?: number;
  animate?: boolean;
  facing?: number;
  saturation?: number;
  tier?: number;
  variant?: number;
}) {
  if (
    [
      'fighter',
      'wizard',
      'healer',
      'miner',
      'maintenance',
      'defender',
      'zombie',
      'slime',
      'mimic',
    ].includes(kind)
  )
    size *= 1.1;
  if (['fighter', 'wizard', 'healer'].includes(kind)) size *= 1.1;
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -2,
          duration: 700,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 700,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, bounce]);
  return (
    <Animated.View
      style={{ width: size, height: size, transform: [{ translateY: bounce }, { scaleX: facing }] }}
    >
      <Svg width={size} height={size} viewBox="0 -4 22 26">
        <SpriteShape kind={kind} saturation={saturation} tier={tier} variant={variant} />
      </Svg>
    </Animated.View>
  );
}
function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      <Rect x={16} y={27} width={6} height={24} fill="#4e393c" />
      <Path d="M18 0h6v7h7v7h7v8h6v8H-4v-8h7v-8h8V7h7Z" fill="#354344" />
      <Path d="M18 0h6v7h7v7h7v8H5v-8h6V7h7Z" fill="#475454" />
      <Rect x={8} y={24} width={20} height={3} fill="#394b46" />
    </G>
  );
}
function SurfaceImpl({ office, now = 0 }: { office: boolean; now?: number }) {
  const hour = (now / 3600000) % 24;
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const blend = (night: number[], day: number[]) =>
    `rgb(${night.map((v, i) => Math.round(v + (day[i]! - v) * daylight)).join(',')})`;

  return (
    <Svg width="100%" height="155" viewBox="0 0 720 155" preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={blend([38, 35, 47], [71, 142, 198])} />
          <Stop offset="1" stopColor={blend([72, 64, 71], [154, 196, 213])} />
        </LinearGradient>
      </Defs>
      <Rect width={720} height={155} fill="url(#sky)" />
      <Rect opacity={(1 - daylight) * 0.5} x={554} y={18} width={19} height={19} fill="#a99b84" />
      <Rect x={548} y={22} width={30} height={11} fill="#a99b84" opacity={(1 - daylight) * 0.5} />
      <Rect x={566} y={16} width={15} height={12} fill="#2d2936" opacity={1 - daylight} />
      {[38, 132, 282, 391, 484, 641, 693].map((x, i) => (
        <Rect
          key={x}
          x={x}
          y={13 + (i % 3) * 15}
          width={2}
          height={2}
          fill="#c4b29c"
          opacity={(1 - daylight) * 0.45}
        />
      ))}
      <Path
        d="M0 87h25V75h31V63h22V47h24v21h24v12h38V68h25v-8h38v18h31V61h27V40h20v17h25v23h49v-9h34v-12h38v23h30V66h31V45h22v20h31v15h46V60h22V47h20v32h36v12h25v64H0Z"
        fill="#302e39"
      />
      {daylight > 0 && (
        <Rect x={548} y={18} width={22} height={22} fill="#f5db9a" opacity={daylight} />
      )}
      <Tree x={20} y={65} scale={1.4} />
      <Tree x={66} y={52} scale={1.5} />
      <Tree x={124} y={78} scale={1} />
      <Tree x={584} y={56} scale={1.5} />
      <Tree x={650} y={68} scale={1.3} />
      <Rect x={0} y={134} width={720} height={21} fill="#493d38" />
      <Rect x={0} y={130} width={720} height={5} fill="#667157" />
      {Array.from({ length: 45 }, (_, i) => (
        <Rect
          key={i}
          x={i * 17}
          y={129 - (i % 3) * 2}
          width={6}
          height={5}
          fill={i % 2 ? '#788063' : '#5b6951'}
        />
      ))}
      <G transform="translate(295 31)">
        <Rect x={8} y={56} width={133} height={47} fill="#685348" />
        <Rect x={14} y={61} width={121} height={42} fill="#896b50" />
        <Path d="M-5 59v-8h12v-8h15v-8h13v-8h80v8h13v8h13v8h14v8Z" fill="#39323b" />
        <Path d="M5 51h137v7H5ZM19 43h109v7H19ZM32 35h82v7H32Z" fill="#6b4b46" />
        <Rect x={105} y={13} width={13} height={26} fill="#70554e" />
        <Rect x={102} y={11} width={19} height={5} fill="#8a6759" />
        <Rect x={65} y={68} width={23} height={35} fill="#342b31" />
        <Rect x={70} y={71} width={14} height={32} fill={office ? '#cfa66e' : '#54443d'} />
        <Rect x={71} y={75} width={3} height={28} fill="#71553c" />
        {[25, 103].map((x) => (
          <G key={x}>
            <Rect x={x} y={69} width={18} height={18} fill="#403533" />
            <Rect x={x + 3} y={72} width={12} height={12} fill={office ? '#e2b67a' : '#796851'} />
            <Rect x={x + 8} y={70} width={2} height={17} fill="#564439" />
            <Rect x={x} y={78} width={18} height={2} fill="#564439" />
          </G>
        ))}
        <Rect x={20} y={89} width={5} height={14} fill="#493b38" />
        <Rect x={124} y={88} width={5} height={15} fill="#493b38" />
        <Rect x={-39} y={70} width={4} height={33} fill="#73503d" />
        <Rect x={-51} y={70} width={29} height={14} fill="#96754d" />
        <Rect x={-47} y={75} width={20} height={3} fill="#d0b885" />
      </G>
      <Path d="M360 135h21v7h15v13h-57v-8h21Z" fill="#8b7961" />
      {[174, 558].map((x) => (
        <G key={x}>
          <Rect x={x} y={106} width={3} height={25} fill="#675347" />
          <Rect x={x - 3} y={101} width={9} height={10} fill="#d1a466" />
          <Rect x={x - 1} y={103} width={5} height={5} fill="#f4d395" />
        </G>
      ))}
    </Svg>
  );
}
function FloorArtImpl({
  built,
  digging,
  index,
  encounters,
  level = 1,
}: {
  level?: number;
  built: boolean;
  digging: boolean;
  index: number;
  encounters: { kind: string; active: boolean; gold: number }[];
}) {
  const spriteFor = (kind: string): SpriteKind =>
    kind === 'wood'
      ? 'chest'
      : kind === 'trapdoor' || kind === 'arrows'
        ? 'trap'
        : (kind as SpriteKind);
  return (
    <Svg width="100%" height="112" viewBox="0 0 720 112" preserveAspectRatio="xMidYMid slice">
      <Rect width={720} height={112} fill={built ? '#302934' : '#322a2e'} />
      {Array.from({ length: 84 }, (_, i) => {
        const row = Math.floor(i / 21);
        return (
          <Rect
            key={i}
            x={(i % 21) * 36 - (row % 2) * 16}
            y={row * 26}
            width={33}
            height={23}
            fill={
              built
                ? (level === 2
                    ? ['#222c30', '#273137', '#293338', '#202a2f']
                    : ['#3a323e', '#372f3a', '#3d3440', '#332d38'])[i % 4]
                : ['#3c3031', '#372d30', '#3a3032', '#332a2d'][i % 4]
            }
          />
        );
      })}
      {level === 2 &&
        Array.from({ length: 45 }, (_, i) => (
          <Rect
            key={`moss-${i}`}
            x={(i * 73) % 710}
            y={(i * 29) % 88}
            width={3 + (i % 3)}
            height={2}
            fill={i % 2 ? '#527052' : '#384f40'}
          />
        ))}
      {built ? (
        <>
          {[22, 218, 431, 668].map((x) => (
            <G key={x}>
              {level === 2 && (
                <>
                  <Rect x={x - 5} y={1} width={32} height={6} fill="#9a9678" />
                  <Rect x={x - 5} y={79} width={32} height={10} fill="#868776" />
                </>
              )}
              <Rect x={x} y={3} width={22} height={86} fill="#504350" />
              <Rect x={x + 4} y={4} width={15} height={82} fill="#574957" />
              <Rect x={x - 3} y={3} width={28} height={8} fill="#645162" />
              <Rect x={x - 3} y={81} width={28} height={8} fill="#645162" />
            </G>
          ))}
          {[118, 343, 550].map((x) => (
            <G key={x}>
              {level === 2 && (
                <Path d={`M${x - 7} 42H${x + 10}L${x + 6} 53H${x - 4}Z`} fill="#c2a867" />
              )}
              <Rect x={x - 19} y={27} width={38} height={35} fill="#514039" opacity={0.35} />
              <Rect x={x - 10} y={30} width={20} height={23} fill="#906441" opacity={0.2} />
              <Rect x={x} y={44} width={4} height={12} fill="#201f26" />
              <Rect x={x - 2} y={34} width={8} height={12} fill="#db995a" />
              <Rect x={x} y={31} width={4} height={12} fill="#f0c280" />
            </G>
          ))}
          <Rect y={89} width={720} height={10} fill="#65525e" />
          <Rect y={99} width={720} height={13} fill="#241f29" />
          {Array.from({ length: 24 }, (_, i) => (
            <Rect key={i} x={i * 31} y={90} width={28} height={3} fill="#7a626c" />
          ))}
        </>
      ) : (
        <>
          {Array.from({ length: 28 }, (_, i) => (
            <G key={i}>
              <Rect
                x={(i * 67 + index * 31) % 700}
                y={(i * 19) % 100}
                width={5 + (i % 7)}
                height={3}
                fill={i % 4 === 0 ? '#806042' : '#594049'}
              />
              <Rect
                x={(i * 67 + 4 + index * 31) % 700}
                y={((i * 19) % 100) + 3}
                width={4}
                height={3}
                fill="#49373d"
              />
            </G>
          ))}
          {digging && (
            <>
              <Rect x={0} y={18} width={220} height={72} fill="#28232c" />
              <Rect x={210} y={27} width={40} height={53} fill="#28232c" />
              <Rect x={20} y={18} width={11} height={72} fill="#725543" />
              <Rect x={8} y={16} width={229} height={9} fill="#836048" />
              <Rect x={199} y={82} width={40} height={8} fill="#644d41" />
            </>
          )}
          <Rect y={101} width={720} height={11} fill="#211d25" />
        </>
      )}
    </Svg>
  );
}

export const SpriteShape = React.memo(SpriteShapeImpl);

export const Sprite = React.memo(SpriteImpl);

export const FloorArt = React.memo(FloorArtImpl);

export const Surface = React.memo(SurfaceImpl);
