# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test framework is configured.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon/public key
VITE_ANTHROPIC_API_KEY=  # Used server-side only (Vercel function)
```

`ANTHROPIC_API_KEY` is a server-side env var consumed by `api/generate-itinerary.ts` (Vercel serverless function). It is **not** exposed to the frontend via `VITE_` prefix.

## Architecture

**Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4 (via `@tailwindcss/vite` plugin), Supabase (auth + database), Zustand (state), React Router v7, Vercel for deployment.

### Data layer

All database access goes through `src/lib/supabase.ts` (a thin Supabase client wrapper). There is no ORM or query builder abstraction — raw Supabase JS calls are made directly from pages and hooks.

Supabase tables in use: `profiles`, `trips`, `destinations`, `trip_members`, `member_preferences`, `expenses`, `documents`, `itineraries`.

### State management

`src/store/tripStore.ts` — Zustand store used **only** during the multi-step trip creation flow (`CreateTrip`). It holds transient form state across the 4 steps (Info → Destinations → Accommodation → Preferences) and is reset after submission. Everything else uses local `useState`.

### AI itinerary generation

`src/lib/claude.ts` builds a Spanish-language prompt from trip/member data and POSTs it to `/api/generate-itinerary` (Vercel serverless function at `api/generate-itinerary.ts`). That function calls the Anthropic API directly using `claude-haiku-4-5`. The response is parsed JSON matching `GeneratedItinerary` type. The generated itinerary is stored in Supabase (`itineraries` table) and loaded on `TripDetail`.

### Page structure & routing

Auth is managed in `App.tsx` via `supabase.auth.onAuthStateChange`. Protected routes redirect to `/auth`; authenticated users redirect away from `/` and `/auth`.

| Route                  | Page                  | Notes                                                    |
| ---------------------- | --------------------- | -------------------------------------------------------- |
| `/`                    | `Landing`             | Public marketing page                                    |
| `/auth`                | `Auth`                | Login/signup                                             |
| `/dashboard`           | `Dashboard`           | Lists user's trips                                       |
| `/trips/new`           | `CreateTrip`          | 4-step wizard, uses `tripStore`                          |
| `/trips/:id`           | `TripDetail`          | Main trip view — itinerary, expenses, documents, members |
| `/preferences/:tripId` | `TravelerPreferences` | Per-member preference form                               |
| `/invite/:token`       | `InvitePage`          | Token-based invite acceptance                            |
| `/reset-password`      | `ResetPassword`       | Public                                                   |

### Key components

- `ExpenseDrawer` / `DocumentDrawer` — slide-in drawers for adding expenses and documents within `TripDetail`.
- `src/hooks/useExpenses.ts` — fetches/adds/deletes expenses for a trip, groups by date, computes totals by currency.
- `src/hooks/useDocuments.tsx` — same pattern for documents.
- `src/constants/tripOptions.tsx` — `FOOD_OPTIONS`, `ACTIVITY_OPTIONS`, `PACE_OPTIONS` arrays used across `CreateTrip` and `TripDetail`.
- `src/components/Icons/` — custom SVG icon components.

### Member roles

Members have roles: `owner`, `co-organizer`, or `traveler`. Role is checked in `TripDetail` (`currentUserRole`) to gate edit/delete actions.

Antes de hacer cualquier cambio, siempre trabaja en modo Plan. Muéstrame exactamente qué archivos vas a modificar y qué cambios harás en cada uno. No apliques nada hasta que yo confirme explícitamente. Si en algún momento no estás seguro de algo, pregúntame antes de proceder. Trabaja un cambio a la vez.
