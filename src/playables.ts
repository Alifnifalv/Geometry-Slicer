import type Phaser from 'phaser';

export interface GameProgress {
  chapter: number;
  level: number;
  completed?: boolean;
  version?: number;
}

const SAVE_KEY = 'geometrySlicerProgress';
const DEFAULT_PROGRESS: Required<GameProgress> = {
  chapter: 0,
  level: 0,
  completed: false,
  version: 1,
};

function getYtGame() {
  return globalThis.ytgame;
}

function normalizeProgress(progress: Partial<GameProgress>): Required<GameProgress> {
  const chapter = Number.isFinite(progress.chapter) ? Math.max(0, Math.floor(progress.chapter ?? 0)) : 0;
  const level = Number.isFinite(progress.level) ? Math.max(0, Math.floor(progress.level ?? 0)) : 0;

  return {
    chapter,
    level,
    completed: Boolean(progress.completed),
    version: 1,
  };
}

function parseProgress(data: string | null | undefined): Required<GameProgress> {
  if (!data) return { ...DEFAULT_PROGRESS };

  try {
    const parsed = JSON.parse(data) as Partial<GameProgress>;
    return normalizeProgress(parsed);
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

class PlayablesPlatform {
  private progress: Required<GameProgress> = { ...DEFAULT_PROGRESS };
  private initialized = false;
  private cloudSaveReady = false;
  private firstFrameNotified = false;
  private gameReadyNotified = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const ytgame = getYtGame();
    if (ytgame?.IN_PLAYABLES_ENV) {
      try {
        this.progress = parseProgress(await ytgame.game.loadData());
        this.cloudSaveReady = true;
      } catch {
        this.progress = { ...DEFAULT_PROGRESS };
        ytgame.health?.logWarning?.('Geometry Slicer could not load cloud save data.');
      }
    } else {
      this.progress = parseProgress(localStorage.getItem(SAVE_KEY));
    }

    this.initialized = true;
  }

  getProgress(): Required<GameProgress> {
    return { ...this.progress };
  }

  hasProgress(): boolean {
    return this.progress.completed || this.progress.chapter > 0 || this.progress.level > 0;
  }

  async saveProgress(progress: GameProgress): Promise<void> {
    this.progress = normalizeProgress(progress);

    const ytgame = getYtGame();
    if (ytgame?.IN_PLAYABLES_ENV) {
      if (!this.cloudSaveReady) return;

      try {
        await ytgame.game.saveData(JSON.stringify(this.progress));
      } catch {
        ytgame.health?.logWarning?.('Geometry Slicer could not save cloud progress.');
      }
      return;
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(this.progress));
  }

  async resetProgress(): Promise<void> {
    this.progress = { ...DEFAULT_PROGRESS };

    const ytgame = getYtGame();
    if (ytgame?.IN_PLAYABLES_ENV) {
      await this.saveProgress(this.progress);
      return;
    }

    localStorage.removeItem(SAVE_KEY);
  }

  notifyFirstFrameReady(): void {
    if (this.firstFrameNotified) return;

    const ytgame = getYtGame();
    if (ytgame?.IN_PLAYABLES_ENV) {
      ytgame.game.firstFrameReady();
    }

    this.firstFrameNotified = true;
  }

  notifyGameReady(): void {
    if (this.gameReadyNotified) return;

    if (!this.firstFrameNotified) {
      this.notifyFirstFrameReady();
    }

    const ytgame = getYtGame();
    if (ytgame?.IN_PLAYABLES_ENV) {
      ytgame.game.gameReady();
    }

    this.gameReadyNotified = true;
  }

  configureRuntime(game: Phaser.Game): void {
    const ytgame = getYtGame();
    if (!ytgame?.IN_PLAYABLES_ENV) return;

    const applyAudioSetting = (isAudioEnabled = ytgame.system.isAudioEnabled()) => {
      game.sound.mute = !isAudioEnabled;
    };

    applyAudioSetting();
    ytgame.system.onAudioEnabledChange(applyAudioSetting);

    ytgame.system.onPause(() => {
      void this.saveProgress(this.progress);
      game.sound.pauseAll();
      game.loop.sleep();
    });

    ytgame.system.onResume(() => {
      applyAudioSetting();
      game.sound.resumeAll();
      game.loop.wake();
    });
  }
}

export const playablesPlatform = new PlayablesPlatform();
