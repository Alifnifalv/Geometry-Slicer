import Phaser from 'phaser';
import { GeometryManager } from '../GeometryManager';
import { Chapters } from '../LevelData';

interface ShapePiece {
  region: number[][]; // Polygon vertices in relative world space (e.g., -0.5 to 0.5)
  color: number;
  offsetX: number; // Relative offset
  offsetY: number; // Relative offset
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
  private isLevelTransitioning = false;

  constructor() {
    super('MainScene');
  }

  init() {
    const saved = localStorage.getItem('geometrySlicerProgress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.currentChapterIndex = data.chapter || 0;
        this.currentLevelIndex = data.level || 0;
      } catch (e) {
        this.currentChapterIndex = 0;
        this.currentLevelIndex = 0;
      }
    } else {
      this.currentChapterIndex = 0;
      this.currentLevelIndex = 0;
    }
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
    this.uiText = this.add.text(0, 0, '', {
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
    menu.zone.on('pointerdown', () => this.btnMenu.setScale(0.9));
    menu.zone.on('pointerup', () => {
      this.btnMenu.setScale(1);
      this.scene.start('MenuScene');
    });
    menu.zone.on('pointerout', () => this.btnMenu.setScale(1));

    const restart = createBtn('RESTART', 0xffaa00);
    this.btnRestart = restart.container;
    restart.zone.on('pointerdown', () => this.btnRestart.setScale(0.9));
    restart.zone.on('pointerup', () => {
      this.btnRestart.setScale(1);
      this.initLevel();
    });
    restart.zone.on('pointerout', () => this.btnRestart.setScale(1));
  }

  private initLevel() {
    this.isLevelTransitioning = false;
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

    this.pieces = [{
      region: level.shape,
      color: 0x4488ff,
      offsetX: 0,
      offsetY: 0
    }];

    this.updateHUD();
    this.showPopup(`Slice into ${level.targetPieces} equal pieces!`, '#ffffff');
    this.drawPieces();
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
    this.drawPopupBg();
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

    this.cutsRemaining--;
    this.updateHUD();
    
    this.sliceShapes();
  }

  private sliceShapes() {
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
            offsetY: ny * sign * pushForce
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
    
    // Always check win condition after slice attempt to handle failure logic properly
    this.checkWinCondition();
  }

  private drawPieces() {
    this.graphics.clear();

    for (const piece of this.pieces) {
      this.graphics.fillStyle(piece.color, 1);
      // Scale line stroke thickness dynamically
      this.graphics.lineStyle(Math.max(2, this.baseScale * 0.01), 0xffffff, 1);
      this.graphics.beginPath();
      
      const region = piece.region;
      if (region.length > 0) {
        const startPoint = this.relativeToScreen(region[0][0] + piece.offsetX, region[0][1] + piece.offsetY);
        this.graphics.moveTo(startPoint.x, startPoint.y);
        
        for (let i = 1; i < region.length; i++) {
          const p = this.relativeToScreen(region[i][0] + piece.offsetX, region[i][1] + piece.offsetY);
          this.graphics.lineTo(p.x, p.y);
        }
        
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
      }
    }

    // Draw a prominent center reference anchor point to help with logical cuts
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
  }

  private checkWinCondition() {
    if (this.isLevelTransitioning) return;
    if (this.currentChapterIndex >= Chapters.length) return;
    
    const level = Chapters[this.currentChapterIndex].levels[this.currentLevelIndex];

    let totalPixelArea = 0;
    const areas: number[] = [];

    for (const piece of this.pieces) {
      // Map region to pixel coordinates to calculate actual pixel area
      const pixelRegion = piece.region.map(p => {
        const point = this.relativeToScreen(p[0] + piece.offsetX, p[1] + piece.offsetY);
        return [point.x, point.y];
      });
      
      const pixelArea = GeometryManager.calculateArea(pixelRegion);
      areas.push(pixelArea);
      totalPixelArea += pixelArea;
    }

    if (totalPixelArea === 0) return;

    // Check if pieces are roughly equal in pixel area
    let isSuccess = false;
    
    // Only successful if the number of pieces matches target exactly
    if (this.pieces.length === level.targetPieces) {
      const targetArea = totalPixelArea / this.pieces.length;
      isSuccess = true;

      for (const area of areas) {
        const diff = Math.abs(area - targetArea) / targetArea;
        if (diff > level.tolerance) { // Use dynamic tolerance based on level progression
          isSuccess = false;
          break;
        }
      }
    }

    const shouldShowPercentages = isSuccess || this.cutsRemaining <= 0;

    if (shouldShowPercentages) {
      this.percentageTexts.forEach(t => t.destroy());
      this.percentageTexts = [];

      for (let i = 0; i < this.pieces.length; i++) {
        const piece = this.pieces[i];
        const area = areas[i];
        const percent = (area / totalPixelArea) * 100;
        
        const centroid = GeometryManager.getCentroid(piece.region);
        const pixelCentroid = this.relativeToScreen(centroid.x + piece.offsetX, centroid.y + piece.offsetY);
        
        const text = this.add.text(pixelCentroid.x, pixelCentroid.y, `${percent.toFixed(1)}%`, {
          fontSize: `${Math.max(16, this.baseScale * 0.08)}px`,
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6
        }).setOrigin(0.5);
        
        // Pop-in animation
        this.tweens.add({
          targets: text,
          scale: { from: 0, to: 1 },
          ease: 'Back.easeOut',
          duration: 400,
          delay: i * 50 // stagger effect
        });
        
        this.percentageTexts.push(text);
      }
    }

    if (isSuccess) {
      this.isLevelTransitioning = true;
      this.currentLevelIndex++;
      
      let isChapterComplete = false;
      if (this.currentLevelIndex >= Chapters[this.currentChapterIndex].levels.length) {
        isChapterComplete = true;
        this.currentLevelIndex = 0;
        this.currentChapterIndex++;
      }

      // Save progress to localStorage
      if (this.currentChapterIndex < Chapters.length) {
        localStorage.setItem('geometrySlicerProgress', JSON.stringify({
          chapter: this.currentChapterIndex,
          level: this.currentLevelIndex
        }));
      }

      if (isChapterComplete) {
        if (this.currentChapterIndex >= Chapters.length) {
          this.showPopup('Game Complete! Congratulations!', '#ffff00');
        } else {
          this.showPopup('Chapter Complete!', '#ffff00');
        }
      } else {
        this.showPopup('Level Complete!', '#00ff00');
      }
      
      this.time.delayedCall(2000, () => {
        this.initLevel();
      });
    } else if (this.cutsRemaining <= 0) {
      this.isLevelTransitioning = true;
      this.showPopup('Out of cuts! Restarting...', '#ff0000');
      
      this.time.delayedCall(2000, () => {
        this.initLevel();
      });
    } else {
      this.showPopup(`Keep slicing...`, '#ffffff');
    }
  }
}
