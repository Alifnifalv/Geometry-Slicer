export {};

interface YouTubePlayablesSdk {
  IN_PLAYABLES_ENV: boolean;
  SDK_VERSION: string;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string>;
    saveData(data: string): Promise<void>;
  };
  system: {
    getLanguage(): string;
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): void;
    onPause(callback: () => void): void;
    onResume(callback: () => void): void;
  };
  health?: {
    logError?(message: string): void;
    logWarning?(message: string): void;
  };
}

declare global {
  var ytgame: YouTubePlayablesSdk | undefined;
}
