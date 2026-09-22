import { characterColors, tierColor } from './tierStyle';
/** Tiny, shared sprite strips. No particles, filters, runtime randomness or frame allocations. */
export const ACTIONS = [
  'Lightning spell',
  'Waiting for rest',
  'Reset trap',
  'Mob spawning',
  'Adventurer spawning',
  'Fighter attack',
  'Digging',
  'Healing',
  'Gold earned',
  'Opening chest',
] as const;
export type ActionKind = (typeof ACTIONS)[number];
export const FRAME_COUNT = 8;
export const FRAME_SIZE = 40;
export const FRAME_MS = 125;
export function actionStrip(kind: ActionKind, level: number, includeActor = true): string {
  const tier = Math.max(1, Math.min(5, level));
  const frames = Array.from({ length: FRAME_COUNT }, (_, f) => {
    const pixels: string[] = [];
    const rect = (x: number, y: number, w: number, h: number, color: string) =>
      pixels.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
    const actor = (
      role: 'wizard' | 'fighter' | 'zombie' | 'miner',
      x: number,
      rise = 0,
      ground = 38,
      actorTier = 1,
    ) => {
      if (!includeActor) return;
      const [light, dark, face] = characterColors[role].map((c) => tierColor(c, actorTier));
      const draw = (px: number, py: number, w: number, h: number, color: string) => {
        const y = py + rise;
        if (y < ground) rect(x + px, y, w, Math.min(h, ground - y), color);
      };
      draw(3, 23, 10, 11, dark);
      draw(5, 25, 6, 7, light);
      draw(4, 15, 9, 8, face);
      draw(6, 18, 2, 2, '#292333');
      draw(10, 18, 2, 2, '#292333');
      draw(8, 21, 3, 1, '#292333');
      draw(3, 34, 4, 3, dark);
      draw(10, 34, 4, 3, dark);
      if (role === 'wizard') {
        draw(2, 13, 13, 2, characterColors.wizard[0]);
        draw(5, 10, 7, 3, characterColors.wizard[0]);
        draw(7, 9 - actorTier, 3, 1 + actorTier, characterColors.wizard[0]);
        if (actorTier === 5) {
          draw(4, 3, 10, 2, face);
          draw(4, 0, 2, 3, face);
          draw(8, 1, 2, 2, face);
          draw(12, 0, 2, 3, face);
        }
      } else {
        draw(3, 13, 11, 2, characterColors[role][0]);
        if (role === 'miner' && actorTier === 5) {
          draw(3, 11, 11, 2, face);
          draw(3, 8, 2, 3, face);
          draw(8, 8, 2, 3, face);
          draw(12, 8, 2, 3, face);
        }
      }
    };
    if (kind === 'Lightning spell') {
      actor('wizard', 0, 0, 38, tier);
      rect(16, 17, 2, 20, '#57317e');
      rect(15, 15, 4, 3, '#9550cb');
      // Every bolt begins at the staff tip and branches horizontally.
      if (f > 0 && f < 7)
        for (let b = 0; b < tier; b++) {
          for (let x = 18; x < 38; x += 2) {
            const spread = Math.round(((b - (tier - 1) / 2) * 4 * (x - 18)) / 20);
            rect(
              x,
              16 + spread + ((x / 2 + f) % 2),
              2,
              tier === 1 ? 1 : 2,
              f % 3 === 0 ? '#eee7ff' : '#bda0ee',
            );
          }
        }
    } else if (kind === 'Waiting for rest') {
      for (let i = 0; i < 3; i++)
        rect(10 + i * 8, 18 - (f % 3 === i ? 3 : 0), 4, 4, f % 3 === i ? '#ffe19a' : '#826c4d');
    } else if (kind === 'Reset trap') {
      rect(8, 27, 24, 4, '#876b56');
      rect(15 + (f % 3) * 2, 10 + (f % 2) * 4, 4, 15, '#b08051');
      rect(11 + (f % 3) * 2, 8 + (f % 2) * 4, 12, 5, '#c1d7de');
      if (f % 2) rect(28, 16, 3, 3, '#ffe19a');
    } else if (kind.includes('spawning')) {
      const mob = kind === 'Mob spawning';
      // Clip the rising body at ground level; the head emerges before the feet.
      actor(mob ? 'zombie' : 'fighter', 11, 24 - Math.round((f * 24) / 7), 37);
      rect(7, 37, 28, 2, mob ? '#59755b' : '#9584bf');
    } else if (kind === 'Digging') {
      actor('miner', 0, 0, 38, tier);
      rect(12, 24, 6, 3, tierColor(characterColors.miner[0], tier));
      // Raise, thrust into the ground, scoop, and return. Pivot stays in the hand.
      const angle = [-1.1, -0.65, 0, 0.55, 0.55, 0.2, -0.45, -1.1][f];
      const toolPixel = (length: number, across: number, color: string) =>
        rect(
          17 + Math.round(Math.cos(angle) * length - Math.sin(angle) * across),
          25 + Math.round(Math.sin(angle) * length + Math.cos(angle) * across),
          1,
          1,
          color,
        );
      for (let r = -3; r < 12; r++) for (let w = 0; w < 2; w++) toolPixel(r, w, '#91643c');
      for (let r = 11; r < 18; r++)
        for (let w = -3; w <= 3; w++) {
          if (r > 15 && Math.abs(w) > 18 - r) continue;
          toolPixel(r, w, tier === 5 ? '#e4bb52' : w === -3 ? '#edf2f4' : '#9aaab4');
        }
      rect(23, 37, 14, 2, '#65452d');
      if (f >= 4 && f <= 6) {
        rect(30 - f, 31 - (f - 4) * 3, 3, 2, '#a47745');
        rect(35 - f, 33 - (f - 4) * 2, 2, 2, '#795132');
      }
    } else if (kind === 'Fighter attack') {
      actor('fighter', 0);
      if (includeActor) rect(12, 24, 6, 3, '#a0a0a0');
      const angles = [-1.7, -1.5, -1.15, -0.65, -0.1, 0.4, 0.65, -1.7];
      const angle = angles[f];
      // Rasterized sword rotates around the hand, with a short trailing arc.
      for (let r = 2; r < 19; r++) {
        const x = 17 + Math.round(Math.cos(angle) * r),
          y = 25 + Math.round(Math.sin(angle) * r);
        rect(x, y, 2, 2, '#eeeeee');
      }
      for (let i = -3; i <= 3; i++)
        rect(
          17 + Math.round(Math.sin(angle) * i),
          25 - Math.round(Math.cos(angle) * i),
          2,
          2,
          '#777777',
        );
      rect(16, 25, 3, 3, '#494949');
    } else if (kind === 'Gold earned') {
      actor('fighter', 10);
      // Lift a coin above the head, with a narrow middle frame to suggest a spin.
      const y = 13 - Math.round((f * 12) / 7),
        width = f % 4 === 2 ? 3 : 7;
      const x = 20 - Math.floor(width / 2);
      rect(x, y + 1, width, 7, '#b47a16');
      rect(x + 1, y, Math.max(1, width - 2), 9, '#f4cb4d');
      rect(x + 1, y + 2, 1, 4, '#fff4a5');
    } else if (kind === 'Healing') {
      const y = 24 - f * 2;
      rect(18, y - 4, 4, 12, '#95eaa4');
      rect(14, y, 12, 4, '#95eaa4');
      for (let i = 0; i < tier; i++) rect(5 + i * 7, 32 - ((f + i) % 4) * 3, 2, 2, '#ffe19a');
    } else {
      rect(12, 17, 17, 15, '#b98848');
      rect(16, 9, 9, 3, '#eaca81');
      rect(14, 12, 3, f > 4 ? 3 : 8, '#eaca81');
      rect(23, 12, 3, 8, '#eaca81');
      rect(19, 23, 3, 5, '#362a26');
    }
    return `<g transform="translate(${f * FRAME_SIZE} 0)">${pixels.join('')}</g>`;
  });
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="40" viewBox="0 0 320 40" shape-rendering="crispEdges">${frames.join('')}</svg>`)}`;
}
