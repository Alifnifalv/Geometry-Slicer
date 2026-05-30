import { Chapters } from '../src/LevelData';
import * as fs from 'fs';
import * as path from 'path';

const cellWidth = 120;
const cellHeight = 150;
const padding = 20;
const width = 10 * cellWidth + padding * 2;
const height = 10 * cellHeight + padding * 2;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color:#1a1a1a; font-family: sans-serif;">\n`;
svg += `<style>
  .title { fill: #fff; font-size: 16px; font-weight: bold; }
  .text { fill: #ccc; font-size: 12px; text-anchor: middle; }
  .shape { fill: #4488ff; stroke: #fff; stroke-width: 2px; }
</style>\n`;

Chapters.forEach((chapter, row) => {
  const yOffset = padding + row * cellHeight;
  const safeName = chapter.name.replace(/&/g, '&amp;');
  svg += `<text x="${padding}" y="${yOffset + 20}" class="title">Chapter ${row + 1}: ${safeName}</text>\n`;
  
  chapter.levels.forEach((level, col) => {
    const xOffset = padding + col * cellWidth + cellWidth / 2;
    const cy = yOffset + 80;
    
    const scale = 50;
    const points = level.shape.map(p => `${xOffset + p[0]*scale},${cy + p[1]*scale}`).join(' ');
    
    svg += `<polygon points="${points}" class="shape" />\n`;
    svg += `<text x="${xOffset}" y="${cy + scale + 25}" class="text">Cuts: ${level.maxCuts}</text>\n`;
  });
});

svg += `</svg>`;

const outPath = path.resolve(process.cwd(), 'level_map.svg');
fs.writeFileSync(outPath, svg);
console.log('Saved to', outPath);
