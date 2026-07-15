export function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
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
