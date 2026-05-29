import Phaser from 'phaser';
import { playablesPlatform } from '../playables';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Container;
  private playButtonBg!: Phaser.GameObjects.Graphics;
  private playButtonText!: Phaser.GameObjects.Text;
  private newGameButton?: Phaser.GameObjects.Container;
  private newGameButtonBg?: Phaser.GameObjects.Graphics;
  private newGameButtonText?: Phaser.GameObjects.Text;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private rotationAngle = 0;

  constructor() {
    super('MenuScene');
  }

  create() {
    this.bgGraphics = this.add.graphics();

    this.titleText = this.add.text(0, 0, 'GEOMETRY SLICER', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#4488ff',
      strokeThickness: 6
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(0, 0, 'Slice shapes. Match areas. Think precisely.', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    const hasProgress = playablesPlatform.hasProgress();

    // Play Button Container
    this.playButton = this.add.container(0, 0);
    this.playButtonBg = this.add.graphics();
    this.playButtonText = this.add.text(0, 0, hasProgress ? 'CONTINUE' : 'PLAY', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.playButton.add([this.playButtonBg, this.playButtonText]);
    
    const zone = this.add.zone(0, 0, 200, 80).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.playButton.add(zone);

    zone.on('pointerdown', () => this.playButton.setScale(0.95));
    zone.on('pointerup', () => {
      this.playButton.setScale(1);
      this.scene.start('MainScene');
    });
    zone.on('pointerout', () => this.playButton.setScale(1));

    if (hasProgress) {
      this.newGameButton = this.add.container(0, 0);
      this.newGameButtonBg = this.add.graphics();
      this.newGameButtonText = this.add.text(0, 0, 'NEW GAME', {
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      this.newGameButton.add([this.newGameButtonBg!, this.newGameButtonText]);
      const newZone = this.add.zone(0, 0, 200, 60).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.newGameButton.add(newZone);

      newZone.on('pointerdown', () => this.newGameButton!.setScale(0.95));
      newZone.on('pointerup', () => {
        this.newGameButton!.setScale(1);
        void playablesPlatform.resetProgress();
        this.scene.start('MainScene');
      });
      newZone.on('pointerout', () => this.newGameButton!.setScale(1));
    }

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);
    playablesPlatform.notifyFirstFrameReady();
    playablesPlatform.notifyGameReady();
  }

  update() {
    this.rotationAngle += 0.005;
    this.drawBackground();
  }

  private drawBackground() {
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.4;

    this.bgGraphics.clear();
    this.bgGraphics.lineStyle(2, 0x4488ff, 0.2);

    // Draw some rotating geometry for visual flair
    for (let i = 0; i < 3; i++) {
      this.bgGraphics.save();
      this.bgGraphics.translateCanvas(cx, cy);
      this.bgGraphics.rotateCanvas(this.rotationAngle * (i + 1));
      this.bgGraphics.strokeRect(-radius / 2, -radius / 2, radius, radius);
      this.bgGraphics.restore();
    }
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;
    const cx = width / 2;

    const baseScale = Math.min(width, height);

    this.titleText.setFontSize(Math.max(24, baseScale * 0.08));
    this.titleText.setPosition(cx, height * 0.3);

    this.subtitleText.setFontSize(Math.max(12, baseScale * 0.03));
    this.subtitleText.setPosition(cx, height * 0.4);

    this.playButton.setPosition(cx, height * 0.65);
    
    // Draw Button BG
    this.playButtonBg.clear();
    this.playButtonBg.fillStyle(0x4488ff, 1);
    this.playButtonBg.fillRoundedRect(-100, -40, 200, 80, 16);
    this.playButtonText.setFontSize(Math.max(20, baseScale * 0.05));

    if (this.newGameButton && this.newGameButtonBg && this.newGameButtonText) {
      this.newGameButton.setPosition(cx, height * 0.80);
      this.newGameButtonBg.clear();
      this.newGameButtonBg.lineStyle(2, 0xff4444, 0.8);
      this.newGameButtonBg.strokeRoundedRect(-100, -30, 200, 60, 12);
      this.newGameButtonText.setFontSize(Math.max(16, baseScale * 0.04));
    }
    
    // Re-draw background immediately on resize
    this.drawBackground();
  }
}
