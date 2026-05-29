import type Phaser from 'phaser';
import { soundManager } from './SoundManager';

export type AnalyticsEvent =
  | 'session_start'
  | 'tutorial_complete'
  | 'level_start'
  | 'slice'
  | 'level_complete'
  | 'level_fail'
  | 'restart';

export interface LevelScore {
  bestAccuracy: number;
  bestGrade: string;
  bestCutsUsed: number;
  attempts: number;
  completions: number;
}

export interface GameAnalytics {
  sessions: number;
  levelStarts: number;
  slices: number;
  levelCompletions: number;
  levelFailures: number;
  restarts: number;
}

export interface GameProgress {
  chapter: number;
  level: number;
  completed: boolean;
  tutorialCompleted: boolean;
  scores: Record<string, LevelScore>;
  analytics: GameAnalytics;
  version: number;
}

const SAVE_KEY = 'geometrySlicerProgress';
const SAVE_VERSION = 2;

const DEFAULT_ANALYTICS: GameAnalytics = {
  sessions: 0,
  levelStarts: 0,
  slices: 0,
  levelCompletions: 0,
  levelFailures: 0,
  restarts: 0,
};

const DEFAULT_PROGRESS: GameProgress = {
  chapter: 0,
  level: 0,
  completed: false,
  tutorialCompleted: false,
  scores: {},
  analytics: { ...DEFAULT_ANALYTICS },
  version: SAVE_VERSION,
};

function getYtGame() {
  return globalThis.ytgame;
}

export function getLevelKey(chapter: number, level: number): string {
  return `${chapter}:${level}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeIndex(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function normalizeScores(value: unknown): Record<string, LevelScore> {
  if (!isPlainObject(value)) return {};

  const scores: Record<string, LevelScore> = {};
  for (const [key, score] of Object.entries(value)) {
    if (!isPlainObject(score)) continue;

    scores[key] = {
      bestAccuracy: typeof score.bestAccuracy === 'number' ? score.bestAccuracy : 0,
      bestGrade: typeof score.bestGrade === 'string' ? score.bestGrade : 'Cleared',
      bestCutsUsed: typeof score.bestCutsUsed === 'number' ? score.bestCutsUsed : 0,
      attempts: typeof score.attempts === 'number' ? score.attempts : 0,
      completions: typeof score.completions === 'number' ? score.completions : 0,
    };
  }

  return scores;
}

function normalizeAnalytics(value: unknown): GameAnalytics {
  if (!isPlainObject(value)) return { ...DEFAULT_ANALYTICS };

  return {
    sessions: typeof value.sessions === 'number' ? value.sessions : 0,
    levelStarts: typeof value.levelStarts === 'number' ? value.levelStarts : 0,
    slices: typeof value.slices === 'number' ? value.slices : 0,
    levelCompletions: typeof value.levelCompletions === 'number' ? value.levelCompletions : 0,
    levelFailures: typeof value.levelFailures === 'number' ? value.levelFailures : 0,
    restarts: typeof value.restarts === 'number' ? value.restarts : 0,
  };
}

function normalizeProgress(progress: unknown): GameProgress {
  if (!isPlainObject(progress)) return { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS } };

  return {
    chapter: normalizeIndex(progress.chapter),
    level: normalizeIndex(progress.level),
    completed: Boolean(progress.completed),
    tutorialCompleted: Boolean(progress.tutorialCompleted),
    scores: normalizeScores(progress.scores),
    analytics: normalizeAnalytics(progress.analytics),
    version: SAVE_VERSION,
  };
}

function parseProgress(data: string | null | undefined): GameProgress {
  if (!data) return { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS }, scores: {} };

  try {
    return normalizeProgress(JSON.parse(data));
  } catch {
    return { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS }, scores: {} };
  }
}

class PlayablesPlatform {
  private progress: GameProgress = { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS }, scores: {} };
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
        this.progress = { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS }, scores: {} };
        ytgame.health?.logWarning?.('Geometry Slicer could not load cloud save data.');
      }
    } else {
      this.progress = parseProgress(localStorage.getItem(SAVE_KEY));
    }

    this.initialized = true;
    this.trackEvent('session_start');
  }

  getProgress(): GameProgress {
    return {
      ...this.progress,
      analytics: { ...this.progress.analytics },
      scores: { ...this.progress.scores },
    };
  }

  getLevelScore(chapter: number, level: number): LevelScore | undefined {
    return this.progress.scores[getLevelKey(chapter, level)];
  }

  hasProgress(): boolean {
    return this.progress.completed || this.progress.chapter > 0 || this.progress.level > 0;
  }

  isTutorialCompleted(): boolean {
    return this.progress.tutorialCompleted;
  }

  async markTutorialCompleted(): Promise<void> {
    this.progress.tutorialCompleted = true;
    this.trackEvent('tutorial_complete');
    await this.persist();
  }

  async setCurrentProgress(chapter: number, level: number, completed = false): Promise<void> {
    this.progress.chapter = normalizeIndex(chapter);
    this.progress.level = normalizeIndex(level);
    this.progress.completed = completed;
    await this.persist();
  }

  async saveLevelResult(
    chapter: number,
    level: number,
    accuracy: number,
    grade: string,
    cutsUsed: number,
    nextProgress?: { chapter: number; level: number; completed: boolean }
  ): Promise<void> {
    const key = getLevelKey(chapter, level);
    const previous = this.progress.scores[key];

    this.progress.scores[key] = {
      bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
      bestGrade: !previous || accuracy >= previous.bestAccuracy ? grade : previous.bestGrade,
      bestCutsUsed: previous?.bestCutsUsed
        ? Math.min(previous.bestCutsUsed, cutsUsed)
        : cutsUsed,
      attempts: previous?.attempts ?? 0,
      completions: (previous?.completions ?? 0) + 1,
    };

    if (nextProgress) {
      this.progress.chapter = normalizeIndex(nextProgress.chapter);
      this.progress.level = normalizeIndex(nextProgress.level);
      this.progress.completed = nextProgress.completed;
    }

    this.trackEvent('level_complete');
    await this.persist();
  }

  async recordAttempt(chapter: number, level: number): Promise<void> {
    const key = getLevelKey(chapter, level);
    const previous = this.progress.scores[key];
    this.progress.scores[key] = {
      bestAccuracy: previous?.bestAccuracy ?? 0,
      bestGrade: previous?.bestGrade ?? 'Uncleared',
      bestCutsUsed: previous?.bestCutsUsed ?? 0,
      attempts: (previous?.attempts ?? 0) + 1,
      completions: previous?.completions ?? 0,
    };
    this.trackEvent('level_start');
    await this.persist();
  }

  trackEvent(event: AnalyticsEvent): void {
    if (event === 'session_start') this.progress.analytics.sessions++;
    if (event === 'level_start') this.progress.analytics.levelStarts++;
    if (event === 'slice') this.progress.analytics.slices++;
    if (event === 'level_complete') this.progress.analytics.levelCompletions++;
    if (event === 'level_fail') this.progress.analytics.levelFailures++;
    if (event === 'restart') this.progress.analytics.restarts++;
  }

  async saveAnalytics(): Promise<void> {
    await this.persist();
  }

  async resetProgress(): Promise<void> {
    this.progress = { ...DEFAULT_PROGRESS, analytics: { ...DEFAULT_ANALYTICS }, scores: {} };
    await this.persist();
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
      soundManager.setMuted(!isAudioEnabled);
    };

    applyAudioSetting();
    ytgame.system.onAudioEnabledChange(applyAudioSetting);

    ytgame.system.onPause(() => {
      void this.persist();
      soundManager.suspend();
      game.sound.pauseAll();
      game.loop.sleep();
    });

    ytgame.system.onResume(() => {
      applyAudioSetting();
      soundManager.resume();
      game.sound.resumeAll();
      game.loop.wake();
    });
  }

  private async persist(): Promise<void> {
    const data = JSON.stringify(this.progress);
    const ytgame = getYtGame();

    if (ytgame?.IN_PLAYABLES_ENV) {
      if (!this.cloudSaveReady) return;

      try {
        await ytgame.game.saveData(data);
      } catch {
        ytgame.health?.logWarning?.('Geometry Slicer could not save progress.');
      }
      return;
    }

    localStorage.setItem(SAVE_KEY, data);
  }
}

export const playablesPlatform = new PlayablesPlatform();
