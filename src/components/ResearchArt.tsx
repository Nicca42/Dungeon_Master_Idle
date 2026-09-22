import React, { memo } from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
export const RESEARCH_ART = [
  {
    id: 'depths',
    name: 'Dungeon Depths',
    color: '#9982bf',
    shape: 'M7 7H23V10H10V13H14V17H18V21H23V24H7Z',
  },
  {
    id: 'builders',
    name: 'Builders',
    color: '#ba8955',
    shape: 'M5 8H11V11H17V8H24V13H17V24H12V13H5Z',
  },
  {
    id: 'traps',
    name: 'Traps',
    color: '#c57566',
    shape: 'M5 22L9 11L13 22L17 8L21 22L25 12V25H5Z',
  },
  {
    id: 'mobs',
    name: 'Mobs',
    color: '#82ad6d',
    shape: 'M6 10H9V6H21V10H24V20H20V25H17V21H13V25H10V20H6ZM9 13V17H13V13ZM17 13V17H21V13Z',
  },
  {
    id: 'treasure',
    name: 'Treasure',
    color: '#e4bb52',
    shape: 'M5 13V9H9V7H22V9H25V13ZM5 16H25V25H5ZM13 13V20H17V13Z',
  },
  {
    id: 'staff',
    name: 'Staff investment',
    color: '#d88274',
    shape: 'M6 6H12V12H6ZM18 6H24V12H18ZM4 15H14V22H4ZM16 15H26V22H16ZM8 24H22V26H8Z',
  },
  {
    id: 'adventurers',
    name: 'Adventurer attractions',
    color: '#a58cdd',
    shape: 'M5 6H8V26H5ZM9 7H25L21 12L25 17H9ZM13 9V15H17V9Z',
  },
  {
    id: 'rest',
    name: 'Rest and hospitality',
    color: '#67bba8',
    shape: 'M5 12H8V25H5ZM8 17H25V23H8ZM10 12H15V16H10ZM17 14H24V16H17ZM23 23H26V26H23Z',
  },
  {
    id: 'finance',
    name: 'Finance',
    color: '#d3bc70',
    shape: 'M6 19H13V25H6ZM15 14H22V25H15ZM24 7H27V25H24ZM5 10H12V13H5ZM7 7H10V16H7Z',
  },
] as const;
const frames = ['#917052', '#aebdc6', '#dfb855', '#70d0d0', '#f7d76a'];
/** Static pixel glyphs: same 58 × 64 preview footprint as character assets. */
export const ResearchIcon = memo(function ResearchIcon({
  branch,
  level,
}: {
  branch: (typeof RESEARCH_ART)[number];
  level: number;
}) {
  const frame = frames[level - 1];
  return (
    <Svg
      width={58}
      height={64}
      viewBox="-5 -14 40 48"
      accessibilityLabel={`${branch.name} research level ${level} icon`}
    >
      <Path d="M1 2H28V29H1Z" fill="#25232e" />
      <Path d="M1 2H28V5H4V26H28V29H1ZM25 5H28V26H25Z" fill={frame} />
      <Path d={branch.shape} fill={branch.color} fillRule="evenodd" />
      {level >= 2 && (
        <G>
          <Rect x={0} y={1} width={5} height={5} fill={frame} />
          <Rect x={24} y={25} width={5} height={5} fill={frame} />
        </G>
      )}
      {level >= 3 && (
        <G>
          <Rect x={24} y={1} width={5} height={5} fill={frame} />
          <Rect x={0} y={25} width={5} height={5} fill={frame} />
        </G>
      )}
      {level === 4 && <Path d="M13 -3H17V1H13ZM13 30H17V34H13Z" fill={frame} />}
      {level === 5 && <Path d="M8 1V-7L12 -3L15 -8L18 -3L22 -7V1Z" fill={frame} />}
      <Rect x={8} y={27} width={14} height={5} fill="#25232e" />
      {Array.from({ length: level }, (_, i) => (
        <Rect key={i} x={15 - level * 1.5 + i * 3} y={28} width={2} height={3} fill={frame} />
      ))}
    </Svg>
  );
});
