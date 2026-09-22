/** Pale first tiers; full class color at IV and V. Grays stay neutral. */
export const tierStrength = [0.45, 0.72, 0.86, 1, 1];
export const slimeScale = [0.5, 0.625, 0.75, 0.875, 1];
export function tierColor(hex: string, tier: number) {
  const amount = tierStrength[Math.max(0, Math.min(4, tier - 1))];
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(224 + (parseInt(hex.slice(i, i + 2), 16) - 224) * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export const characterColors: Record<string, string[]> = {
  wizard: ['#9550cb', '#57317e', '#c897ea'],
  fighter: ['#969696', '#494949', '#cecece'],
  healer: ['#e9c944', '#887128', '#fff1ad'],
  miner: ['#a47745', '#624529', '#d5b183'],
  maintenance: ['#c34e49', '#7e3033', '#e69789'],
  defender: ['#4488c4', '#2c527e', '#9bc9e9'],
  zombie: ['#729652', '#425f36', '#b3ce87'],
};
export function trapSpikeCount(tier: number) {
  return tier >= 4 ? 4 : 3;
}
export function arrowHoleCount(tier: number) {
  return tier + 1;
}

// Facial detail stays dark at every tier so pale level-I faces remain readable.
export const faceInk: Record<string, string> = {
  wizard: '#392147',
  fighter: '#292929',
  healer: '#493c16',
  miner: '#39291d',
  maintenance: '#492224',
  defender: '#21364e',
  zombie: '#293b20',
  slime: '#183453',
};
export const healerCross = '#28783d';
