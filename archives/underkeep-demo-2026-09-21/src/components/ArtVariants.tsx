import React from 'react';
import { G, Rect, Path } from 'react-native-svg';
export function CharacterVariant({
  kind,
  variant: v,
  palette: p,
}: {
  kind: string;
  variant: number;
  palette: string[];
}) {
  if (kind === 'zombie')
    return (
      <G>
        <Path
          d={
            ['M5 8H16V19H4Z', 'M3 10H18V20H3Z', 'M6 9H15V21H5Z', 'M2 12H18V18H3Z', 'M4 9H17V20H4Z'][
              v - 1
            ]
          }
          fill={p[1]}
        />
        <Rect x={6} y={2} width={9} height={9} fill={p[0]} />
        <Path
          d={
            [
              'M5 2H15V5H5Z',
              'M5 1H16V4H5ZM3 4H18V6H3Z',
              'M6 2H9V5H6ZM12 0H15V4H12Z',
              'M5 3H16V5H5ZM6 0H14V3H6Z',
              'M6 2H16V5H6Z',
            ][v - 1]
          }
          fill={v === 2 ? '#714d38' : v === 4 ? '#84949b' : '#384b42'}
        />
        <Rect x={11} y={6} width={3} height={2} fill={v === 5 ? '#f1b84c' : '#ed8a84'} />
        {v === 1 && <Path d="M5 12H9V15H5ZM12 17H16V20H12" fill="#b0a184" />}
        {v === 2 && <Path d="M2 10H6V18H2ZM14 11H19V15H14" fill="#6e5941" />}
        {v === 3 && <Path d="M4 11H7V14H4ZM10 13H13V17H10ZM15 17H18V20H15" fill="#dfd3a8" />}
        {v === 4 && <Path d="M2 10H7V14H2ZM14 10H19V14H14ZM8 12H14V15H8" fill="#81969a" />}
        {v === 5 && <Path d="M3 8H6V13H3ZM13 1H16V4H13ZM15 15H19V19H15" fill="#8eb64b" />}
      </G>
    );
  return (
    <G>
      {/* Distinct silhouettes and equipment, retaining each class palette. */}
      {v === 1 && (
        <>
          <Path d="M5 10L2 20H16L14 10" fill={p[1]} />
          <Rect x={7} y={11} width={7} height={6} fill={p[0]} />
        </>
      )}
      {v === 2 && (
        <>
          <Path d="M2 9H8V14H2ZM13 9H19V14H13" fill={p[0]} />
          <Path d="M7 1H15V4H7ZM9 -2H12V1H9" fill={p[1]} />
        </>
      )}
      {v === 3 && (
        <>
          <Path d="M3 5V1H16V5H14V3H6V8H3" fill={p[1]} />
          <Path d="M4 13L1 21H18L15 13" fill={p[0]} />
        </>
      )}
      {v === 4 && (
        <>
          <Path d="M3 11H7V17H3ZM14 11H18V17H14" fill={p[1]} />
          <Path d="M6 2H15V5H6ZM5 5H8V8H5" fill={p[0]} />
          <Rect x={9} y={12} width={3} height={3} fill="#efd27a" />
        </>
      )}
      {v === 5 && (
        <>
          <Path d="M2 9L0 20H6V9ZM15 9V20H20L18 9" fill={p[1]} />
          <Path d="M5 2L3 -2L8 1H13L18 -2L16 3" fill="#d9c89b" />
        </>
      )}
      {kind === 'fighter' && (
        <Path d={v % 2 ? 'M18 2H20V17H18ZM15 13H22V15H15' : 'M0 10H6V18L3 21L0 18Z'} fill={p[0]} />
      )}
      {kind === 'wizard' && (
        <>
          <Path d={v % 2 ? 'M6 2L9 -4L15 2Z' : 'M5 2L8 -2H13L16 3Z'} fill={p[0]} />
          <Rect x={17} y={4} width={4} height={4} fill={p[0]} />
        </>
      )}
      {kind === 'healer' && (
        <>
          <Path d="M9 10H12V17H9ZM7 12H14V15H7" fill="#ede6bb" />
          {v % 2 === 0 && <Path d="M4 0H16V2H4Z" fill="#f4d584" />}
        </>
      )}
    </G>
  );
}
export function SpawnArt({ kind, variant = 1 }: { kind: 'coffin' | 'puddle'; variant?: number }) {
  const v = variant;
  if (kind === 'coffin')
    return (
      <G>
        <Path
          d="M9 12H11V10H13V8H24V10H26V12H28V20H27V26H25V30H12V26H11V20H9Z"
          fill="#382733"
          stroke="#986b4e"
          strokeWidth={2}
        />
        <Path d="M13 12H24V20H23V26H15V20H13Z" fill="#151724" />
        <Path
          d={
            [
              'M2 2H5V0H8V2H10V4H12V10H11V16H10V21H8V24H6V22H3V16H2Z',
              'M4 1H22V3H24V5H26V7H23V9H7V7H5V4H4Z',
              'M27 0H29V2H32V4H34V16H33V23H31V26H28V20H27Z',
              'M1 5H4V3H6V1H8V3H10V7H12V13H10V19H9V23H7V26H5V24H2V18H1Z',
              'M8 0H24V2H27V4H29V6H26V8H10V6H8Z',
            ][v - 1]
          }
          fill={['#805239', '#626f78', '#67465f', '#547064', '#806444'][v - 1]}
          stroke="#b79a76"
          strokeWidth={2}
        />
        <Path d="M17 14H21V18H17ZM16 20H22V22H16" fill={v === 4 ? '#93ac73' : '#c8b595'} />
        {v === 2 && <Path d="M10 3H20V5H10ZM18 1V8H16V1" fill="#c7ced0" />}
        {v === 3 && <Path d="M29 8H32V12H29ZM29 16H32V20H29" fill="#c8a5df" />}
        {v === 4 && <Path d="M4 6H7V10H4ZM9 23H13V27H9" fill="#8eb95a" />}
        {v === 5 && <Path d="M13 2H24V4H13ZM20 0V7H18V0" fill="#ddba62" />}
      </G>
    );
  return (
    <G>
      <Path
        d={
          [
            'M1 23L6 18H13L17 15H24L28 20H33V26L27 30H8L1 27Z',
            'M0 22L7 17H14L18 12H23L27 19H33V26L26 29H5Z',
            'M1 23L5 19H12V15H23V19H29L34 24L28 30H8Z',
            'M2 21L9 17L15 20L21 15L27 18L33 24L27 29H6Z',
            'M0 23L7 16H13L17 13H24L30 20L34 24L28 30H6Z',
          ][v - 1]
        }
        fill={['#286f79', '#287c67', '#315c88', '#347e79', '#286353'][v - 1]}
      />
      <Path
        d="M6 23H9V20H25V22H29V25H24V27H10V25H6Z"
        fill={['#56b6a3', '#78c98b', '#65bdd1', '#82d9c1', '#92ba6b'][v - 1]}
      />
      <Path d="M10 23H16V25H10ZM22 21H26V23H22" fill="#b7e6c6" />
      {Array.from({ length: v }, (_, i) => (
        <Rect
          key={i}
          x={5 + i * 5}
          y={14 - (i % 2) * 5}
          width={3}
          height={3}
          fill={v === 3 ? '#8fd7e7' : '#89d9ad'}
        />
      ))}
      {v === 4 && <Path d="M8 25H12V27H8ZM18 21H21V24H18ZM25 25H29V27H25" fill="#e0f3b9" />}
      {v === 5 && <Path d="M1 20H5V24H1ZM29 16H33V20H29" fill="#48633c" />}
    </G>
  );
}
