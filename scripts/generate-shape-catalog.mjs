import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = process.cwd();
const sourcePath = path.join(root, 'src', 'LevelData.ts');
const outputPath = path.join(root, 'geometry-slicer-shape-catalog.svg');

const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const sandbox = {
  exports: {},
  require,
  console,
};
vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const { Chapters } = sandbox.exports;
if (!Array.isArray(Chapters) || Chapters.length === 0) {
  throw new Error('No chapters were exported from src/LevelData.ts');
}

const itemStyles = {
  pizza: { color: '#ffcc77', stroke: '#d28c47', feature: 'circles', featureColor: '#cc3333' },
  watermelon: { color: '#ff4455', stroke: '#228833', feature: 'dots', featureColor: '#222222' },
  gear: { color: '#666677', stroke: '#9999aa', feature: 'gear', featureColor: '#222233' },
  chocolate: { color: '#3d2314', stroke: '#2a170d', feature: 'grid', featureColor: '#2a170d' },
  cheese: { color: '#ffcc00', stroke: '#ddaa00', feature: 'circles', featureColor: '#ddaa00' },
  cookie: { color: '#ddaa77', stroke: '#bb8855', feature: 'dots', featureColor: '#4a2e1b' },
  brick: { color: '#aa4433', stroke: '#883322', feature: 'lines', featureColor: '#883322' },
  leaf: { color: '#44aa44', stroke: '#227722', feature: 'lines', featureColor: '#227722' },
  wood: { color: '#c19a6b', stroke: '#a07a4b', feature: 'lines', featureColor: '#a07a4b' },
  metal: { color: '#8899aa', stroke: '#aabbcc', feature: 'dots', featureColor: '#667788' },
  starfish: { color: '#ff7766', stroke: '#cc5544', feature: 'dots', featureColor: '#cc5544' },
  origami: { color: '#eef5ff', stroke: '#bbccdd', feature: 'lines', featureColor: '#bbccdd' },
  paint: { color: '#11ccff', stroke: '#0099cc', feature: 'circles', featureColor: '#00aadd' },
  fried_egg: { color: '#ffffff', stroke: '#eeeeee', feature: 'egg', featureColor: '#ffcc00' },
  default: { color: '#4488ff', stroke: '#ffffff', feature: 'none', featureColor: '#70d6ff' },
};

const xml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function bounds(points) {
  return points.reduce((acc, [x, y]) => ({
    minX: Math.min(acc.minX, x),
    maxX: Math.max(acc.maxX, x),
    minY: Math.min(acc.minY, y),
    maxY: Math.max(acc.maxY, y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function fit(points, cx, cy, box) {
  const b = bounds(points);
  const w = b.maxX - b.minX || 1;
  const h = b.maxY - b.minY || 1;
  const scale = Math.min(box / w, box / h);
  const ox = (b.minX + b.maxX) / 2;
  const oy = (b.minY + b.maxY) / 2;
  return points.map(([x, y]) => [cx + (x - ox) * scale, cy + (y - oy) * scale]);
}

function pathFor(points) {
  return points.map(([x, y], index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function line(x1, y1, x2, y2, attrs = '') {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ${attrs}/>`;
}

function drawSliceGuides(cx, cy, size, level, clipId) {
  const lines = [];
  const extent = size * 0.54;
  const attrs = `clip-path="url(#${clipId})" class="slice-guide"`;

  if (level.targetPieces === 3) {
    const offset = size * 0.16;
    lines.push(line(cx - offset, cy - extent, cx - offset, cy + extent, attrs));
    lines.push(line(cx + offset, cy - extent, cx + offset, cy + extent, attrs));
  } else if (level.targetPieces === 4) {
    lines.push(line(cx - extent, cy, cx + extent, cy, attrs));
    lines.push(line(cx, cy - extent, cx, cy + extent, attrs));
  } else if (level.targetPieces === 5) {
    for (const offset of [-0.24, -0.08, 0.08, 0.24]) {
      lines.push(line(cx + size * offset, cy - extent, cx + size * offset, cy + extent, attrs));
    }
  } else if (level.targetPieces === 6) {
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      const dx = Math.cos(angle) * extent;
      const dy = Math.sin(angle) * extent;
      lines.push(line(cx - dx, cy - dy, cx + dx, cy + dy, attrs));
    }
  } else {
    const cuts = Math.max(1, Math.min(level.maxCuts, 4));
    for (let i = 0; i < cuts; i++) {
      const angle = -Math.PI / 4 + (i * Math.PI) / cuts;
      const dx = Math.cos(angle) * extent;
      const dy = Math.sin(angle) * extent;
      lines.push(line(cx - dx, cy - dy, cx + dx, cy + dy, attrs));
    }
  }

  return lines.join('\n');
}

function drawFeature(style, itemType, cx, cy, box, clipId, index) {
  const out = [];
  const attrs = `clip-path="url(#${clipId})"`;
  const c = style.featureColor;

  if (itemType === 'watermelon') {
    out.push(`<rect x="${(cx - box / 2).toFixed(1)}" y="${cy.toFixed(1)}" width="${box.toFixed(1)}" height="${(box / 2).toFixed(1)}" fill="#11aa33" opacity=".92" ${attrs}/>`);
  }

  if (style.feature === 'grid') {
    for (let p = -box / 2; p <= box / 2; p += box / 5) {
      out.push(line(cx - box / 2, cy + p, cx + box / 2, cy + p, `stroke="${c}" stroke-width="2" opacity=".7" ${attrs}`));
      out.push(line(cx + p, cy - box / 2, cx + p, cy + box / 2, `stroke="${c}" stroke-width="2" opacity=".7" ${attrs}`));
    }
  }

  if (style.feature === 'lines') {
    for (let p = -box; p <= box; p += 14) {
      out.push(line(cx - box / 2, cy + p, cx + box / 2, cy + p - 34, `stroke="${c}" stroke-width="3" opacity=".6" ${attrs}`));
    }
  }

  if (style.feature === 'dots') {
    for (let i = 0; i < 18; i++) {
      const x = cx - box * 0.42 + ((i * 37 + index * 11) % 84);
      const y = cy - box * 0.38 + ((i * 23 + index * 17) % 76);
      const r = itemType === 'starfish' ? 2.7 : 2.2;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" opacity=".82" ${attrs}/>`);
    }
  }

  if (style.feature === 'circles') {
    for (let i = 0; i < 9; i++) {
      const x = cx - box * 0.36 + ((i * 31 + index * 7) % 72);
      const y = cy - box * 0.34 + ((i * 29 + index * 13) % 68);
      const r = itemType === 'cheese' ? 5 + (i % 3) * 1.3 : 4;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity=".72" ${attrs}/>`);
      if (itemType === 'pizza' && i % 3 === 0) {
        out.push(`<circle cx="${(x + 7).toFixed(1)}" cy="${(y - 5).toFixed(1)}" r="2.2" fill="#225511" opacity=".8" ${attrs}/>`);
      }
    }
  }

  if (style.feature === 'gear') {
    out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(box * 0.11).toFixed(1)}" fill="${c}" opacity=".9" ${attrs}/>`);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x = cx + Math.cos(angle) * box * 0.25;
      const y = cy + Math.sin(angle) * box * 0.25;
      out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(box * 0.045).toFixed(1)}" fill="${c}" opacity=".72" ${attrs}/>`);
    }
  }

  if (style.feature === 'egg') {
    out.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(box * 0.17).toFixed(1)}" fill="${c}" opacity=".95" ${attrs}/>`);
    out.push(`<circle cx="${(cx - box * 0.05).toFixed(1)}" cy="${(cy - box * 0.06).toFixed(1)}" r="${(box * 0.045).toFixed(1)}" fill="#fff7cc" opacity=".75" ${attrs}/>`);
  }

  return out.join('\n');
}

const width = 1800;
const margin = 54;
const cardGap = 12;
const columns = 10;
const cardW = (width - margin * 2 - cardGap * (columns - 1)) / columns;
const cardH = 170;
const headerH = 246;
const rowGap = 58;
const height = headerH + Chapters.length * (cardH + rowGap) + 54;
const totalLevels = Chapters.reduce((total, chapter) => total + chapter.levels.length, 0);
const usedThemes = [...new Set(Chapters.flatMap((chapter) => chapter.levels.map((level) => level.itemType || 'default')))];

let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Geometry Slicer shape catalog">
<defs>
  <linearGradient id="page-bg" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#10131c"/>
    <stop offset=".56" stop-color="#14233e"/>
    <stop offset="1" stop-color="#263e71"/>
  </linearGradient>
  <linearGradient id="card-bg" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#151a26"/>
    <stop offset="1" stop-color="#10131c"/>
  </linearGradient>
  <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
    <path d="M36 0H0v36" fill="none" stroke="#ffffff" stroke-opacity=".055" stroke-width="1"/>
  </pattern>
  <filter id="shape-shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000000" flood-opacity=".45"/>
    <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#70d6ff" flood-opacity=".22"/>
  </filter>
  <style>
    .title { font: 900 58px Arial, sans-serif; fill: #ffffff; letter-spacing: 0; }
    .subtitle { font: 400 25px Arial, sans-serif; fill: #d8e4ff; letter-spacing: 0; }
    .chip { font: 700 18px Arial, sans-serif; fill: #ffffff; letter-spacing: 0; }
    .chapter-number { font: 900 20px Arial, sans-serif; fill: #70d6ff; letter-spacing: 0; }
    .chapter-name { font: 800 26px Arial, sans-serif; fill: #ffffff; letter-spacing: 0; }
    .cell-meta { font: 800 15px Arial, sans-serif; fill: #ffffff; letter-spacing: 0; }
    .cell-sub { font: 700 12px Arial, sans-serif; fill: #aebee0; letter-spacing: 0; }
    .slice-guide { stroke: #00ff99; stroke-width: 4.5; stroke-linecap: round; opacity: .7; stroke-dasharray: 13 8; }
  </style>
</defs>
<rect width="${width}" height="${height}" fill="url(#page-bg)"/>
<rect width="${width}" height="${height}" fill="url(#grid)"/>
<text x="${margin}" y="72" class="title">GEOMETRY SLICER</text>
<text x="${margin}" y="111" class="subtitle">Shape catalog: ${totalLevels} current levels, shown with target pieces, cut limits, and in-game material styling.</text>
<g transform="translate(${margin} 142)">
  <rect width="188" height="38" rx="8" fill="#4488ff"/>
  <text x="18" y="25" class="chip">${Chapters.length} chapters</text>
  <rect x="206" width="166" height="38" rx="8" fill="#00aa77"/>
  <text x="224" y="25" class="chip">${totalLevels} shapes</text>
  <rect x="390" width="256" height="38" rx="8" fill="#24304d"/>
  <text x="408" y="25" class="chip">neon slice guides</text>
</g>
`;

let legendX = margin + 700;
let legendY = 146;
for (const theme of usedThemes) {
  const style = itemStyles[theme] || itemStyles.default;
  const label = theme.replaceAll('_', ' ');
  svg += `<g transform="translate(${legendX.toFixed(1)} ${legendY})">
    <rect width="112" height="30" rx="7" fill="#10131c" opacity=".78" stroke="#ffffff" stroke-opacity=".12"/>
    <circle cx="16" cy="15" r="7" fill="${style.color}" stroke="${style.stroke}" stroke-width="2"/>
    <text x="30" y="20" class="cell-sub">${xml(label)}</text>
  </g>\n`;
  legendX += 122;
  if (legendX > width - 170) {
    legendX = margin + 700;
    legendY += 36;
  }
}

Chapters.forEach((chapter, chapterIndex) => {
  const rowY = headerH + chapterIndex * (cardH + rowGap);
  svg += `<text x="${margin}" y="${rowY + 23}" class="chapter-number">CHAPTER ${chapterIndex + 1}</text>
<text x="${margin + 132}" y="${rowY + 23}" class="chapter-name">${xml(chapter.name)}</text>
<rect x="${margin}" y="${rowY + 39}" width="${width - margin * 2}" height="${cardH}" rx="10" fill="#0b0f18" opacity=".2"/>\n`;

  chapter.levels.forEach((level, levelIndex) => {
    const x = margin + levelIndex * (cardW + cardGap);
    const y = rowY + 39;
    const cx = x + cardW / 2;
    const cy = y + 72;
    const box = 94;
    const points = fit(level.shape, cx, cy, box);
    const d = pathFor(points);
    const clipId = `shape-${chapterIndex + 1}-${levelIndex + 1}`;
    const itemType = level.itemType || 'default';
    const style = itemStyles[itemType] || itemStyles.default;
    const label = itemType.replaceAll('_', ' ');

    svg += `<g>
<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cardW.toFixed(1)}" height="${cardH}" rx="8" fill="url(#card-bg)" stroke="#ffffff" stroke-opacity=".1"/>
<rect x="${(x + 9).toFixed(1)}" y="${(y + 9).toFixed(1)}" width="${(cardW - 18).toFixed(1)}" height="112" rx="7" fill="#1a1a1a" opacity=".92"/>
<rect x="${(x + 9).toFixed(1)}" y="${(y + 9).toFixed(1)}" width="${(cardW - 18).toFixed(1)}" height="112" rx="7" fill="url(#grid)" opacity=".9"/>
<clipPath id="${clipId}"><path d="${d}"/></clipPath>
<path d="${d}" fill="${style.color}" fill-rule="evenodd" stroke="${style.stroke}" stroke-width="4" stroke-linejoin="round" filter="url(#shape-shadow)"/>
${drawFeature(style, itemType, cx, cy, box, clipId, chapterIndex * 10 + levelIndex)}
${drawSliceGuides(cx, cy, box, level, clipId)}
<text x="${cx.toFixed(1)}" y="${(y + 139).toFixed(1)}" text-anchor="middle" class="cell-meta">L${String(levelIndex + 1).padStart(2, '0')}  ${level.targetPieces} pieces  ${level.maxCuts} cuts</text>
<text x="${cx.toFixed(1)}" y="${(y + 158).toFixed(1)}" text-anchor="middle" class="cell-sub">${xml(label)}</text>
</g>\n`;
  });
});

svg += '</svg>\n';

fs.writeFileSync(outputPath, svg, 'utf8');
console.log(`Wrote ${outputPath}`);
