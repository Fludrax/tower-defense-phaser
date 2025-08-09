# tower-defense-phaser

Tower Defense game built with Phaser 3 + TypeScript using Vite.

## Commands

- `npm run dev` – start Vite dev server
- `npm run build` – build for production
- `npm run preview` – locally preview the build
- `npm run lint` – run ESLint
- `npm run format` – format code with Prettier
- `npm run typecheck` – check TypeScript types
- `npm test` – run unit tests

## Gameplay

Use the toolbar to choose actions:

- **Build** Arrow, Cannon or Frost towers. After placement the cursor returns to normal.
- **Upgrade** or **Sell** an existing tower.
- Escape or right-click cancels the current mode.

Enemy speed now starts slow and ramps up gradually each wave.

## Audio

All sound effects are generated via WebAudio and can be muted or adjusted in the Settings panel.

## Deployment

Pushing to `main` builds and deploys the site to GitHub Pages automatically.
