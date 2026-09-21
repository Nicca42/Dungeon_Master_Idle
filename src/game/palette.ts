// Multiply HSL saturation while preserving hue/lightness and clamping to the color gamut.
export function saturateColor(hex: string, factor = 1) {
  if (factor === 1) return hex;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb as [number, number, number],
    max = Math.max(...rgb),
    min = Math.min(...rgb),
    d = max - min,
    l = (max + min) / 2;
  const saturation = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const hue =
    d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return `hsl(${Math.round(hue * 60)}, ${Math.min(100, Math.max(0, saturation * factor * 100)).toFixed(2)}%, ${(l * 100).toFixed(2)}%)`;
}
