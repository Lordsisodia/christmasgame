# Christmas Games (Multiplayer Web)

Simple party social deduction game built with Expo web, deployed on Vercel.

## Quick start
1. Install deps: `npm install`
2. (Optional, for multi-device) Add env vars:  
   - `EXPO_PUBLIC_SUPABASE_URL`  
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Run locally: `npm run dev`
4. Build for Vercel: `npm run build:web`

## How to play
- **Multi-device (requires Supabase envs):** Host creates a party; friends join with the code. Roles are shown on each device in turn. Host advances players/rounds.
- **Single-device fallback (no envs):** App automatically switches to pass-the-phone mode; everyone plays on one device.

## Repo notes
- Realtime sync via Supabase Realtime channels (client only).
- New files: `src/lib/supabase.js`, `src/hooks/usePartyState.js`, `src/screens/PartyScreen.js`.
