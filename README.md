# Christmas Games (Multiplayer Web)

Simple party social deduction game built with Expo web, deployed on Vercel.

## Quick start
1. Install deps: `npm install`
2. Run locally (web): `npm run dev`
   - Optional: set `EXPO_PUBLIC_API_BASE=https://<your-vercel-domain>` so local dev hits the deployed function.
3. Build for Vercel: `npm run build:web`

## How to play
- **Multi-device:** Host creates a session code, friends join on their phones, first join becomes admin.
- **Admin flow:** Admin starts the game, can eliminate (“kill”) players, then advances to the next round to deal new words.

## Repo notes
- Multiplayer state is stored in-memory inside the Vercel Serverless Function at `api/multiplayer.js` (no database).
- This is best-effort for party play: serverless instances can restart or scale, which can reset/split sessions.
