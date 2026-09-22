import React from 'react';
import Svg, { Rect } from 'react-native-svg';
const patterns = {
  check: [
    '........#',
    '.......##',
    '......##.',
    '.#...##..',
    '###.##...',
    '.####....',
    '..##.....',
  ],
  cross: [
    '##.....##',
    '.##...##.',
    '..##.##..',
    '...###...',
    '..##.##..',
    '.##...##.',
    '##.....##',
  ],
  eye: ['..#####..', '.##...##.', '##..#..##', '#..###..#', '##..#..##', '.##...##.', '..#####..'],
  search: [
    '.####....',
    '##..##...',
    '#....#...',
    '#....#...',
    '##..##...',
    '.#####...',
    '.....##..',
    '......##.',
    '.......##',
  ],
} as const;
export function PixelActionIcon({
  kind,
  color,
  size = 18,
}: {
  kind: keyof typeof patterns;
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 9 9" accessibilityLabel={`Pixel ${kind}`}>
      {patterns[kind].flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === '#' ? (
            <Rect
              key={`${x}-${y}`}
              x={x}
              y={y + (kind === 'search' ? 0 : 1)}
              width={1}
              height={1}
              fill={color}
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}
