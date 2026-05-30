import Phaser from 'phaser';
import { GeometryManager } from '../GeometryManager';
import { Chapters } from '../LevelData';
import { playablesPlatform } from '../playables';
import { soundManager } from '../SoundManager';

interface ShapePiece {
  region: number[][]; // Polygon vertices in relative world space (e.g., -0.5 to 0.5)
  color: number;
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
  private uiGraphics!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private uiText!: Phaser.GameObjects.Text;
  private uiTextBg!: Phaser.GameObjects.Graphics;
  private percentageTexts: Phaser.GameObjects.Text[] = [];

  private btnMenu!: Phaser.GameObjects.Container;
  private btnRestart!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Graphics;
  private bgGrid!: Phaser.GameObjects.Grid;

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
    this.uiGraphics = this.add.graphics();

    this.popupBg = this.add.graphics();
    this.messageText = this.add.text(0, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.uiTextBg = this.add.graphics();
    this.uiText = this.add.text(0, 0, ' ', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      lineSpacing: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.createButtons();

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
      const container = this.add.container(0, 0);
      // Drop shadow
      const shadow = this.add.graphics().fillStyle(0x000000, 0.4).fillRoundedRect(-48, -18, 96, 36, 18);
      const bg = this.add.graphics().fillStyle(color, 1).fillRoundedRect(-50, -20, 100, 40, 20);
      bg.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(-50, -20, 100, 40, 20);
      const txt = this.add.text(0, 0, text, { fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      container.add([shadow, bg, txt]);
      const zone = this.add.zone(0, 0, 100, 40).setOrigin(0.5).setInteractive({ useHandCursor: true });
      container.add(zone);
      return { container, zone };
    };

    const menu = createBtn('MENU', 0x333333);
    this.btnMenu = menu.container;
    menu.zone.on('pointerdown', () => {
      soundManager.init();
      this.btnMenu.setScale(0.9);
    });
    menu.zone.on('pointerup', () => {
      soundManager.playClickSound();
      this.btnMenu.setScale(1);
      this.scene.start('MenuScene');
    });
    menu.zone.on('pointerout', () => this.btnMenu.setScale(1));

    const restart = createBtn('RESTART', 0xffaa00);
    this.btnRestart = restart.container;
    restart.zone.on('pointerdown', () => {
      soundManager.init();
      this.btnRestart.setScale(0.9);
    });
    restart.zone.on('pointerup', () => {
      soundManager.playClickSound();
      playablesPlatform.trackEvent('restart');
      void playablesPlatform.saveAnalytics();
      this.btnRestart.setScale(1);
      this.initLevel();
    });
    restart.zone.on('pointerout', () => this.btnRestart.setScale(1));
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
    void playablesPlatform.recordAttempt(this.currentChapterIndex, this.currentLevelIndex);

    this.pieces = [{
      region: level.shape,
      color: 0x4488ff,
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
    this.showPopup(this.getLevelInstruction(), '#ffffff');
    this.drawPieces();
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
      this.uiTextBg.fillStyle(0x000000, 0.7);
      this.uiTextBg.fillRoundedRect(bounds.x - 15, bounds.y - 10, bounds.width + 30, bounds.height + 20, 16);
      this.uiTextBg.lineStyle(2, 0xffffff, 0.2);
      this.uiTextBg.strokeRoundedRect(bounds.x - 15, bounds.y - 10, bounds.width + 30, bounds.height + 20, 16);
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
    
    // Keep a larger margin for mobile finger space (scale to 70%)
    this.baseScale = Math.min(width, height) * 0.7;

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

    this.btnMenu.setPosition(60, 40);
    this.btnRestart.setPosition(width - 60, 40);

    // Redraw pieces with the new scale
    this.drawPieces();
  }

  private showPopup(text: string, color: string) {
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
      ease: 'Back.easeOut',
      duration: 400,
      onUpdate: () => this.drawPopupBg()
    });
  }

  private drawPopupBg() {
    this.popupBg.clear();
    if (!this.messageText.text) return;
    
    const bounds = this.messageText.getBounds();
    const padX = 20;
    const padY = 10;
    
    this.popupBg.fillStyle(0x000000, 0.8);
    this.popupBg.fillRoundedRect(
      bounds.x - padX, 
      bounds.y - padY, 
      bounds.width + padX * 2, 
      bounds.height + padY * 2, 
      16
    );
    const messageColor = typeof this.messageText.style.color === 'string'
      ? this.messageText.style.color
      : '#ffffff';
    this.popupBg.lineStyle(3, Phaser.Display.Color.HexStringToColor(messageColor).color, 0.8);
    this.popupBg.strokeRoundedRect(
      bounds.x - padX, 
      bounds.y - padY, 
      bounds.width + padX * 2, 
      bounds.height + padY * 2, 
      16
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
    
    this.isDragging = true;
    this.startPoint = { x: pointer.x, y: pointer.y };
    this.endPoint = { x: pointer.x, y: pointer.y };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isDragging) return;
    this.endPoint = { x: pointer.x, y: pointer.y };
    this.drawUI();
  }

  private onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.uiGraphics.clear();

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
          
          // Randomize color to visually confirm cut
          const newColor = Phaser.Display.Color.RandomRGB().color;
          
          // Add a relative offset representing a few pixels apart
          // e.g. 0.02 relative units
          const pushForce = 0.02;

            newPieces.push({
              region: r,
              color: newColor,
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

  private drawPieces() {
    this.graphics.clear();

    for (const piece of this.pieces) {
      this.graphics.fillStyle(piece.color, piece.alpha);
      // Scale line stroke thickness dynamically
      this.graphics.lineStyle(Math.max(2, this.baseScale * 0.01), 0xffffff, piece.alpha);
      this.graphics.beginPath();
      
      const region = piece.region;
      if (region.length > 0) {
        // Calculate centroid of the raw region for scaling around its own center
        const centroid = GeometryManager.getCentroid(region);
        
        const transformPoint = (p: number[]) => {
          // Move to origin, scale, move back to centroid, then apply offsets
          const dx = p[0] - centroid.x;
          const dy = p[1] - centroid.y;
          const sx = centroid.x + dx * piece.scale + piece.offsetX;
          const sy = centroid.y + dy * piece.scale + piece.offsetY;
          return this.relativeToScreen(sx, sy);
        };

        const startPoint = transformPoint(region[0]);
        this.graphics.moveTo(startPoint.x, startPoint.y);
        
        for (let i = 1; i < region.length; i++) {
          const p = transformPoint(region[i]);
          this.graphics.lineTo(p.x, p.y);
        }
        
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
      }
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
    this.uiGraphics.fillCircle(this.startPoint.x, this.startPoint.y, Math.max(5, this.baseScale * 0.012));
    this.uiGraphics.fillStyle(0xffffff, 1);
    this.uiGraphics.fillCircle(this.endPoint.x, this.endPoint.y, Math.max(5, this.baseScale * 0.012));
  }

  private checkWinCondition() {
    if (this.isLevelTransitioning) return;
    if (this.currentChapterIndex >= Chapters.length) return;

    const evaluation = this.evaluateLevel();
    if (!evaluation) return;

    if (evaluation.isSuccess || this.cutsRemaining <= 0) {
      this.applyAreaFeedbackColors(evaluation);
      this.drawPieces();
      this.showPercentages(evaluation);
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
    this.showPopup(`Try again: ${evaluation.feedback}`, '#ff4455');

    if (this.isAutoplayMode()) return;

    this.time.delayedCall(2600, () => {
      this.initLevel();
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
