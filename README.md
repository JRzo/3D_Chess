# 3D Chess — Gamified

A lightweight gamified 3D Chess demo built with React + Three.js ([@react-three/fiber]).

Features:
- Multi-level stacked boards to explore vertical gameplay
- Gamification: XP, Levels, Ranks, Achievements
- Polished HUD overlay and controls

Quick start

1. Install dependencies

```bash
cd c:/Users/julio/Documents/projects/3D_Chess
npm install
```

2. Run dev server

```bash
npm run dev
```

Open the local dev URL printed by Vite. Use the HUD to simulate moves and earn XP.

Files of interest

- [src/Game.jsx](src/Game.jsx#L1) — main scene + HUD
- [src/Board.jsx](src/Board.jsx#L1) — stacked board rendering
- [src/gamification.js](src/gamification.js#L1) — XP/levels/rank logic

Next steps you might ask me to do

- Add real chess rules and multiplayer
- Add animations, piece models, and sound
- Add matchmaking and persistent profile backend

