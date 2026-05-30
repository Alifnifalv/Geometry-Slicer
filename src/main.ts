import './style.css';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { MenuScene } from './scenes/MenuScene';
import { TutorialScene } from './scenes/TutorialScene';
import { playablesPlatform } from './playables';

const MAX_DEVICE_PIXEL_RATIO = 3;

function getPixelRatio(): number {
  return Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO));
}

function getContainerSize() {
  const container = document.getElementById('game-container');
  const rect = container?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const cssWidth = Math.max(1, Math.round(rect?.width || viewport?.width || window.innerWidth));
  const cssHeight = Math.max(1, Math.round(rect?.height || viewport?.height || window.innerHeight));
  const pixelRatio = getPixelRatio();

  return {
    cssWidth,
    cssHeight,
    renderWidth: Math.round(cssWidth * pixelRatio),
    renderHeight: Math.round(cssHeight * pixelRatio),
  };
}

function applyHighDpiCanvas(game: Phaser.Game, refreshScale = false) {
  const { cssWidth, cssHeight, renderWidth, renderHeight } = getContainerSize();
  const canvas = game.canvas;

  if (refreshScale && (game.scale.width !== renderWidth || game.scale.height !== renderHeight)) {
    game.scale.resize(renderWidth, renderHeight);
  }

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '100%';
  canvas.style.display = 'block';
  canvas.style.imageRendering = 'auto';

  if (canvas.width !== renderWidth) {
    canvas.width = renderWidth;
  }

  if (canvas.height !== renderHeight) {
    canvas.height = renderHeight;
  }

  game.scale.updateBounds();
  game.scale.displayScale.set(
    game.scale.baseSize.width / game.scale.canvasBounds.width,
    game.scale.baseSize.height / game.scale.canvasBounds.height,
  );
}

function installHighDpiResize(game: Phaser.Game) {
  let resizeFrame = 0;

  const scheduleResize = () => {
    if (resizeFrame) return;

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      applyHighDpiCanvas(game, true);
    });
  };

  game.events.once(Phaser.Core.Events.READY, scheduleResize);
  game.events.on(Phaser.Core.Events.POST_RENDER, () => applyHighDpiCanvas(game));
  window.setTimeout(scheduleResize, 0);
  window.setTimeout(scheduleResize, 250);

  window.addEventListener('resize', scheduleResize, { passive: true });
  window.addEventListener('orientationchange', scheduleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
}

const initialSize = getContainerSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  canvasStyle: [
    'display: block',
    `width: ${initialSize.cssWidth}px`,
    `height: ${initialSize.cssHeight}px`,
    'touch-action: none',
    'image-rendering: auto',
  ].join('; '),
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: initialSize.renderWidth,
    height: initialSize.renderHeight,
    autoRound: true,
  },
  antialias: true,
  antialiasGL: true,
  pixelArt: false,
  roundPixels: false,
  powerPreference: 'high-performance',
  scene: [MenuScene, TutorialScene, MainScene],
};

await playablesPlatform.init();
const game = new Phaser.Game(config);
installHighDpiResize(game);
playablesPlatform.configureRuntime(game);
