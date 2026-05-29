# YouTube Playables Notes

Geometry Slicer has a Playables-compatible production bundle flow.

## Build upload bundle

```powershell
npm run build:playables
```

Output:

```text
artifacts/geometry-slicer-youtube-playables.zip
```

The zip root contains `index.html` and the generated assets folder.

## Implemented integration

- Loads the YouTube Playables SDK before game code.
- Calls `ytgame.game.firstFrameReady()` and `ytgame.game.gameReady()` from the first interactive menu scene.
- Uses `ytgame.game.loadData()` and `ytgame.game.saveData()` for progress when running inside Playables.
- Keeps local browser saves on `localStorage` when outside Playables.
- Handles YouTube audio mute state and pause/resume callbacks.
- Uses relative asset paths in the production bundle.
- Includes draft portal assets: `public/playables-icon.svg` and `public/playables-thumbnail.svg`.
- Tracks lightweight gameplay counters in save data: sessions, level starts, slices, completions, failures, and restarts.

## Remaining publishing step

YouTube Playables publishing currently requires approved Developer Portal / Partner Manager access. Upload the generated zip through that portal and run the YouTube Playables test suite there before release.
