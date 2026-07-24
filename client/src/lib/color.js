export function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
}

// Used by ColorField's saturation/value square + hue slider - HSV maps
// directly onto "pick a hue, then a shade of it" the way every modern web
// color picker's UI works, unlike RGB which has no single axis for either.
export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rf) h = ((gf - bf) / d) % 6;
    else if (max === gf) h = (bf - rf) / d + 2;
    else h = (rf - gf) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rf, gf, bf;
  if (h < 60) [rf, gf, bf] = [c, x, 0];
  else if (h < 120) [rf, gf, bf] = [x, c, 0];
  else if (h < 180) [rf, gf, bf] = [0, c, x];
  else if (h < 240) [rf, gf, bf] = [0, x, c];
  else if (h < 300) [rf, gf, bf] = [x, 0, c];
  else [rf, gf, bf] = [c, 0, x];
  return rgbToHex((rf + m) * 255, (gf + m) * 255, (bf + m) * 255);
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastText(hex) {
  return relativeLuminance(hex) > 0.45 ? '#0b0f16' : '#f5f7fa';
}

export function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);
  const clamp = (v) => Math.min(255, Math.max(0, v + amt));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Builds a header background for one or more selected teams' primary colors.
export function themeGradient(colors) {
  if (colors.length === 0) return 'linear-gradient(135deg, #1f2430, #11141b)';
  if (colors.length === 1) {
    return `linear-gradient(135deg, ${colors[0]}, ${shade(colors[0], -30)})`;
  }
  const stops = colors.map((c, i) => `${c} ${(i / (colors.length - 1)) * 100}%`);
  return `linear-gradient(120deg, ${stops.join(', ')})`;
}
