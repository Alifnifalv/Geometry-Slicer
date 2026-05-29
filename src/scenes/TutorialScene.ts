import Phaser from 'phaser';
import { playablesPlatform } from '../playables';
import { soundManager } from '../SoundManager';

const STEPS = [
  {
    title: 'Cut Through The Center',
    body: 'Start with clean slices through the center point.',
  },
  {
    title: 'Match Equal Areas',
    body: 'Every final piece should be close to the same size.',
  },
  {
    title: 'Spend Cuts Carefully',
    body: 'You only lose a cut when the shape is actually sliced.',
  },
];

export class TutorialScene extends Phaser.Scene {
  private stepIndex = 0;
  private bg!: Phaser.GameObjects.Graphics;
  private shape!: Phaser.GameObjects.Graphics;
  private guide!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private button!: Phaser.GameObjects.Container;
  private buttonBg!: Phaser.GameObjects.Graphics;
  private buttonText!: Phaser.GameObjects.Text;
  private skipText!: Phaser.GameObjects.Text;
  private centerX = 0;
  private centerY = 0;
  private baseScale = 1;

  constructor() {
    super('TutorialScene');
  }

  create() {
    this.bg = this.add.graphics();
    this.shape = this.add.graphics();
    this.guide = this.add.graphics();

    this.titleText = this.add.text(0, 0, '', {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.bodyText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: '#d8e4ff',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    this.progressText = this.add.text(0, 0, '', {
      fontSize: '14px',
      color: '#8fb4ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.button = this.add.container(0, 0);
    this.buttonBg = this.add.graphics();
    this.buttonText = this.add.text(0, 0, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.button.add([this.buttonBg, this.buttonText]);
    const buttonZone = this.add.zone(0, 0, 220, 72).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.button.add(buttonZone);

    buttonZone.on('pointerdown', () => {
      soundManager.init();
      this.button.setScale(0.96);
    });
    buttonZone.on('pointerup', () => {
      soundManager.playClickSound();
      this.button.setScale(1);
      void this.nextStep();
    });
    buttonZone.on('pointerout', () => this.button.setScale(1));

    this.skipText = this.add.text(0, 0, 'SKIP', {
      fontSize: '16px',
      color: '#9aa7b8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.skipText.on('pointerup', () => {
      soundManager.playClickSound();
      void this.finishTutorial();
    });

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);
    this.renderStep();
  }

  private async nextStep() {
    if (this.stepIndex >= STEPS.length - 1) {
      await this.finishTutorial();
      return;
    }

    this.stepIndex++;
    this.renderStep();
  }

  private async finishTutorial() {
    await playablesPlatform.markTutorialCompleted();
    this.scene.start('MainScene');
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.centerX = width / 2;
    this.centerY = height / 2;
    this.baseScale = Math.min(width, height);

    this.bg.clear();
    this.bg.fillStyle(0x10131c, 1);
    this.bg.fillRect(0, 0, width, height);
    this.bg.lineStyle(1, 0x25314d, 0.8);
    for (let x = 0; x <= width; x += 40) this.bg.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 40) this.bg.lineBetween(0, y, width, y);

    this.titleText.setFontSize(Math.max(28, this.baseScale * 0.06));
    this.titleText.setPosition(this.centerX, height * 0.16);
    this.bodyText.setFontSize(Math.max(15, this.baseScale * 0.033));
    this.bodyText.setWordWrapWidth(width * 0.78);
    this.bodyText.setPosition(this.centerX, height * 0.76);
    this.progressText.setPosition(this.centerX, height * 0.88);
    this.button.setPosition(this.centerX, height * 0.66);
    this.skipText.setPosition(width - 50, 34);

    this.drawButton();
    this.drawExample();
  }

  private renderStep() {
    const step = STEPS[this.stepIndex];
    this.titleText.setText(step.title);
    this.bodyText.setText(step.body);
    this.progressText.setText(`${this.stepIndex + 1} / ${STEPS.length}`);
    this.buttonText.setText(this.stepIndex === STEPS.length - 1 ? 'START' : 'NEXT');
    this.drawButton();
    this.drawExample();
  }

  private drawButton() {
    this.buttonBg.clear();
    this.buttonBg.fillStyle(0x4488ff, 1);
    this.buttonBg.fillRoundedRect(-110, -36, 220, 72, 18);
    this.buttonBg.lineStyle(3, 0xffffff, 0.28);
    this.buttonBg.strokeRoundedRect(-110, -36, 220, 72, 18);
  }

  private drawExample() {
    const radius = Math.min(150, this.baseScale * 0.22);
    const cy = this.centerY * 0.86;

    this.shape.clear();
    this.guide.clear();

    this.shape.fillStyle(0x4488ff, 1);
    this.shape.lineStyle(4, 0xffffff, 0.9);

    if (this.stepIndex === 1) {
      this.shape.fillCircle(this.centerX, cy, radius);
      this.shape.strokeCircle(this.centerX, cy, radius);
      this.shape.lineStyle(2, 0xb9d0ff, 0.8);
      this.shape.lineBetween(this.centerX - radius, cy, this.centerX + radius, cy);
      this.shape.lineBetween(this.centerX, cy - radius, this.centerX, cy + radius);
    } else if (this.stepIndex === 2) {
      this.shape.fillRoundedRect(this.centerX - radius * 1.2, cy - radius * 0.7, radius * 2.4, radius * 1.4, 14);
      this.shape.strokeRoundedRect(this.centerX - radius * 1.2, cy - radius * 0.7, radius * 2.4, radius * 1.4, 14);
      this.shape.lineStyle(3, 0xb9d0ff, 0.8);
      this.shape.lineBetween(this.centerX - radius * 0.4, cy - radius * 0.7, this.centerX - radius * 0.4, cy + radius * 0.7);
      this.shape.lineBetween(this.centerX + radius * 0.4, cy - radius * 0.7, this.centerX + radius * 0.4, cy + radius * 0.7);
    } else {
      this.shape.fillTriangle(this.centerX, cy - radius, this.centerX - radius, cy + radius, this.centerX + radius, cy + radius);
      this.shape.strokeTriangle(this.centerX, cy - radius, this.centerX - radius, cy + radius, this.centerX + radius, cy + radius);
    }

    this.shape.fillStyle(0xffffff, 0.95);
    this.shape.fillCircle(this.centerX, cy, Math.max(4, radius * 0.04));

    const lineLength = radius * 1.55;
    const fromX = this.centerX - lineLength;
    const toX = this.centerX + lineLength;
    const y = cy;
    this.guide.lineStyle(5, 0xffffff, 0.95);
    this.guide.lineBetween(fromX, y, toX, y);
    this.guide.fillStyle(0x00ff99, 1);
    this.guide.fillCircle(fromX, y, 8);
    this.guide.fillCircle(toX, y, 8);

    this.tweens.killTweensOf(this.guide);
    this.guide.setAlpha(0.15);
    this.tweens.add({
      targets: this.guide,
      alpha: 1,
      yoyo: true,
      repeat: -1,
      duration: 650,
      ease: 'Sine.easeInOut',
    });
  }
}
