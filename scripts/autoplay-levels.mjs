import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);
const BASE_URL = process.env.GEOMETRY_SLICER_URL || `http://${HOST}:${PORT}/?autoplay=1`;
const HEADLESS = process.env.HEADED === '0';
const VIEWPORT = { width: 1280, height: 800 };
const ARTIFACT_DIR = resolve('artifacts');
const STRATEGY_LIMIT = Number(process.env.STRATEGY_LIMIT || 3);
const CUT_DELAY_MS = Number(process.env.CUT_DELAY_MS || 35);

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function isReachable(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return;
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startPreviewServer() {
  if (process.env.GEOMETRY_SLICER_URL) return undefined;
  if (await isReachable(BASE_URL)) return undefined;

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const server = spawn(command, ['vite', 'preview', '--host', HOST, '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  server.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(output.trim());
    }
  });

  await waitForServer(BASE_URL);
  return server;
}

function radialStrategy(cuts, phase = 0) {
  return Array.from({ length: cuts }, (_, index) => ({
    angle: phase + (index * Math.PI) / cuts,
    offset: 0,
  }));
}

function stripStrategy(cuts, angle, spacing) {
  const start = -spacing * (cuts - 1) / 2;
  return Array.from({ length: cuts }, (_, index) => ({
    angle,
    offset: start + spacing * index,
  }));
}

function uniqStrategies(strategies) {
  const seen = new Set();
  return strategies.filter((strategy) => {
    const key = JSON.stringify(strategy.map((cut) => [
      Number(cut.angle.toFixed(5)),
      Number((cut.offset || 0).toFixed(5)),
    ]));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getStrategies(level) {
  const strategies = [];
  const targetCuts = Math.floor(level.targetPieces / 2);
  const phases = [0, Math.PI / (level.targetPieces || 2), Math.PI / 12, -Math.PI / 12];

  if (level.targetPieces % 2 === 0 && targetCuts <= level.maxCuts) {
    for (const phase of phases) strategies.push(radialStrategy(targetCuts, phase));
  }

  if (level.targetPieces === 2) {
    strategies.push(
      [{ angle: 0, offset: 0 }],
      [{ angle: Math.PI / 2, offset: 0 }],
      [{ angle: Math.PI / 4, offset: 0 }],
      [{ angle: -Math.PI / 4, offset: 0 }],
    );
  }

  if (level.targetPieces === 3) {
    for (const spacing of [0.1, 0.12, 0.14, 0.16]) {
      strategies.push(stripStrategy(2, Math.PI / 2, spacing));
      strategies.push(stripStrategy(2, 0, spacing));
    }
  }

  if (level.targetPieces === 4) {
    strategies.push(
      [{ angle: 0, offset: 0 }, { angle: Math.PI / 2, offset: 0 }],
      [{ angle: Math.PI / 4, offset: 0 }, { angle: -Math.PI / 4, offset: 0 }],
      stripStrategy(3, Math.PI / 2, 0.16),
      stripStrategy(3, 0, 0.16),
    );
  }

  if (level.targetPieces === 6) {
    for (const phase of [0, Math.PI / 6, Math.PI / 12]) {
      strategies.push(radialStrategy(3, phase));
    }
    strategies.push(
      [{ angle: 0, offset: 0 }, { angle: Math.PI / 3, offset: 0 }, { angle: -Math.PI / 3, offset: 0 }],
      [{ angle: Math.PI / 2, offset: 0 }, { angle: Math.PI / 6, offset: 0 }, { angle: -Math.PI / 6, offset: 0 }],
    );
  }

  if (level.targetPieces === 8) {
    for (const phase of [0, Math.PI / 8, Math.PI / 16]) {
      strategies.push(radialStrategy(4, phase));
    }
    strategies.push(
      [{ angle: 0, offset: 0 }, { angle: Math.PI / 2, offset: 0 }, { angle: Math.PI / 4, offset: 0 }, { angle: -Math.PI / 4, offset: 0 }],
      [{ angle: 0, offset: 0 }, { angle: Math.PI / 2, offset: 0 }, { angle: Math.PI / 3, offset: 0 }, { angle: -Math.PI / 3, offset: 0 }],
    );
  }

  if (level.targetPieces === 10) {
    for (const phase of [0, Math.PI / 10, Math.PI / 20]) {
      strategies.push(radialStrategy(5, phase));
    }
  }

  if (level.targetPieces === 12) {
    for (const phase of [0, Math.PI / 12, Math.PI / 24]) {
      strategies.push(radialStrategy(6, phase));
    }
  }

  return uniqStrategies(strategies).filter((strategy) => strategy.length <= level.maxCuts);
}

async function dragCut(page, cut) {
  const points = await page.evaluate(({ angle, offset }) => {
    return window.__geometrySlicerTest.getCutPoints(angle, offset);
  }, cut);

  await page.mouse.move(points.start.x, points.start.y);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(
      points.start.x + (points.end.x - points.start.x) * t,
      points.start.y + (points.end.y - points.start.y) * t,
    );
  }
  await page.mouse.up();
  await sleep(CUT_DELAY_MS);
}

async function playStrategy(page, chapterIndex, levelIndex, strategy) {
  await page.evaluate(({ chapter, level }) => {
    return window.__geometrySlicerTest.startLevel(chapter, level);
  }, { chapter: chapterIndex, level: levelIndex });

  await sleep(25);
  for (const cut of strategy) {
    const beforeCut = await page.evaluate(() => window.__geometrySlicerTest.getState());
    if (beforeCut.outcome !== 'playing' || beforeCut.cutsRemaining <= 0) break;
    await dragCut(page, cut);
  }

  await sleep(50);
  return page.evaluate(() => window.__geometrySlicerTest.getState());
}

async function writeReport(report) {
  await writeFile(resolve(ARTIFACT_DIR, 'autoplay-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(ARTIFACT_DIR, 'autoplay-report.md'), formatMarkdownReport(report));
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const server = await startPreviewServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__geometrySlicerTest, null, { timeout: 10000 });

    const chapters = await page.evaluate(() => window.__geometrySlicerTest.chapters);
    const results = [];
    const report = {
      url: BASE_URL,
      viewport: VIEWPORT,
      strategyLimit: STRATEGY_LIMIT,
      generatedAt: new Date().toISOString(),
      total: 0,
      passed: 0,
      failed: 0,
      results,
    };

    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      for (let levelIndex = 0; levelIndex < chapters[chapterIndex].levels; levelIndex++) {
        const level = await page.evaluate(({ chapter, level }) => {
          return window.__geometrySlicerTest.startLevel(chapter, level);
        }, { chapter: chapterIndex, level: levelIndex });

        const strategies = getStrategies(level).slice(0, STRATEGY_LIMIT);
        let bestState = level;
        let bestStrategy = null;

        for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
          const strategy = strategies[strategyIndex];
          const state = await playStrategy(page, chapterIndex, levelIndex, strategy);
          const isBetter =
            !bestState.evaluation ||
            (state.evaluation && state.evaluation.accuracy > bestState.evaluation.accuracy) ||
            state.outcome === 'success';

          if (isBetter) {
            bestState = state;
            bestStrategy = strategy;
          }

          if (state.outcome === 'success') break;
        }

        const passed = bestState.outcome === 'success';
        const lastResult = bestState.lastResult;
        const evaluation = bestState.evaluation;
        results.push({
          chapter: chapterIndex + 1,
          chapterName: chapters[chapterIndex].name,
          level: levelIndex + 1,
          targetPieces: level.targetPieces,
          maxCuts: level.maxCuts,
          tolerance: Number(level.tolerance.toFixed(4)),
          passed,
          pieces: bestState.pieces,
          cutsUsed: bestState.cutsUsed,
          accuracy: Number(((lastResult?.accuracy ?? evaluation?.accuracy ?? 0)).toFixed(2)),
          grade: lastResult?.grade ?? evaluation?.grade ?? 'Uncleared',
          feedback: lastResult?.feedback ?? evaluation?.feedback ?? 'No evaluation',
          strategy: bestStrategy?.map((cut) => ({
            angle: Number(cut.angle.toFixed(4)),
            offset: Number((cut.offset || 0).toFixed(4)),
          })) ?? [],
        });

        const status = passed ? 'PASS' : 'FAIL';
        const result = results.at(-1);
        console.log(`${status} C${result.chapter} L${result.level}: ${result.accuracy}% ${result.feedback}`);

        report.total = results.length;
        report.passed = results.filter((item) => item.passed).length;
        report.failed = results.length - report.passed;
        await writeReport(report);
      }
    }

    const passed = results.filter((result) => result.passed).length;
    const failed = results.length - passed;
    report.generatedAt = new Date().toISOString();
    report.total = results.length;
    report.passed = passed;
    report.failed = failed;

    await writeReport(report);
    await page.screenshot({ path: resolve(ARTIFACT_DIR, 'autoplay-final.png'), fullPage: false });

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill();
    }
  }
}

function formatMarkdownReport(report) {
  const lines = [
    '# Geometry Slicer Autoplay Report',
    '',
    `- URL: ${report.url}`,
    `- Viewport: ${report.viewport.width}x${report.viewport.height}`,
    `- Generated: ${report.generatedAt}`,
    `- Passed: ${report.passed} / ${report.total}`,
    `- Failed: ${report.failed}`,
    '',
    '| Level | Target | Cuts | Result | Accuracy | Feedback |',
    '| --- | ---: | ---: | --- | ---: | --- |',
  ];

  for (const result of report.results) {
    const label = `C${result.chapter} L${result.level}`;
    const status = result.passed ? 'PASS' : 'FAIL';
    lines.push(`| ${label} | ${result.targetPieces} | ${result.maxCuts} | ${status} | ${result.accuracy}% | ${result.feedback.replaceAll('|', '/')} |`);
  }

  lines.push('');
  return lines.join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
