import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import {
  arrowHoleCount,
  faceInk,
  healerCross,
  characterColors,
  slimeScale,
  tierColor,
  trapSpikeCount,
} from '../art/tierStyle';
export function TierCharacter({
  kind,
  tier,
  variant,
  eyeColor,
}: {
  eyeColor?: string;
  kind: string;
  tier: number;
  variant: number;
}) {
  const [light, dark, highlight] = characterColors[kind].map((c) => tierColor(c, tier));
  const hatColor = characterColors[kind][0];
  const crownY = kind === 'wizard' ? 3 - tier * 2 - 5 : -4;
  return (
    <G>
      <Path
        d={
          variant % 3 === 0
            ? 'M3 11H17L20 25H0Z'
            : variant % 3 === 1
              ? 'M4 10H16V24H3Z'
              : 'M1 10H19V15H16V24H4V15H1Z'
        }
        fill={dark}
      />
      <Rect x={6} y={4} width={9} height={8} fill={highlight} />
      <Rect x={6} y={13} width={8} height={8} fill={light} />
      <G accessibilityLabel="Face: two eyes and mouth">
        <Rect x={7} y={6} width={2} height={2} fill={eyeColor ?? faceInk[kind]} />
        <Rect x={12} y={6} width={2} height={2} fill={eyeColor ?? faceInk[kind]} />
        <Rect x={9} y={10} width={3} height={1} fill={faceInk[kind]} />
      </G>
      <Rect x={4} y={24} width={5} height={3} fill={dark} />
      <Rect x={12} y={24} width={5} height={3} fill={dark} />
      {kind === 'wizard' ? (
        <G>
          <Path d={`M3 4H18V2H15L${8 + (variant % 3)} ${3 - tier * 2}L5 2H3Z`} fill={hatColor} />
          <Rect x={20} y={8} width={2} height={19} fill={dark} />
        </G>
      ) : (
        <Rect x={5} y={2} width={11} height={3} fill={hatColor} />
      )}
      {(kind === 'fighter' || kind === 'defender') && (
        <G>
          <Path d="M20 5H22V21H20ZM18 19H24V21H18Z" fill={highlight} />
          <Path d={variant % 2 ? 'M0 13H5V21L2 24L0 21Z' : 'M0 13H5V23H0Z'} fill={light} />
        </G>
      )}
      {kind === 'healer' && (
        <Path
          accessibilityLabel="Green healer cross"
          d="M9 13H12V21H9ZM6 16H15V18H6Z"
          fill={healerCross}
        />
      )}
      {kind === 'miner' && <Path d="M20 11H22V28H20ZM16 9H25V12H16Z" fill={light} />}
      {kind === 'maintenance' && (
        <Path d="M20 12H22V26H20ZM18 8H20V13H23V8H25V15H18Z" fill={light} />
      )}
      {tier === 5 && (
        <Path
          accessibilityLabel="Level 5 crown"
          d={`M5 ${crownY + 5}V${crownY}L8 ${crownY + 3}L10 ${crownY}L13 ${crownY + 3}L16 ${crownY}V${crownY + 6}H5Z`}
          fill={highlight}
          stroke={dark}
          strokeWidth={0.5}
        />
      )}
    </G>
  );
}
export function TierSlime({ tier, puddle = false }: { tier: number; puddle?: boolean }) {
  const scale = slimeScale[tier - 1],
    light = tierColor('#438bdc', tier),
    dark = tierColor('#245092', tier),
    shine = tierColor('#9dcafa', tier);
  return (
    <G transform={`translate(${15 * (1 - scale)} ${30 * (1 - scale)}) scale(${scale})`}>
      <Path
        d={
          puddle
            ? 'M1 25H4V22H10V20H23V22H29V24H33V29H28V32H6V30H1Z'
            : 'M2 29V19H5V14H9V10H22V13H27V18H30V29Z'
        }
        fill={dark}
      />
      <Path
        d={
          puddle
            ? 'M6 25H11V23H24V25H28V28H23V30H10V28H6Z'
            : 'M5 26V19H8V15H12V13H21V16H25V20H27V26Z'
        }
        fill={light}
      />
      <Rect x={10} y={puddle ? 24 : 16} width={8} height={2} fill={shine} />
      {!puddle && (
        <G>
          <Rect x={11} y={21} width={3} height={3} fill={faceInk.slime} />
          <Rect x={21} y={21} width={3} height={3} fill={faceInk.slime} />
          <Rect x={16} y={25} width={4} height={2} fill={faceInk.slime} />
        </G>
      )}
    </G>
  );
}
export function TierTrap({ tier, arrows = false }: { tier: number; arrows?: boolean }) {
  if (arrows)
    return (
      <G>
        {Array.from({ length: arrowHoleCount(tier) }, (_, i) => {
          const x = 2 + (i % 3) * 10,
            y = 9 + Math.floor(i / 3) * 13;
          return (
            <G key={i}>
              <Path d={`M${x} ${y + 2}h2v-2h4v2h2v7h-2v2h-4v-2h-2Z`} fill="#716961" />
              <Rect x={x + 2} y={y + 2} width={4} height={7} fill="#151416" />
            </G>
          );
        })}
      </G>
    );
  const count = trapSpikeCount(tier),
    metal = tier === 5 ? '#e6bc50' : tier >= 3 ? '#dce7ec' : '#93999b';
  return (
    <G>
      <Rect x={0} y={17} width={32} height={14} fill="#46382e" />
      <Rect x={2} y={19} width={28} height={10} fill="#19191d" />
      {Array.from({ length: count }, (_, i) => {
        const x = 3 + i * (26 / count),
          broken = tier === 1 && i === 1;
        return (
          <G key={i}>
            <Path d={broken ? `M${x} 28l2-6h3l2 6Z` : `M${x} 28l3-12l3 12Z`} fill={metal} />
            {tier >= 3 && <Path d={`M${x + 3} 18v7`} stroke={tier === 5 ? '#fff2ad' : '#ffffff'} />}
          </G>
        );
      })}
    </G>
  );
}
export function TierFloor({ tier, full = false }: { tier: number; full?: boolean }) {
  const pillar = tier === 5 ? '#c49a35' : tier === 4 ? '#a8b8c5' : '#665f64';
  const pillarTrim = tier === 5 ? '#ffe397' : tier === 4 ? '#e4edf3' : '#938987';
  const torchMetal = tier === 5 ? '#e8bd4c' : '#bcac8d';
  const brick = ['#50474b', '#40464a', '#373e48', '#333343', '#302c3f'][tier - 1];
  return (
    <Svg
      width={full ? '100%' : 200}
      height={full ? 112 : 80}
      preserveAspectRatio="none"
      viewBox="0 0 720 160"
      accessibilityLabel={`floor level ${tier} full background`}
    >
      <Rect width={720} height={160} fill="#22212a" />
      {Array.from({ length: 100 }, (_, i) => (
        <Rect
          key={i}
          x={(i % 20) * 38 - (Math.floor(i / 20) % 2) * 18}
          y={Math.floor(i / 20) * 28}
          width={35}
          height={25}
          fill={brick}
        />
      ))}
      {tier === 1 && (
        <G accessibilityLabel="Cracked level 1 walls">
          {[75, 290, 510, 620].map((x, i) => (
            <Path
              key={x}
              d={`M${x} ${15 + i * 8}v12h7v14h-5v13h9v17m-9-30h-9v8`}
              fill="none"
              stroke="#211f27"
              strokeWidth={3}
            />
          ))}
        </G>
      )}
      {tier >= 2 &&
        Array.from({ length: 25 }, (_, i) => (
          <Rect key={i} x={(i * 83) % 710} y={(i * 37) % 136} width={4} height={2} fill="#587153" />
        ))}
      {[20, 235, 460, 680].map((x) => (
        <G key={x}>
          <Rect x={x} y={0} width={20} height={145} fill={pillar} />
          <Rect x={x - 4} y={2} width={28} height={8} fill={pillarTrim} />
          <Rect x={x - 4} y={135} width={28} height={10} fill={pillarTrim} />
          {tier >= 3 && (
            <Rect
              x={x + 8}
              y={20}
              width={4}
              height={105}
              fill={tier >= 4 ? pillarTrim : '#b0a3b5'}
            />
          )}
        </G>
      ))}
      {[125, 350, 575].map((x) => (
        <G key={x}>
          {tier >= 3 && (
            <G accessibilityLabel="Ornate torch fitting">
              <Path d={`M${x - 10} 51h25v36h-25Z`} fill={tier === 5 ? '#977022' : '#62584b'} />
              <Path
                d={`M${x - 15} 58v12h9v8h17v-8h9V58h-5v8h-8v7h-9v-7h-8v-8Z`}
                fill={torchMetal}
              />
              <Rect x={x - 6} y={82} width={17} height={4} fill={torchMetal} />
            </G>
          )}
          <Rect x={x} y={65} width={5} height={24} fill={tier === 5 ? torchMetal : '#8b6651'} />
          <Path d={`M${x - 4} 66v-12h3v-8h4v5h4v15Z`} fill="#efb75a" />
          {tier >= 2 && <Path d={`M${x - 7} 68h18l-4 6h-10Z`} fill={torchMetal} />}
        </G>
      ))}
      <Rect y={145} width={720} height={15} fill="#6a6060" />
      <Path d="M0 148H720" stroke="#9d8d7d" strokeWidth={3} />
    </Svg>
  );
}

export function TierChest({ tier }: { tier: number }) {
  const [body, shade, shine] =
    tier === 1
      ? ['#b68143', '#704a2a', '#e0b16b']
      : tier === 2
        ? ['#b8c7cf', '#627680', '#edf4f7']
        : tier === 4
          ? ['#36bcbc', '#167c91', '#adffff']
          : ['#ebc442', '#aa7b19', '#fff2a1'];
  return (
    <G>
      <Path d="M1 18V12H4V9H26V12H29V18Z" fill={body} />
      <Rect x={1} y={19} width={28} height={12} fill={body} />
      <Rect x={1} y={17} width={28} height={3} fill={shade} />
      <Rect x={3} y={12} width={24} height={2} fill={shine} />
      <Rect x={3} y={21} width={2} height={8} fill={shine} />
      <Rect x={25} y={21} width={3} height={10} fill={shade} />
      <Rect x={13} y={17} width={5} height={7} fill={shine} />
      <Rect x={15} y={19} width={1} height={3} fill={shade} />
      {tier === 1 && <Path d="M6 23H11M6 27H10M19 24H23M9 15H12" stroke={shade} strokeWidth={1} />}
      {tier === 4 && <Path d="M6 15L11 10H16L11 15ZM18 28L22 22H24L20 28Z" fill={shine} />}
      {tier === 5 && (
        <Path
          accessibilityLabel="Royal chest crown"
          d="M8 8V1L12 5L15 0L18 5L22 1V8Z"
          fill={body}
          stroke={shade}
          strokeWidth={1}
        />
      )}
    </G>
  );
}
