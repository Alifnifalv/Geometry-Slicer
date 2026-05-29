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
  private percentageTexts: Phaser.GameObjects.Text[] = [];

  private btnMenu!: Phaser.GameObjects.Container;
  private btnRestart!: Phaser.GameObjects.Container;
  private popupBg!: Phaser.GameObjects.Graphics;

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
    this.graphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();

    this.popupBg = this.add.graphics();
    this.messageText = this.add.text(0, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    this.uiText = this.add.text(20, 20, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    this.createButtons();

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);

    this.initLevel();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  private createButtons() {
    // Menu Button
    this.btnMenu = this.add.container(0, 0);
    const bgMenu = this.add.graphics().fillStyle(0x333333, 0.8).fillRoundedRect(-40, -20, 80, 40, 8);
    const txtMenu = this.add.text(0, 0, 'MENU', { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.btnMenu.add([bgMenu, txtMenu]);
    const zoneMenu = this.add.zone(0, 0, 80, 40).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.btnMenu.add(zoneMenu);
    
    zoneMenu.on('pointerdown', () => this.btnMenu.setScale(0.9));
    zoneMenu.on('pointerup', () => {
      this.btnMenu.setScale(1);
      this.scene.start('MenuScene');
    });
    zoneMenu.on('pointerout', () => this.btnMenu.setScale(1));

    // Restart Button
    this.btnRestart = this.add.container(0, 0);
    const bgRes = this.add.graphics().fillStyle(0xffaa00, 0.8).fillRoundedRect(-50, -20, 100, 40, 8);
    const txtRes = this.add.text(0, 0, 'RESTART', { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.btnRestart.add([bgRes, txtRes]);
    const zoneRes = this.add.zone(0, 0, 100, 40).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.btnRestart.add(zoneRes);

    zoneRes.on('pointerdown', () => this.btnRestart.setScale(0.9));
    zoneRes.on('pointerup', () => {
      this.btnRestart.setScale(1);
      this.initLevel();
    });
    zoneRes.on('pointerout', () => this.btnRestart.setScale(1));
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
    this.uiText.setText(`Chapter ${this.currentChapterIndex + 1}: ${chapterName}\nLevel: ${this.currentLevelIndex + 1}\nCuts Remaining: ${this.cutsRemaining}`);
  }

  private resize(gameSize: Phaser.Structs.Size) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.centerX = width / 2;
    this.centerY = height / 2;
    // Keep a larger margin for mobile finger space (scale to 70%)
    this.baseScale = Math.min(width, height) * 0.7;

    // Dynamic responsive font sizes
    this.messageText.setFontSize(Math.max(16, this.baseScale * 0.1));
    this.messageText.setPosition(this.centerX, height * 0.15); // Avoid top notches and buttons
    this.messageText.setWordWrapWidth(width * 0.85); // Prevent text clipping on narrow mobile screens
    
    // Resize popup bg to match text
    this.drawPopupBg();

    this.uiText.setFontSize(Math.max(14, this.baseScale * 0.06));
    // Position HUD at the bottom left for mobile accessibility
    this.uiText.setPosition(width * 0.05, height * 0.85); 

    this.btnMenu.setPosition(60, 40);
    this.btnRestart.setPosition(width - 70, 40);

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
    
    this.popupBg.fillStyle(0x000000, 0.6);
    this.popupBg.fillRoundedRect(
      bounds.x - padX, 
      bounds.y - padY, 
      bounds.width + padX * 2, 
      bounds.height + padY * 2, 
      12
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
          strokeThickness: 4
        }).setOrigin(0.5);
        
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
