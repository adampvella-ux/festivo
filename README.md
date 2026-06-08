# Festivo Web

Festivo is a map-first cultural intelligence experience for discovering global festivals and holidays.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- Mapbox GL JS

## Local Setup

1. Install Node.js 20+.
2. Install dependencies:
   - `npm install`
3. Create env file:
   - Copy `.env.example` to `.env.local`
   - Add `NEXT_PUBLIC_MAPBOX_TOKEN`
4. Start dev server:
   - `npm run dev`

## MVP Features Included

- Global atmospheric map shell with marker intensity colors
- Lens, type, continent, and time filters
- Ranked sidebar results
- Event detail overlay
- Save events to localStorage
- Compare list state (up to 3 festivals)

## Add Festival Data

The app reads festival records from:

- `src/data/festivals.ts`

Use this template as a guide:

- `src/data/festival-entry-template.ts`
- Candidate backlog list is stored in:
  - `src/data/festival-ideas.ts`

Quick process:

1. Copy an existing item in `festivals.ts`.
2. Replace all fields with your new event data.
3. Keep score values in the `1-5` range.
4. Keep `id` and `slug` unique.
5. Save file and refresh the app.

### Suggested enrichment workflow

1. Pick 10 festivals from `festival-ideas.ts`.
2. Add complete records into `festivals.ts`.
3. Verify in UI (map marker, sidebar card, overlay details).
4. Repeat in batches to grow the catalog safely.
