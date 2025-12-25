# Christmas Games (Multiplayer Web)

Simple party social deduction game built with Expo web, deployed on Vercel.

## Quick start
1. Install deps: `npm install`
2. Add env vars (Vercel/locally):  
   - `EXPO_PUBLIC_SUPABASE_URL`  
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Run locally: `npm run dev`
4. Build for Vercel: `npm run build:web`

## How to play (multi-device)
- Host opens the Vercel link, taps **Create Party** (gets a 6‑digit code).
- Friends open the same link on their phones, enter the code to join.
- Host edits names in the lobby and taps **Start Game**.
- Each player sees their own handout when it’s their turn; others see “Stand by”.
- Host taps **Next Player** to advance through handouts/rounds.

## Repo notes
- Realtime sync via Supabase Realtime channels (client only).
- New files: `src/lib/supabase.js`, `src/hooks/usePartyState.js`, `src/screens/PartyScreen.js`.
