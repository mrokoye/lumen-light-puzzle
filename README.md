# lumen-light-puzzle

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/mrokoye/lumen-light-puzzle/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/mrokoye/lumen-light-puzzle/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

LUMEN is a light-bending puzzle game: rotate mirrors, splitters and coloured filters to guide beams of light into every lantern across twelve handcrafted boards, chasing three stars on each.

## Run it

```sh
python3 -m http.server --directory game 8080
```

Then open http://localhost:8080 in a desktop browser. No build step, no network: the game is plain static files under `game/`.

## How it plays

Click a mirror or splitter to rotate it. Beams bend at mirrors, split at splitters, and change colour through filters. Light every lantern to finish a level — finish at par or better for three stars. Twelve levels, from First Light to the Grand Finale, with undo, reset, level select, best scores kept in your browser, and synthesized sound (no audio files).

## Layout

- `game/index.html` — page shell, HUD and menus
- `game/src/main.js` — boot and the one loop
- `game/src/game.js` — rules, screens, scoring
- `game/src/beams.js` — beam tracing and the level solver
- `game/src/levels.js` — the twelve boards
- `game/src/render.js` — all canvas drawing
- `game/src/input.js` — mouse and keyboard
- `game/src/audio.js` — synthesized sound
- `game/src/shots.js` — the staged screenshot scenes
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes the dossier

---

<sub>Entered on [make.fun](https://make.fun/?ref=x4xtfz37&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
