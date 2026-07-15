// Generates a stylised shield-badge SVG crest for each club, from its
// real primary/secondary colors and short code. Run: node scripts/generate-crests.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const teams = JSON.parse(readFileSync(path.join(__dirname, '../server/data/teams.json'), 'utf-8'));
const outDir = path.join(__dirname, '../client/public/crests');
mkdirSync(outDir, { recursive: true });

function relativeLuminance(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastText(hex) {
  return relativeLuminance(hex) > 0.4 ? '#111111' : '#FFFFFF';
}

function shieldSvg(team) {
  const { name, short, primary, secondary } = team;
  const textColor = contrastText(primary);
  const id = `grad-${team.slug}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116" width="100" height="116" role="img" aria-label="${name} crest">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${shade(primary, -18)}"/>
    </linearGradient>
  </defs>
  <path d="M50 3 L94 15 V54 C94 84 74 103 50 113 C26 103 6 84 6 54 V15 Z"
        fill="url(#${id})" stroke="${secondary}" stroke-width="4"/>
  <path d="M50 3 L94 15 V54 C94 84 74 103 50 113 C26 103 6 84 6 54 V15 Z"
        fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
  <text x="50" y="64" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif"
        font-weight="800" font-size="30" fill="${textColor}" letter-spacing="0.5">${short}</text>
</svg>`;
}

function shade(hex, percent) {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  const amt = Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

for (const team of teams) {
  const svg = shieldSvg(team);
  writeFileSync(path.join(outDir, `${team.slug}.svg`), svg, 'utf-8');
}

console.log(`Generated ${teams.length} crest SVGs in ${outDir}`);
