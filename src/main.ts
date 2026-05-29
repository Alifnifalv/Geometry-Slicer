import './style.css';
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { MenuScene } from './scenes/MenuScene';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%'
  },
  // @ts-ignore
  resolution: window.devicePixelRatio || 1, // Fix blurry text/graphics on Retina displays
  // @ts-ignore
  autoDensity: true,
  antialias: true, // Ensure smooth lines
  scene: [MenuScene, MainScene]
};

new Phaser.Game(config);
