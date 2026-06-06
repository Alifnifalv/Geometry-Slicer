import Phaser from 'phaser';
import { GeometryManager } from '../GeometryManager';
import { Chapters } from '../LevelData';
import type { ItemType } from '../LevelData';
import { playablesPlatform } from '../playables';
import { soundManager } from '../SoundManager';

interface ShapePiece {
  region: number[][]; // Polygon vertices in relative world space (e.g., -0.5 to 0.5)
  color: number;
  itemType?: ItemType;
  offsetX: number; // Relative offset
  offsetY: number; // Relative offset
  alpha: number;
  scale: number;
}

interface MainSceneData {
  chapter?: number;
  level?: number;
}

interface LevelEvaluation {
  areas: number[];
  totalPixelArea: number;
  targetArea: number;
  targetPercent: number;
  maxDiff: number;
  largestPercent: number;
  smallestPercent: number;
  isPieceCountCorrect: boolean;
  isSuccess: boolean;
  accuracy: number;
  grade: string;
  feedback: string;
}

type TestOutcome = 'playing' | 'success' | 'failure';

interface TestCutPoints {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface TestLevelResult {
  outcome: TestOutcome;
  chapter: number;
  level: number;
  accuracy: number;
  grade: string;
  feedback: string;
}

interface TestLevelState {
  chapter: number;
  level: number;
  chapterName: string;
  targetPieces: number;
  maxCuts: number;
  tolerance: number;
  cutsRemaining: number;
  cutsUsed: number;
  pieces: number;
  outcome: TestOutcome;
  evaluation: LevelEvaluation | null;
  lastResult: TestLevelResult | null;
  viewport: { width: number; height: number };
}

declare global {
  interface Window {
    __geometrySlicerTest?: {
      totalLevels: number;
      chapters: { name: string; levels: number }[];
      startLevel: (chapter: number, level: number) => TestLevelState;
      getState: () => TestLevelState;
      getCutPoints: (angle: number, offset?: number, length?: number) => TestCutPoints;
    };
  }
}

export class MainScene extends Phaser.Scene {
  private pieces: ShapePiece[] = [];
  private isDragging = false;
  private startPoint = { x: 0, y: 0 };
  private endPoint = { x: 0, y: 0 };
  private graphics!: Phaser.GameObjects.Graphics;
  private pieceGraphicsPool: Phaser.GameObjects.Graphics[] = [];
  private maskGraphicsPool: Phaser.GameObjects.Graphics[] = [];
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private uiText!: Phaser.GameObjects.Text;
  private uiTextBg!: Phaser.GameObjects.Graphics;
  private percentageTexts: Phaser.GameObjects.Text[] = [];

  private tutorialGraphics!: Phaser.GameObjects.Graphics;
  private tutorialTween!: Phaser.Tweens.Tween;
  private sliceTrail!: Phaser.GameObjects.Graphics;
  private trailPoints: {x: number, y: number, alpha: number}[] = [];

  private btnMenu!: Phaser.GameObjects.Container;
  private btnRestart!: Phaser.GameObjects.Container;
  private btnHint!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Graphics;
  private bgGrid!: Phaser.GameObjects.Grid;

  private hintModal!: Phaser.GameObjects.Container;
  private hintModalBg!: Phaser.GameObjects.Graphics;
  private hintModalGraph!: Phaser.GameObjects.Graphics;
  private hintModalText!: Phaser.GameObjects.Text;
  private hintModalClose!: Phaser.GameObjects.Container;

  private baseScale = 1;
  private centerX = 0;
  private centerY = 0;

  private currentChapterIndex = 0;
  private currentLevelIndex = 0;
  private cutsRemaining = 0;
  private cutsUsedThisLevel = 0;
  private isLevelTransitioning = false;
  private testOutcome: TestOutcome = 'playing';
  private testLastResult: TestLevelResult | null = null;

  constructor() {
    super('MainScene');
  }

  init(data: MainSceneData = {}) {
    const progress = playablesPlatform.getProgress();
    this.currentChapterIndex = this.clampChapterIndex(data.chapter ?? progress.chapter);
    this.currentLevelIndex = this.clampLevelIndex(this.currentChapterIndex, data.level ?? progress.level);
  }

  private px(value: number): number {
    return value * Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
  }

  private clampChapterIndex(chapterIndex: number): number {
    if (Chapters.length === 0) return 0;
    return Phaser.Math.Clamp(Math.floor(chapterIndex), 0, Chapters.length - 1);
  }

  private clampLevelIndex(chapterIndex: number, levelIndex: number): number {
    const levels = Chapters[chapterIndex]?.levels.length ?? 1;
    return Phaser.Math.Clamp(Math.floor(levelIndex), 0, Math.max(0, levels - 1));
  }

  create() {
    // Subtle background grid
    this.bgGrid = this.add.grid(0, 0, 800, 800, 40, 40, 0x1a1a1a, 1, 0x333333, 0.5).setOrigin(0.5);

    this.graphics = this.add.graphics();
    this.sliceTrail = this.add.graphics().setDepth(100);
    this.uiGraphics = this.add.graphics().setDepth(101);
    this.tutorialGraphics = this.add.graphics().setDepth(102);

    const pixelGraphics = this.add.graphics();
    pixelGraphics.setVisible(false);
    pixelGraphics.fillStyle(0xffffff, 1);
    pixelGraphics.fillRect(0, 0, 8, 8);
    pixelGraphics.generateTexture('particle', 8, 8);
    pixelGraphics.destroy();

    this.popupBg = this.add.graphics().setDepth(110);
    this.messageText = this.add.text(0, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setDepth(111);

    this.uiTextBg = this.add.graphics().setDepth(112);
    this.uiText = this.add.text(0, 0, ' ', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      lineSpacing: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(113);

    this.createButtons();
    this.createMathHintModal();

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);

    this.initLevel();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.installTestHarness();
  }

  private createButtons() {
    // Helper for polished buttons
    const createBtn = (text: string, color: number) => {
      const width = this.px(100);
      const height = this.px(40);
      const radius = this.px(20);
      const container = this.add.container(0, 0);
      // Drop shadow
      const shadow = this.add.graphics().fillStyle(0x000000, 0.4).fillRoundedRect(-width / 2 + this.px(2), -height / 2 + this.px(2), width - this.px(4), height - this.px(4), radius - this.px(2));
      const bg = this.add.graphics().fillStyle(color, 1).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
      bg.lineStyle(this.px(2), 0xffffff, 0.3).strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
      const txt = this.add.text(0, 0, text, { fontSize: `${this.px(14)}px`, color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      container.add([shadow, bg, txt]);
      container.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains
      });
      container.setDepth(120); // Make sure buttons are above everything else
      return container;
    };

    this.btnMenu = createBtn('MENU', 0x444455);
    this.btnHint = createBtn('💡 HINT', 0x3399ff);
    this.btnRestart = createBtn('RESTART', 0xffa500);

    this.btnMenu.on('pointerdown', () => {
      soundManager.init();
      this.btnMenu.setScale(0.9);
    });
    this.btnMenu.on('pointerup', () => {
      soundManager.playClickSound();
      this.btnMenu.setScale(1);
      this.scene.start('MenuScene');
    });
    this.btnMenu.on('pointerout', () => this.btnMenu.setScale(1));

    this.btnRestart.on('pointerdown', () => {
      soundManager.init();
      this.btnRestart.setScale(0.9);
    });
    this.btnRestart.on('pointerup', () => {
      soundManager.playClickSound();
      playablesPlatform.trackEvent('restart');
      void playablesPlatform.saveAnalytics();
      this.btnRestart.setScale(1);
      this.initLevel();
    });
    this.btnRestart.on('pointerout', () => this.btnRestart.setScale(1));

    this.btnHint.on('pointerdown', () => {
      soundManager.init();
      this.btnHint.setScale(0.9);
    });
    this.btnHint.on('pointerup', () => {
      soundManager.playClickSound();
      this.btnHint.setScale(1);
      const chapter = Chapters[this.currentChapterIndex];
      const level = chapter.levels[this.currentLevelIndex];

      if (level.hintGraph) {
        this.showMathHintModal(level.hintGraph, level.mathHint);
      } else if (level.mathHint) {
        this.showPopup(level.mathHint, '#00ffff', 4000);
      }
    });
    this.btnHint.on('pointerout', () => this.btnHint.setScale(1));
  }

  private createMathHintModal() {
    this.hintModal = this.add.container(0, 0);
    this.hintModal.setVisible(false);
    this.hintModal.setDepth(100);

    const overlay = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.7);
    overlay.setInteractive(); // Block clicks to game behind

    this.hintModalBg = this.add.graphics();
    this.hintModalGraph = this.add.graphics();

    this.hintModalText = this.add.text(0, 0, '', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    const btnWidth = this.px(100);
    const btnHeight = this.px(40);
    this.hintModalClose = this.add.container(0, 0);
    const closeBg = this.add.graphics().fillStyle(0xff3333, 1).fillRoundedRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, this.px(10));
    const closeTxt = this.add.text(0, 0, 'CLOSE', { fontSize: `${this.px(16)}px`, color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const closeZone = this.add.zone(0, 0, btnWidth, btnHeight).setInteractive({useHandCursor:true}).setOrigin(0.5);
    closeZone.on('pointerdown', () => this.hideMathHintModal());
    this.hintModalClose.add([closeBg, closeTxt, closeZone]);

    this.hintModal.add([overlay, this.hintModalBg, this.hintModalGraph, this.hintModalText, this.hintModalClose]);
  }

  private hideMathHintModal() {
    soundManager.playClickSound();
    this.hintModal.setVisible(false);
  }

  private showMathHintModal(hintGraph: string, text?: string) {
    this.hintModal.setVisible(true);
    this.isDragging = false;

    const cw = this.scale.gameSize.width;
    const ch = this.scale.gameSize.height;

    this.hintModal.setPosition(cw / 2, ch / 2);

    const panelWidth = Math.min(cw * 0.9, 400);
    const panelHeight = Math.min(ch * 0.8, 500);

    this.hintModalBg.clear();
    this.hintModalBg.fillStyle(0xffffff, 1);
    this.hintModalBg.lineStyle(4, 0x22aaff, 1);
    this.hintModalBg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
    this.hintModalBg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);

    this.hintModalText.setText(text || '');
    this.hintModalText.setWordWrapWidth(panelWidth - 40);
    this.hintModalText.setPosition(0, panelHeight/2 - 90);
    this.hintModalClose.setPosition(0, panelHeight/2 - 30);

    // Draw the graph
    this.hintModalGraph.clear();
    const g = this.hintModalGraph;
    const radius = Math.min(panelWidth, panelHeight) * 0.35;
    const cy = -50;

    if (hintGraph === 'circle-parallel') {
        // Pizza circle
        g.fillStyle(0xffcc77, 1);
        g.lineStyle(4, 0xd28c47, 1);
        g.fillCircle(0, cy, radius);
        g.strokeCircle(0, cy, radius);

        // 2 parallel lines
        const d = radius * 0.265;
        g.lineStyle(3, 0xcc3333, 1);
        // To draw dashed lines, phaser Graphics doesn't have setLineDash natively.
        // We'll just draw solid lines for simplicity, or manually draw dashes.
        // Let's use solid lines.
        g.beginPath(); g.moveTo(-d, cy - radius - 30); g.lineTo(-d, cy + radius + 30); g.strokePath();
        g.beginPath(); g.moveTo(d, cy - radius - 30); g.lineTo(d, cy + radius + 30); g.strokePath();

        // Center dot
        g.fillStyle(0x000000, 1);
        g.fillCircle(0, cy, 6);

        // Arrows representing 0.265R
        g.lineStyle(2, 0x000000, 1);
        g.beginPath(); g.moveTo(0, cy); g.lineTo(d, cy); g.strokePath();
        g.beginPath(); g.moveTo(0, cy); g.lineTo(-d, cy); g.strokePath();

        // Triangle arrow heads
        g.fillStyle(0x000000, 1);
        g.fillTriangle(d, cy, d-8, cy-5, d-8, cy+5);
        g.fillTriangle(-d, cy, -d+8, cy-5, -d+8, cy+5);

    } else if (hintGraph === 'circle-vcut') {
        // Pizza circle
        g.fillStyle(0xffcc77, 1);
        g.lineStyle(4, 0xd28c47, 1);
        g.fillCircle(0, cy, radius);
        g.strokeCircle(0, cy, radius);

        // V-cut
        g.lineStyle(3, 0xcc3333, 1);
        const bottomY = cy + radius;
        g.beginPath(); g.moveTo(0, bottomY); g.lineTo(-radius*1.2, cy - radius*0.5); g.strokePath();
        g.beginPath(); g.moveTo(0, bottomY); g.lineTo(radius*1.2, cy - radius*0.5); g.strokePath();

        // Intersection Point
        g.fillStyle(0xcc3333, 1);
        g.fillCircle(0, bottomY, 8);

    } else if (hintGraph === 'rectangle-thirds') {
        // Wood rectangle
        g.fillStyle(0xc19a6b, 1);
        g.lineStyle(4, 0xa07a4b, 1);
        g.fillRect(-radius, cy - radius*0.6, radius*2, radius*1.2);
        g.strokeRect(-radius, cy - radius*0.6, radius*2, radius*1.2);

        // parallel lines
        const d = radius * 0.333; // 1/6 of total width = 1/3 of half width
        g.lineStyle(3, 0x3333cc, 1);
        g.beginPath(); g.moveTo(-d, cy - radius); g.lineTo(-d, cy + radius); g.strokePath();
        g.beginPath(); g.moveTo(d, cy - radius); g.lineTo(d, cy + radius); g.strokePath();

        g.fillStyle(0x000000, 1);
        g.fillCircle(0, cy, 6);
    }
  }

  private initLevel() {
    this.isLevelTransitioning = false;
    this.testOutcome = 'playing';
    this.testLastResult = null;
    this.percentageTexts.forEach(t => t.destroy());
    this.percentageTexts = [];

    if (this.currentChapterIndex >= Chapters.length) {
      this.showPopup('You beat the entire game!', '#ffff00');
      this.uiText.setText('');
      this.pieces = [];
      this.drawPieces();
      return;
    }

    const chapter = Chapters[this.currentChapterIndex];
    const level = chapter.levels[this.currentLevelIndex];
    this.cutsRemaining = level.maxCuts;
    this.cutsUsedThisLevel = 0;

    this.btnHint.setVisible(!!level.mathHint);
    void playablesPlatform.recordAttempt(this.currentChapterIndex, this.currentLevelIndex);

    const baseColor = this.getItemStyle(level.itemType).color;

    this.pieces = [{
      region: level.shape,
      color: baseColor,
      itemType: level.itemType,
      offsetX: 0,
      offsetY: 0,
      alpha: 1,
      scale: 0 // Start small for animation
    }];

    this.tweens.add({
      targets: this.pieces,
      scale: 1,
      ease: 'Back.easeOut',
      duration: 600,
      onUpdate: () => this.drawPieces()
    });

    this.updateHUD();

    if (this.currentChapterIndex === 0 && this.currentLevelIndex === 0) {
      this.showPopup('Tutorial: Swipe twice to make 3 pieces', '#ffffff');
      this.startInteractiveTutorial();
    } else {
      this.showPopup(this.getLevelInstruction(), '#ffffff');
    }

    this.drawPieces();
  }

  private startInteractiveTutorial() {
    if (this.tutorialTween) this.tutorialTween.remove();
    this.tutorialGraphics.clear();
    this.tutorialGraphics.setAlpha(1);

    const fromY = this.centerY - this.baseScale * 0.4;
    const toY = this.centerY + this.baseScale * 0.4;

    this.tutorialTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1800,
      repeat: -1,
      onUpdate: (tween) => {
        const v = tween.getValue() as number;
        this.tutorialGraphics.clear();
        this.tutorialGraphics.lineStyle(Math.max(4, this.baseScale * 0.015), 0x00ff99, 0.8);

        // Two parallel cuts for 3 pieces
        const xOffset = this.baseScale * 0.266;

        // Draw dashed guides
        for(let y = fromY; y < toY; y += 20) {
          this.tutorialGraphics.lineBetween(this.centerX - xOffset, y, this.centerX - xOffset, y + 10);
          this.tutorialGraphics.lineBetween(this.centerX + xOffset, y, this.centerX + xOffset, y + 10);
        }

        // Draw moving "fingers"
        const currentY = fromY + (toY - fromY) * v;
        this.tutorialGraphics.fillStyle(0xffffff, Math.max(0, 1 - v * 1.5));
        this.tutorialGraphics.fillCircle(this.centerX - xOffset, currentY, Math.max(8, this.baseScale * 0.025));
        this.tutorialGraphics.fillCircle(this.centerX + xOffset, currentY, Math.max(8, this.baseScale * 0.025));
      }
    });
  }

  private isAutoplayMode(): boolean {
    return new URLSearchParams(window.location.search).has('autoplay');
  }

  private installTestHarness() {
    if (!this.isAutoplayMode()) return;

    window.__geometrySlicerTest = {
      totalLevels: Chapters.reduce((total, chapter) => total + chapter.levels.length, 0),
      chapters: Chapters.map(chapter => ({ name: chapter.name, levels: chapter.levels.length })),
      startLevel: (chapter: number, level: number) => {
        this.time.removeAllEvents();
        this.tweens.killAll();
        this.currentChapterIndex = this.clampChapterIndex(chapter);
        this.currentLevelIndex = this.clampLevelIndex(this.currentChapterIndex, level);
        this.initLevel();
        return this.getTestState();
      },
      getState: () => this.getTestState(),
      getCutPoints: (angle: number, offset = 0, length = 0.68) => this.getTestCutPoints(angle, offset, length),
    };
  }

  private getTestState(): TestLevelState {
    const chapter = Chapters[this.currentChapterIndex];
    const level = chapter.levels[this.currentLevelIndex];

    return {
      chapter: this.currentChapterIndex,
      level: this.currentLevelIndex,
      chapterName: chapter.name,
      targetPieces: level.targetPieces,
      maxCuts: level.maxCuts,
      tolerance: level.tolerance,
      cutsRemaining: this.cutsRemaining,
      cutsUsed: this.cutsUsedThisLevel,
      pieces: this.pieces.length,
      outcome: this.testOutcome,
      evaluation: this.evaluateLevel(),
      lastResult: this.testLastResult,
      viewport: {
        width: this.scale.width,
        height: this.scale.height,
      },
    };
  }

  private getTestCutPoints(angle: number, offset: number, length: number): TestCutPoints {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const normalX = -dirY;
    const normalY = dirX;
    const centerX = normalX * offset;
    const centerY = normalY * offset;

    return {
      start: this.relativeToScreen(centerX - dirX * length, centerY - dirY * length),
      end: this.relativeToScreen(centerX + dirX * length, centerY + dirY * length),
    };
  }

  private getLevelInstruction(): string {
    const level = Chapters[this.currentChapterIndex].levels[this.currentLevelIndex];
    if (this.currentChapterIndex === 0 && this.currentLevelIndex < 3) {
      return `Tutorial challenge: cut through the center to make ${level.targetPieces} equal pieces.`;
    }
    return `Slice into ${level.targetPieces} equal pieces.`;
  }

  private updateHUD() {
    const chapterName = Chapters[this.currentChapterIndex].name;
    this.uiText.setText(`CHAPTER ${this.currentChapterIndex + 1}: ${chapterName.toUpperCase()}\nLEVEL ${this.currentLevelIndex + 1}   |   CUTS LEFT: ${this.cutsRemaining}`);

    // Draw pill background behind UI text
    this.time.delayedCall(10, () => {
      this.uiTextBg.clear();
      const bounds = this.uiText.getBounds();
      // Increase padding specifically for multiline text
      const padX = this.px(20);
      const padY = this.px(12);
      this.uiTextBg.fillStyle(0x000000, 0.7);
      this.uiTextBg.fillRoundedRect(bounds.x - padX, bounds.y - padY, bounds.width + padX * 2, bounds.height + padY * 2, this.px(16));
      this.uiTextBg.lineStyle(this.px(2), 0xffffff, 0.2);
      this.uiTextBg.strokeRoundedRect(bounds.x - padX, bounds.y - padY, bounds.width + padX * 2, bounds.height + padY * 2, this.px(16));
    });
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.centerX = width / 2;
    this.centerY = height / 2;
    // Scale and perfectly center grid
    this.bgGrid.setPosition(this.centerX, this.centerY);
    this.bgGrid.setDisplaySize(width + 80, height + 80);

    // Keep a larger margin for mobile finger space (scale to 85%)
    this.baseScale = Math.min(width, height) * 0.85;

    // Dynamic responsive font sizes
    this.messageText.setFontSize(Math.max(16, this.baseScale * 0.1));
    this.messageText.setPosition(this.centerX, height * 0.15);
    this.messageText.setWordWrapWidth(width * 0.85);

    // Resize popup bg to match text
    this.drawPopupBg();

    this.uiText.setFontSize(Math.max(12, this.baseScale * 0.05));
    this.uiText.setWordWrapWidth(width * 0.9);
    // Position HUD anchored 50px from the bottom edge
    this.uiText.setPosition(this.centerX, height - (this.uiText.height / 2) - 30);
    this.updateHUD(); // force bg redraw

    this.btnMenu.setPosition(this.px(60), this.px(40));
    this.btnHint.setPosition(this.centerX, this.px(40));
    this.btnRestart.setPosition(width - this.px(60), this.px(40));

    // Redraw pieces with the new scale
    this.drawPieces();
  }

  private showPopup(text: string, color: string, duration: number = 2000) {
    this.messageText.setText(text);
    this.messageText.setColor(color);
    this.messageText.setScale(0.5);
    this.messageText.setAlpha(0);

    // Kill any existing tweens on the message text
    this.tweens.killTweensOf(this.messageText);

    this.tweens.add({
      targets: this.messageText,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.out',
      yoyo: true,
      hold: duration,
      onComplete: () => {
        this.messageText.setText('');
        this.drawPopupBg();
      }
    });
  }



  private drawPopupBg() {
    this.popupBg.clear();
    if (!this.messageText.text) return;

    const bounds = this.messageText.getBounds();
    const padX = this.px(20);
    const padY = this.px(10);

    this.popupBg.fillStyle(0x000000, 0.8);
    this.popupBg.fillRoundedRect(
      bounds.x - padX,
      bounds.y - padY,
      bounds.width + padX * 2,
      bounds.height + padY * 2,
      this.px(16)
    );
    const messageColor = typeof this.messageText.style.color === 'string'
      ? this.messageText.style.color
      : '#ffffff';
    this.popupBg.lineStyle(this.px(3), Phaser.Display.Color.HexStringToColor(messageColor).color, 0.8);
    this.popupBg.strokeRoundedRect(
      bounds.x - padX,
      bounds.y - padY,
      bounds.width + padX * 2,
      bounds.height + padY * 2,
      this.px(16)
    );
  }

  private screenToRelative(px: number, py: number): {x: number, y: number} {
    return {
      x: (px - this.centerX) / this.baseScale,
      y: (py - this.centerY) / this.baseScale
    };
  }

  private relativeToScreen(rx: number, ry: number): {x: number, y: number} {
    return {
      x: rx * this.baseScale + this.centerX,
      y: ry * this.baseScale + this.centerY
    };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    soundManager.init();
    if (this.isLevelTransitioning) return;
    if (this.cutsRemaining <= 0) return;
    if (this.pieces.length >= 20) return; // limit slices for performance

    if (this.tutorialTween) {
      this.tutorialTween.remove();
      this.tutorialGraphics.clear();
    }

    this.isDragging = true;
    this.startPoint = { x: pointer.x, y: pointer.y };
    this.endPoint = { x: pointer.x, y: pointer.y };
    this.trailPoints = [];
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging) return;
    this.endPoint = { x: pointer.x, y: pointer.y };
    this.trailPoints.push({ x: pointer.x, y: pointer.y, alpha: 1 });
    if (this.trailPoints.length > 15) this.trailPoints.shift();
    this.drawUI();
  }

  private onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.uiGraphics.clear();

    // Fade out trail
    this.tweens.add({
      targets: this.trailPoints,
      alpha: 0,
      duration: 300,
      onUpdate: () => this.drawUI()
    });

    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 10) return; // Ignore tiny lines

    const wasCut = this.sliceShapes();
    if (wasCut) {
      try {
        soundManager.playSliceSound();
        playablesPlatform.trackEvent('slice');
        this.cutsUsedThisLevel++;
        this.lightImpact(18);
        this.cameras.main.shake(150, 0.005);
        this.emitParticles(this.startPoint, this.endPoint);
      } catch (e) {
        console.warn('Juice effect failed:', e);
      }
      this.cutsRemaining--;
      this.updateHUD();
      this.checkWinCondition();
    } else {
      this.showPopup('No slice made. Draw across the shape.', '#ffaa00');
    }
  }

  private lightImpact(duration: number) {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }

  private emitParticles(p1: {x: number, y: number}, p2: {x: number, y: number}) {
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const emitter = this.add.particles(cx, cy, 'particle', {
      speed: { min: 100, max: 400 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 15,
      tint: [0xffffff, 0x00ff99, 0x4488ff]
    });
    emitter.explode();
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  private sliceShapes(): boolean {
    let newPieces: ShapePiece[] = [];
    let wasSliced = false;

    const relStart = this.screenToRelative(this.startPoint.x, this.startPoint.y);
    const relEnd = this.screenToRelative(this.endPoint.x, this.endPoint.y);

    // Normal vector of the slice line in relative space
    const dx = relEnd.x - relStart.x;
    const dy = relEnd.y - relStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;

    for (const piece of this.pieces) {
      // Offset regions to their true relative positions before cutting
      const actualRegion = piece.region.map(p => [
        p[0] + piece.offsetX,
        p[1] + piece.offsetY
      ]);

      const resultRegions = GeometryManager.slicePolygons([actualRegion], relStart, relEnd);

      if (resultRegions.length > 1) {
        wasSliced = true;

        for (const r of resultRegions) {
          const centroid = GeometryManager.getCentroid(r);

          // Determine which side of the line the piece is on
          const v_dx = centroid.x - relStart.x;
          const v_dy = centroid.y - relStart.y;
          const dot = v_dx * nx + v_dy * ny;
          const sign = dot > 0 ? 1 : -1;

          // Vary color slightly to visually distinguish cut pieces
          let newColor = piece.color;
          if (piece.itemType) {
            const rgb = Phaser.Display.Color.IntegerToColor(piece.color);
            const variation = (Math.random() * 40 - 20); // slightly lighter or darker
            rgb.lighten(variation);
            newColor = rgb.color;
          } else {
            newColor = Phaser.Display.Color.RandomRGB().color;
          }

          // Add a relative offset representing a few pixels apart
          // e.g. 0.02 relative units
          const pushForce = 0.02;

            newPieces.push({
              region: r,
              color: newColor,
              itemType: piece.itemType,
              offsetX: nx * sign * pushForce,
              offsetY: ny * sign * pushForce,
              alpha: 1,
              scale: 1
            });
          }
        } else {
          newPieces.push(piece);
        }
    }

    if (wasSliced) {
      this.pieces = newPieces;
      this.drawPieces();
    }

    return wasSliced;
  }

  private getItemStyle(type?: ItemType): { color: number, stroke: number, feature?: string, featColor?: number } {
    switch(type) {
      case 'pizza': return { color: 0xffcc77, stroke: 0xd28c47, feature: 'circles', featColor: 0xcc3333 };
      case 'watermelon': return { color: 0xff4455, stroke: 0x228833, feature: 'dots', featColor: 0x222222 };
      case 'gear': return { color: 0x666677, stroke: 0x9999aa, feature: 'lines', featColor: 0x888899 };
      case 'chocolate': return { color: 0x3d2314, stroke: 0x2a170d, feature: 'grid', featColor: 0x2a170d };
      case 'cheese': return { color: 0xffcc00, stroke: 0xddaa00, feature: 'circles', featColor: 0xddaa00 };
      case 'cookie': return { color: 0xddaa77, stroke: 0xbb8855, feature: 'dots', featColor: 0x4a2e1b };
      case 'brick': return { color: 0xaa4433, stroke: 0x883322, feature: 'lines', featColor: 0x883322 };
      case 'leaf': return { color: 0x44aa44, stroke: 0x227722, feature: 'lines', featColor: 0x227722 };
      case 'wood': return { color: 0xc19a6b, stroke: 0xa07a4b, feature: 'lines', featColor: 0xa07a4b };
      case 'metal': return { color: 0x8899aa, stroke: 0xaabbcc, feature: 'dots', featColor: 0x667788 };
      case 'starfish': return { color: 0xff7766, stroke: 0xcc5544, feature: 'dots', featColor: 0xcc5544 };
      case 'origami': return { color: 0xeef5ff, stroke: 0xbbccdd, feature: 'lines', featColor: 0xbbccdd };
      case 'paint': return { color: 0x11ccff, stroke: 0x0099cc, feature: 'circles', featColor: 0x00aadd };
      case 'fried_egg': return { color: 0xffffff, stroke: 0xeeeeee, feature: 'circles', featColor: 0xffcc00 };
      default: return { color: 0x4488ff, stroke: 0xffffff };
    }
  }

  private drawPieces() {
    this.graphics.clear(); // Clear the old monolithic graphics

    // Hide all existing pieces in the pool
    for (const g of this.pieceGraphicsPool) g.setVisible(false);
    // DO NOT hide mask graphics. A GeometryMask requires the graphics object to remain visible (Phaser doesn't render `make` objects to the display list, but they must be 'visible' for the stencil buffer).

    let poolIdx = 0;
    for (const piece of this.pieces) {
      if (poolIdx >= this.pieceGraphicsPool.length) {
        this.pieceGraphicsPool.push(this.add.graphics());
        this.maskGraphicsPool.push(this.make.graphics({}));
      }

      const g = this.pieceGraphicsPool[poolIdx];
      const maskG = this.maskGraphicsPool[poolIdx];

      g.setVisible(true);
      maskG.setVisible(true); // Must be true for stencil buffer!
      g.clear();
      maskG.clear();

      const style = this.getItemStyle(piece.itemType);

      g.fillStyle(piece.color, piece.alpha);
      g.lineStyle(Math.max(2, this.baseScale * 0.01), style.stroke, piece.alpha);

      const region = piece.region;
      if (region.length > 0) {
        const centroid = GeometryManager.getCentroid(region);

        const transformPoint = (p: number[]) => {
          const dx = p[0] - centroid.x;
          const dy = p[1] - centroid.y;
          const sx = centroid.x + dx * piece.scale + piece.offsetX;
          const sy = centroid.y + dy * piece.scale + piece.offsetY;
          return this.relativeToScreen(sx, sy);
        };

        const startPoint = transformPoint(region[0]);

        // --- Create GeometryMask for this piece ---
        maskG.beginPath();
        maskG.moveTo(startPoint.x, startPoint.y);
        for (let i = 1; i < region.length; i++) {
          const p = transformPoint(region[i]);
          maskG.lineTo(p.x, p.y);
        }
        maskG.closePath();
        maskG.fillPath();
        g.setMask(maskG.createGeometryMask());
        // ------------------------------------------

        // Draw Base Polygon
        g.beginPath();
        g.moveTo(startPoint.x, startPoint.y);
        for (let i = 1; i < region.length; i++) {
          const p = transformPoint(region[i]);
          g.lineTo(p.x, p.y);
        }
        g.closePath();
        g.fillPath();

        // Watermelon rind (green base)
        if (piece.itemType === 'watermelon') {
          g.fillStyle(0x11aa33, piece.alpha);
          const r1 = transformPoint([-1.5, 0.2]);
          const r2 = transformPoint([1.5, 0.2]);
          const r3 = transformPoint([1.5, 1.5]);
          const r4 = transformPoint([-1.5, 1.5]);
          g.beginPath();
          g.moveTo(r1.x, r1.y);
          g.lineTo(r2.x, r2.y);
          g.lineTo(r3.x, r3.y);
          g.lineTo(r4.x, r4.y);
          g.closePath();
          g.fillPath();
        }

        // Gear holes
        if (piece.itemType === 'gear') {
          g.fillStyle(0x222233, piece.alpha);
          const c = transformPoint([0, 0]);
          g.fillCircle(c.x, c.y, this.baseScale * 0.08);
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const hx = Math.cos(angle) * 0.25;
            const hy = Math.sin(angle) * 0.25;
            const hc = transformPoint([hx, hy]);
            g.fillCircle(hc.x, hc.y, this.baseScale * 0.03);
          }
        }

        // Minimal Styling (drawn over the base color, clipped by the mask)
        if (style.feature && style.featColor) {
          g.fillStyle(style.featColor, piece.alpha * 0.8);
          g.lineStyle(2, style.featColor, piece.alpha * 0.6);

          if (style.feature === 'grid') {
            for (let v = -2.5; v <= 2.5; v += 0.2) {
              const ptStart1 = transformPoint([v, -2.5]);
              const ptEnd1 = transformPoint([v, 2.5]);
              g.beginPath();
              g.moveTo(ptStart1.x, ptStart1.y);
              g.lineTo(ptEnd1.x, ptEnd1.y);
              g.strokePath();

              const ptStart2 = transformPoint([-2.5, v]);
              const ptEnd2 = transformPoint([2.5, v]);
              g.beginPath();
              g.moveTo(ptStart2.x, ptStart2.y);
              g.lineTo(ptEnd2.x, ptEnd2.y);
              g.strokePath();
            }
          } else if (style.feature === 'lines') {
            for (let v = -3.5; v <= 3.5; v += 0.15) {
              const ptStart = transformPoint([-2.5, v]);
              const ptEnd = transformPoint([2.5, v - 1.7]);
              g.beginPath();
              g.moveTo(ptStart.x, ptStart.y);
              g.lineTo(ptEnd.x, ptEnd.y);
              g.strokePath();
            }
          } else {
            for (let gx = -0.8; gx <= 0.8; gx += 0.15) {
              for (let gy = -0.8; gy <= 0.8; gy += 0.15) {
                const jx = gx + Math.sin(gx * 50 + gy * 30) * 0.05;
                const jy = gy + Math.cos(gy * 50 + gx * 30) * 0.05;

                // Ensure we only draw features near the polygon to save processing
                // and prevent wild rendering if masks ever fail.
                if (!GeometryManager.isPointInPolygon({x: jx, y: jy}, region)) continue;

                const pt = transformPoint([jx, jy]);

                if (style.feature === 'circles') {
                  if (piece.itemType === 'fried_egg') {
                    if (Math.abs(jx) < 0.2 && Math.abs(jy) < 0.2 && Math.abs(gx) < 0.01 && Math.abs(gy) < 0.01) {
                      g.fillStyle(style.featColor, piece.alpha * 0.9);
                      g.fillCircle(pt.x, pt.y, this.baseScale * 0.15);
                      g.fillStyle(0xffffff, piece.alpha * 0.5);
                      g.fillCircle(pt.x - this.baseScale * 0.04, pt.y - this.baseScale * 0.04, this.baseScale * 0.04);
                    }
                  } else if (piece.itemType === 'pizza') {
                    const radius = this.baseScale * (0.02 + Math.abs(Math.sin(jx*10)) * 0.03);
                    g.fillStyle(style.featColor, piece.alpha * 0.8);
                    g.fillCircle(pt.x, pt.y, radius);
                    // Add tiny green toppings
                    if (Math.abs(Math.cos(jx*20 + jy*15)) > 0.6) {
                      g.fillStyle(0x225511, piece.alpha * 0.8);
                      const gp = transformPoint([jx + 0.05, jy + 0.05]);
                      g.fillCircle(gp.x, gp.y, this.baseScale * 0.01);
                    }
                  } else if (piece.itemType === 'cheese') {
                    const radius = this.baseScale * (0.02 + Math.abs(Math.cos(jy*20)) * 0.04);
                    g.fillStyle(style.featColor, piece.alpha * 0.8);
                    g.fillCircle(pt.x, pt.y, radius);
                  } else {
                    g.fillStyle(style.featColor, piece.alpha * 0.8);
                    g.fillCircle(pt.x, pt.y, this.baseScale * 0.03);
                  }
                } else if (style.feature === 'dots') {
                  g.fillStyle(style.featColor, piece.alpha * 0.8);
                  g.fillCircle(pt.x, pt.y, this.baseScale * 0.01);
                }
              }
            }
          }
        }

        g.strokePath();
      }

      poolIdx++;
    }

    // Draw center crosshair and anchor point to help with logical cuts.
    const guideRadius = Math.max(42, this.baseScale * 0.12);
    this.graphics.lineStyle(2, 0xffffff, 0.22);
    this.graphics.lineBetween(this.centerX - guideRadius, this.centerY, this.centerX + guideRadius, this.centerY);
    this.graphics.lineBetween(this.centerX, this.centerY - guideRadius, this.centerX, this.centerY + guideRadius);
    this.graphics.lineStyle(1, 0x00ff99, 0.28);
    this.graphics.strokeCircle(this.centerX, this.centerY, guideRadius * 0.55);

    this.graphics.fillStyle(0xffffff, 0.8);
    this.graphics.lineStyle(2, 0x000000, 1);
    this.graphics.beginPath();
    this.graphics.arc(this.centerX, this.centerY, Math.max(3, this.baseScale * 0.01), 0, Math.PI * 2);
    this.graphics.fillPath();
    this.graphics.strokePath();
  }

  private drawUI() {
    this.uiGraphics.clear();
    // Scale preview line thickness dynamically
    this.uiGraphics.lineStyle(Math.max(4, this.baseScale * 0.015), 0xffffff, 0.8);

    // Render dotted line preview
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(len / 15);

    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) {
        const sx = this.startPoint.x + dx * (i / steps);
        const sy = this.startPoint.y + dy * (i / steps);
        const ex = this.startPoint.x + dx * ((i + 1) / steps);
        const ey = this.startPoint.y + dy * ((i + 1) / steps);
        this.uiGraphics.beginPath();
        this.uiGraphics.moveTo(sx, sy);
        this.uiGraphics.lineTo(ex, ey);
        this.uiGraphics.strokePath();
      }
    }

    this.uiGraphics.fillStyle(0x00ff99, 1);
    if (this.isDragging) {
      this.uiGraphics.fillCircle(this.startPoint.x, this.startPoint.y, Math.max(5, this.baseScale * 0.012));
      this.uiGraphics.fillStyle(0xffffff, 1);
      this.uiGraphics.fillCircle(this.endPoint.x, this.endPoint.y, Math.max(5, this.baseScale * 0.012));
    }

    // Draw swipe trail
    this.sliceTrail.clear();
    if (this.trailPoints.length > 1) {
      for (let i = 1; i < this.trailPoints.length; i++) {
        const p1 = this.trailPoints[i - 1];
        const p2 = this.trailPoints[i];
        if (p1.alpha > 0) {
          this.sliceTrail.lineStyle(Math.max(6, this.baseScale * 0.02) * (i / this.trailPoints.length), 0xffffff, p1.alpha * 0.6);
          this.sliceTrail.beginPath();
          this.sliceTrail.moveTo(p1.x, p1.y);
          this.sliceTrail.lineTo(p2.x, p2.y);
          this.sliceTrail.strokePath();
        }
      }
    }
  }

  private checkWinCondition() {
    if (this.isLevelTransitioning) return;
    if (this.currentChapterIndex >= Chapters.length) return;

    const evaluation = this.evaluateLevel();
    if (!evaluation) return;

    if (evaluation.isSuccess || this.cutsRemaining <= 0) {
      this.applyAreaFeedbackColors(evaluation);
      this.drawPieces();
      if (evaluation.isPieceCountCorrect) {
        this.showPercentages(evaluation);
      }
    }

    if (evaluation.isSuccess) {
      void this.completeLevel(evaluation);
    } else if (this.cutsRemaining <= 0) {
      void this.failLevel(evaluation);
    } else {
      this.showPopup(evaluation.feedback, '#ffffff');
    }
  }

  private evaluateLevel(): LevelEvaluation | null {
    const level = Chapters[this.currentChapterIndex].levels[this.currentLevelIndex];
    let totalPixelArea = 0;
    const areas: number[] = [];

    for (const piece of this.pieces) {
      const pixelRegion = piece.region.map(p => {
        const point = this.relativeToScreen(p[0] + piece.offsetX, p[1] + piece.offsetY);
        return [point.x, point.y];
      });
      const pixelArea = GeometryManager.calculateArea(pixelRegion);
      areas.push(pixelArea);
      totalPixelArea += pixelArea;
    }

    if (totalPixelArea === 0 || areas.length === 0) return null;

    const targetArea = totalPixelArea / level.targetPieces;
    const targetPercent = 100 / level.targetPieces;
    const largestPercent = Math.max(...areas) / totalPixelArea * 100;
    const smallestPercent = Math.min(...areas) / totalPixelArea * 100;
    const maxDiff = Math.max(...areas.map(area => Math.abs(area - targetArea) / targetArea));
    const isPieceCountCorrect = this.pieces.length === level.targetPieces;
    const isSuccess = isPieceCountCorrect && maxDiff <= level.tolerance;
    const accuracy = Math.max(0, 100 * (1 - maxDiff));
    const grade = this.getGrade(maxDiff, level.tolerance);
    const feedback = this.getFeedback(isPieceCountCorrect, level.targetPieces, targetPercent, largestPercent, smallestPercent);

    return {
      areas,
      totalPixelArea,
      targetArea,
      targetPercent,
      maxDiff,
      largestPercent,
      smallestPercent,
      isPieceCountCorrect,
      isSuccess,
      accuracy,
      grade,
      feedback,
    };
  }

  private getGrade(maxDiff: number, tolerance: number): string {
    if (maxDiff <= tolerance * 0.25) return 'Perfect';
    if (maxDiff <= tolerance * 0.6) return 'Great';
    if (maxDiff <= tolerance) return 'Close';
    return 'Cleared';
  }

  private getFeedback(
    isPieceCountCorrect: boolean,
    targetPieces: number,
    targetPercent: number,
    largestPercent: number,
    smallestPercent: number
  ): string {
    if (!isPieceCountCorrect) {
      if (this.pieces.length < targetPieces) {
        return `Need ${targetPieces} pieces. You made ${this.pieces.length}.`;
      }
      return `Too many pieces. Need exactly ${targetPieces}.`;
    }

    return `Largest ${largestPercent.toFixed(1)}%, smallest ${smallestPercent.toFixed(1)}%. Target ${targetPercent.toFixed(1)}%.`;
  }

  private applyAreaFeedbackColors(evaluation: LevelEvaluation) {
    for (let i = 0; i < this.pieces.length; i++) {
      const diff = Math.abs(evaluation.areas[i] - evaluation.targetArea) / evaluation.targetArea;
      if (diff <= 0.03) this.pieces[i].color = 0x00aa78;
      else if (diff <= 0.1) this.pieces[i].color = 0xffaa00;
      else this.pieces[i].color = 0xff4455;
    }
  }

  private showPercentages(evaluation: LevelEvaluation) {
    this.percentageTexts.forEach(t => t.destroy());
    this.percentageTexts = [];

    for (let i = 0; i < this.pieces.length; i++) {
      const piece = this.pieces[i];
      const percent = (evaluation.areas[i] / evaluation.totalPixelArea) * 100;
      const centroid = GeometryManager.getCentroid(piece.region);
      const pixelCentroid = this.relativeToScreen(centroid.x + piece.offsetX, centroid.y + piece.offsetY);

      const text = this.add.text(pixelCentroid.x, pixelCentroid.y, `${percent.toFixed(1)}%`, {
        fontSize: `${Math.max(16, this.baseScale * 0.08)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5);

      this.tweens.add({
        targets: text,
        scale: { from: 0, to: 1 },
        ease: 'Back.easeOut',
        duration: 400,
        delay: i * 50
      });

      this.percentageTexts.push(text);
    }
  }

  private async completeLevel(evaluation: LevelEvaluation) {
    const completedChapterIndex = this.currentChapterIndex;
    const completedLevelIndex = this.currentLevelIndex;
    const nextProgress = this.getNextProgress(completedChapterIndex, completedLevelIndex);
    const saveProgress = this.shouldAdvanceSavedProgress(nextProgress) ? nextProgress : undefined;

    this.isLevelTransitioning = true;
    this.testOutcome = 'success';
    this.testLastResult = {
      outcome: 'success',
      chapter: completedChapterIndex,
      level: completedLevelIndex,
      accuracy: evaluation.accuracy,
      grade: evaluation.grade,
      feedback: evaluation.feedback,
    };
    this.currentChapterIndex = nextProgress.chapter;
    this.currentLevelIndex = nextProgress.level;

    await playablesPlatform.saveLevelResult(
      completedChapterIndex,
      completedLevelIndex,
      evaluation.accuracy,
      evaluation.grade,
      this.cutsUsedThisLevel,
      saveProgress
    );

    try {
      soundManager.playWinSound();
      this.lightImpact(40);
    } catch (e) {
      console.warn('Win effects failed', e);
    }
    if (nextProgress.completed) {
      this.showPopup(`Game Complete! ${evaluation.grade} ${evaluation.accuracy.toFixed(1)}%`, '#ffff00');
    } else if (this.currentLevelIndex === 0 && this.currentChapterIndex !== completedChapterIndex) {
      this.showPopup(`Chapter Complete! ${evaluation.grade} ${evaluation.accuracy.toFixed(1)}%`, '#ffff00');
    } else {
      this.showPopup(`${evaluation.grade}! ${evaluation.accuracy.toFixed(1)}% accuracy`, '#00ff00');
    }

    if (this.isAutoplayMode()) return;

    this.time.delayedCall(800, () => {
      this.pieces.forEach(piece => {
        const centroid = GeometryManager.getCentroid(piece.region);
        this.tweens.add({
          targets: piece,
          offsetX: piece.offsetX + centroid.x * 1.5,
          offsetY: piece.offsetY + centroid.y * 1.5,
          alpha: 0,
          scale: 0.5,
          ease: 'Power2',
          duration: 1000,
          onUpdate: () => this.drawPieces()
        });
      });

      this.percentageTexts.forEach(t => {
        this.tweens.add({
          targets: t,
          alpha: 0,
          duration: 500
        });
      });
    });

    this.time.delayedCall(2200, () => {
      if (nextProgress.completed) {
        this.scene.start('MenuScene');
      } else {
        this.initLevel();
      }
    });
  }

  private async failLevel(evaluation: LevelEvaluation) {
    try {
      soundManager.playLoseSound();
      this.lightImpact(90);
    } catch (e) {
      console.warn('Lose effects failed', e);
    }
    this.isLevelTransitioning = true;
    this.testOutcome = 'failure';
    this.testLastResult = {
      outcome: 'failure',
      chapter: this.currentChapterIndex,
      level: this.currentLevelIndex,
      accuracy: evaluation.accuracy,
      grade: evaluation.grade,
      feedback: evaluation.feedback,
    };
    playablesPlatform.trackEvent('level_fail');
    await playablesPlatform.saveAnalytics();
    this.showPopup(`Try again: ${evaluation.feedback}\n(Tap anywhere to retry)`, '#ff4455');

    const retryOverlay = this.add.zone(0, 0, this.scale.width, this.scale.height).setOrigin(0).setInteractive();
    retryOverlay.once('pointerdown', () => {
      retryOverlay.destroy();
      this.initLevel();
    });

    if (this.isAutoplayMode()) return;

    // Faster auto-retry if they don't tap
    this.time.delayedCall(1200, () => {
      if (retryOverlay.active) {
        retryOverlay.destroy();
        this.initLevel();
      }
    });
  }

  private getNextProgress(chapterIndex: number, levelIndex: number) {
    let chapter = chapterIndex;
    let level = levelIndex + 1;
    let completed = false;

    if (level >= Chapters[chapter].levels.length) {
      chapter++;
      level = 0;
    }

    if (chapter >= Chapters.length) {
      chapter = Chapters.length - 1;
      level = Chapters[chapter].levels.length - 1;
      completed = true;
    }

    return { chapter, level, completed };
  }

  private shouldAdvanceSavedProgress(nextProgress: { chapter: number; level: number; completed: boolean }): boolean {
    const progress = playablesPlatform.getProgress();
    if (nextProgress.completed) return true;
    if (progress.completed) return false;
    return this.getGlobalIndex(nextProgress.chapter, nextProgress.level) > this.getGlobalIndex(progress.chapter, progress.level);
  }

  private getGlobalIndex(chapterIndex: number, levelIndex: number): number {
    let index = 0;
    for (let i = 0; i < chapterIndex; i++) index += Chapters[i].levels.length;
    return index + levelIndex;
  }
}
