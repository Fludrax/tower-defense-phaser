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

## Controls

- Click an empty tile to place a tower (costs 20)
- Press `P` to pause/resume
- Press `1` or `2` to set game speed

## Gameplay

- Waves of 5 enemies spawn every 10 seconds and follow the highlighted path.
- Losing a life occurs when an enemy reaches the path end; defeating one grants money.

## Deployment

Pushing to `main` builds and deploys the site to GitHub Pages automatically.
