import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
export function PixelGear({ size = 24, color = '#e9bb70' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 1h6v4h3V3h3v6h2v6h-4v3h2v3h-6v2H9v-4H6v2H3v-6H1V9h4V6H3V3h6Z" fill="#69505b" />
      <Path d="M9 2h6v4h3V4h2v5h2v6h-4v3h2v2h-5v2H9v-4H6v2H4v-5H2V9h4V6H4V4h5Z" fill={color} />
      <Rect x={7} y={7} width={10} height={10} fill="#392e3d" />
      <Rect x={9} y={9} width={6} height={6} fill="#9b7781" />
      <Rect x={9} y={9} width={2} height={2} fill="#fff0bc" />
    </Svg>
  );
}
