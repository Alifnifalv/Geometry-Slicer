import Phaser from 'phaser';
import { Chapters } from '../LevelData';
import { playablesPlatform } from '../playables';
import { soundManager } from '../SoundManager';

type ButtonParts = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
};

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private chapterText!: Phaser.GameObjects.Text;
  private selectedText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private playButton!: ButtonParts;
  private tutorialButton!: ButtonParts;
  private newGameButton!: ButtonParts;
  private prevButton!: ButtonParts;
  private nextButton!: ButtonParts;
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private rotationAngle = 0;
  private selectedChapterIndex = 0;
  private selectedLevelIndex = 0;

  constructor() {
    super('MenuScene');
  }

  create() {
    if (new URLSearchParams(window.location.search).has('autoplay')) {
      this.scene.start('MainScene', { chapter: 0, level: 0 });
      return;
    }

    const progress = playablesPlatform.getProgress();
    this.selectedChapterIndex = Math.min(progress.chapter, Chapters.length - 1);
    this.selectedLevelIndex = Math.min(progress.level, Chapters[this.selectedChapterIndex].levels.length - 1);

    this.bgGraphics = this.add.graphics();
    this.titleText = this.add.text(0, 0, 'GEOMETRY SLICER', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#4488ff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(0, 0, 'Slice shapes. Match areas. Think precisely.', {
      fontSize: '18px',
      color: '#c6d4ea',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    this.statsText = this.add.text(0, 0, '', {
      fontSize: '15px',
      color: '#9fb8dd',
      align: 'center',
    }).setOrigin(0.5);

    this.chapterText = this.add.text(0, 0, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.selectedText = this.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#d8e4ff',
      align: 'center',
    }).setOrigin(0.5);

    this.hintText = this.add.text(0, 0, '', {
      fontSize: '13px',
      color: '#92a4bd',
      align: 'center',
    }).setOrigin(0.5);

    this.prevButton = this.createButton('<', 0x24304d, 66, 54);
    this.nextButton = this.createButton('>', 0x24304d, 66, 54);
    this.playButton = this.createButton('PLAY', 0x4488ff, 210, 68);
    this.tutorialButton = this.createButton('HOW TO PLAY', 0x2f3a52, 190, 52);
    this.newGameButton = this.createButton('NEW GAME', 0x382838, 170, 52);

    this.prevButton.zone.on('pointerup', () => this.changeChapter(-1));
    this.nextButton.zone.on('pointerup', () => this.changeChapter(1));
    this.playButton.zone.on('pointerup', () => this.startSelectedLevel());
    this.tutorialButton.zone.on('pointerup', () => this.scene.start('TutorialScene'));
    this.newGameButton.zone.on('pointerup', () => {
      void playablesPlatform.resetProgress();
      this.selectedChapterIndex = 0;
      this.selectedLevelIndex = 0;
      this.renderMenu();
    });

    this.scale.on('resize', this.resize, this);
    this.resize(this.scale.gameSize);
    this.renderMenu();
    playablesPlatform.notifyFirstFrameReady();
    playablesPlatform.notifyGameReady();
  }

  update() {
    this.rotationAngle += 0.004;
    this.drawBackground();
  }

  private createButton(label: string, color: number, width: number, height: number): ButtonParts {
    const container = this.add.container(0, 0);
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const zone = this.add.zone(0, 0, width, height).setOrigin(0.5).setInteractive({ useHandCursor: true });

    container.add([bg, text, zone]);
    zone.on('pointerdown', () => {
      soundManager.init();
      container.setScale(0.96);
    });
    zone.on('pointerout', () => container.setScale(1));
    zone.on('pointerup', () => {
      soundManager.playClickSound();
      container.setScale(1);
    });

    this.drawButton(bg, color, width, height);
    return { container, bg, text, zone };
  }

  private drawButton(bg: Phaser.GameObjects.Graphics, color: number, width: number, height: number, selected = false) {
    bg.clear();
    bg.fillStyle(color, selected ? 1 : 0.92);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    bg.lineStyle(selected ? 4 : 2, selected ? 0x00ff99 : 0xffffff, selected ? 0.9 : 0.22);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
  }

  private renderMenu() {
    const progress = playablesPlatform.getProgress();
    const totalLevels = this.getTotalLevels();
    const completedLevels = progress.completed ? totalLevels : this.getGlobalIndex(progress.chapter, progress.level);
    const perfects = Object.values(progress.scores).filter(score => score.bestGrade === 'Perfect').length;
    const chapter = Chapters[this.selectedChapterIndex];
    const chapterUnlocked = this.isChapterUnlocked(this.selectedChapterIndex);
    const selectedScore = playablesPlatform.getLevelScore(this.selectedChapterIndex, this.selectedLevelIndex);

    this.statsText.setText(`Progress ${Math.min(completedLevels, totalLevels)} / ${totalLevels}  |  Perfect ${perfects}`);
    this.chapterText.setText(`${this.selectedChapterIndex + 1}. ${chapter.name.toUpperCase()}`);
    this.selectedText.setText(
      chapterUnlocked
        ? `Level ${this.selectedLevelIndex + 1} selected${selectedScore ? `  |  Best ${selectedScore.bestGrade} ${selectedScore.bestAccuracy.toFixed(1)}%` : ''}`
        : 'Chapter locked'
    );
    this.hintText.setText('Tap a level, then play. Replay unlocked levels to improve your grade.');
    this.playButton.text.setText(playablesPlatform.isTutorialCompleted() ? 'PLAY LEVEL' : 'START TUTORIAL');
    this.playButton.container.setAlpha(this.isLevelUnlocked(this.selectedChapterIndex, this.selectedLevelIndex) ? 1 : 0.45);
    this.prevButton.container.setAlpha(this.selectedChapterIndex > 0 ? 1 : 0.35);
    this.nextButton.container.setAlpha(this.selectedChapterIndex < Chapters.length - 1 ? 1 : 0.35);

    this.resize(this.scale.gameSize);
  }

  private renderLevelButtons() {
    this.levelButtons.forEach(button => button.destroy(true));
    this.levelButtons = [];

    const chapter = Chapters[this.selectedChapterIndex];
    const width = this.scale.width;
    const height = this.scale.height;
    const cellSize = Math.min(58, Math.max(42, Math.min(width, height) * 0.09));
    const gap = Math.max(8, cellSize * 0.25);
    const columns = 5;
    const totalWidth = columns * cellSize + (columns - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + cellSize / 2;
    const startY = height * 0.48;

    for (let levelIndex = 0; levelIndex < chapter.levels.length; levelIndex++) {
      const col = levelIndex % columns;
      const row = Math.floor(levelIndex / columns);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      const unlocked = this.isLevelUnlocked(this.selectedChapterIndex, levelIndex);
      const selected = this.selectedLevelIndex === levelIndex;
      const score = playablesPlatform.getLevelScore(this.selectedChapterIndex, levelIndex);
      const container = this.add.container(x, y);
      const bg = this.add.graphics();
      const color = unlocked ? this.getGradeColor(score?.bestGrade) : 0x273044;
      bg.fillStyle(color, unlocked ? 0.95 : 0.35);
      bg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);
      bg.lineStyle(selected ? 4 : 2, selected ? 0xffffff : 0x7f8ba3, selected ? 0.95 : 0.35);
      bg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);

      const number = this.add.text(0, -3, `${levelIndex + 1}`, {
        fontSize: `${Math.max(17, cellSize * 0.36)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const grade = this.add.text(0, cellSize * 0.28, score ? score.bestGrade[0] : unlocked ? '-' : 'X', {
        fontSize: `${Math.max(10, cellSize * 0.18)}px`,
        color: unlocked ? '#d8e4ff' : '#6c7484',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const zone = this.add.zone(0, 0, cellSize, cellSize).setOrigin(0.5);

      if (unlocked) {
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          soundManager.playClickSound();
          this.selectedLevelIndex = levelIndex;
          this.renderMenu();
        });
      }

      container.add([bg, number, grade, zone]);
      this.levelButtons.push(container);
    }
  }

  private startSelectedLevel() {
    if (!this.isLevelUnlocked(this.selectedChapterIndex, this.selectedLevelIndex)) return;

    if (!playablesPlatform.isTutorialCompleted()) {
      this.scene.start('TutorialScene');
      return;
    }

    this.scene.start('MainScene', {
      chapter: this.selectedChapterIndex,
      level: this.selectedLevelIndex,
    });
  }

  private changeChapter(direction: number) {
    const nextIndex = Phaser.Math.Clamp(this.selectedChapterIndex + direction, 0, Chapters.length - 1);
    if (nextIndex === this.selectedChapterIndex) return;

    this.selectedChapterIndex = nextIndex;
    this.selectedLevelIndex = this.getFirstUnlockedLevel(nextIndex);
    this.renderMenu();
  }

  private getFirstUnlockedLevel(chapterIndex: number): number {
    const levels = Chapters[chapterIndex].levels;
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
      if (this.isLevelUnlocked(chapterIndex, levelIndex)) return levelIndex;
    }
    return 0;
  }

  private isChapterUnlocked(chapterIndex: number): boolean {
    return this.isLevelUnlocked(chapterIndex, 0);
  }

  private isLevelUnlocked(chapterIndex: number, levelIndex: number): boolean {
    const progress = playablesPlatform.getProgress();
    if (progress.completed) return true;
    return this.getGlobalIndex(chapterIndex, levelIndex) <= this.getGlobalIndex(progress.chapter, progress.level);
  }

  private getGlobalIndex(chapterIndex: number, levelIndex: number): number {
    if (chapterIndex >= Chapters.length) return this.getTotalLevels();

    let index = 0;
    for (let i = 0; i < chapterIndex; i++) index += Chapters[i].levels.length;
    return index + levelIndex;
  }

  private getTotalLevels(): number {
    return Chapters.reduce((total, chapter) => total + chapter.levels.length, 0);
  }

  private getGradeColor(grade?: string): number {
    if (grade === 'Perfect') return 0x00aa78;
    if (grade === 'Great') return 0x4488ff;
    if (grade === 'Close') return 0xffaa00;
    if (grade === 'Cleared') return 0x7957d5;
    return 0x34415c;
  }

  private drawBackground() {
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;

    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x10131c, 1);
    this.bgGraphics.fillRect(0, 0, width, height);
    this.bgGraphics.lineStyle(2, 0x4488ff, 0.14);

    for (let i = 0; i < 4; i++) {
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

    this.drawBackground();
    this.titleText.setFontSize(Math.max(26, baseScale * 0.075));
    this.titleText.setPosition(cx, height * 0.12);
    this.subtitleText.setFontSize(Math.max(12, baseScale * 0.026));
    this.subtitleText.setPosition(cx, height * 0.19);
    this.statsText.setFontSize(Math.max(12, baseScale * 0.026));
    this.statsText.setPosition(cx, height * 0.25);
    this.chapterText.setFontSize(Math.max(18, baseScale * 0.045));
    this.chapterText.setPosition(cx, height * 0.34);
    this.selectedText.setFontSize(Math.max(13, baseScale * 0.028));
    this.selectedText.setPosition(cx, height * 0.40);
    this.hintText.setFontSize(Math.max(11, baseScale * 0.022));
    this.hintText.setWordWrapWidth(width * 0.84);
    this.hintText.setPosition(cx, height * 0.91);

    this.prevButton.container.setPosition(Math.max(42, width * 0.14), height * 0.34);
    this.nextButton.container.setPosition(Math.min(width - 42, width * 0.86), height * 0.34);
    this.playButton.container.setPosition(cx, height * 0.72);
    this.tutorialButton.container.setPosition(cx - Math.min(120, width * 0.23), height * 0.82);
    this.newGameButton.container.setPosition(cx + Math.min(120, width * 0.23), height * 0.82);

    this.drawButton(this.playButton.bg, 0x4488ff, 210, 68);
    this.drawButton(this.tutorialButton.bg, 0x2f3a52, 190, 52);
    this.drawButton(this.newGameButton.bg, 0x382838, 170, 52);
    this.drawButton(this.prevButton.bg, 0x24304d, 66, 54);
    this.drawButton(this.nextButton.bg, 0x24304d, 66, 54);

    this.playButton.text.setFontSize(Math.max(18, baseScale * 0.038));
    this.tutorialButton.text.setFontSize(Math.max(13, baseScale * 0.026));
    this.newGameButton.text.setFontSize(Math.max(13, baseScale * 0.026));
    this.prevButton.text.setFontSize(Math.max(22, baseScale * 0.045));
    this.nextButton.text.setFontSize(Math.max(22, baseScale * 0.045));
    this.renderLevelButtons();
  }
}
