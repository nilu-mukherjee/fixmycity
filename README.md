# FixMyCity AI

An AI agent that turns citizen complaints — a photo, a location, an urgency note — into verified, prioritized, routed civic repair tickets.

Citizens report a pothole, an overflowing bin, a broken streetlight, or similar from a **Flutter mobile app**. A **Genkit** flow on this repo's backend runs the report through Gemini Vision, decides for itself whether to check for duplicate reports nearby (a real tool call, not a hard-coded step), estimates severity in light of what it finds, and returns an editable "presubmit" ticket for the citizen to approve. Once approved, the ticket lands in **Postgres (Cloud SQL)** and is visible on the citizen's status page and on this repo's admin dashboard.

Built for the [All Things Agentic Hackathon](https://allthingsagentichackathon.devpost.com/).

## Architecture

```
android_app/           Flutter citizen app (separate codebase, Dart)
  lib/services/         HttpReportApi — talks to the backend below over HTTP
  lib/screens/           Capture → AI presubmit review → ticket status

src/                   TanStack Start web app: admin dashboard + backend/API
  routes/admin.tsx       Admin console (issue queue, filters, ticket detail)
  genkit/report-flow.ts  The agent: Gemini Vision + findNearbyReports tool
  orpc/router/reports.ts oRPC procedures exposed at /api/rpc and /api (OpenAPI)
  lib/tickets.ts          Ticket data access (Prisma)
  lib/drafts.ts           Presubmit-draft data access (Prisma)

prisma/                 Data models — Ticket, PresubmitDraft, Better Auth's
  schema.prisma           User/Session/Account/Verification, all in Cloud SQL
```

Pipeline: citizen report → Genkit flow → Gemini Vision classification → the model itself calls a `findNearbyReports` tool to check for duplicates → severity/description informed by that result → deterministic trust score + department routing (mocked, no real municipal integration) → presubmit shown to citizen for edits → approve → ticket created in Postgres.

### Why this stack

- **Cloud SQL (Postgres) via Prisma** for all data — tickets, presubmit drafts, and Better Auth's user/session tables all live in one GCP-native database, no third-party hosted service involved. The admin dashboard polls (`refetchInterval`, a few seconds) rather than getting live push updates — a deliberate tradeoff for staying on plain Postgres instead of adding a separate real-time layer.
- **Google Cloud Storage** holds the actual photo bytes — citizen photos never touch the database, just their GCS object name.
- **Genkit** for the agent flow, calling **Gemini** (`gemini-3.6-flash`) — deployed as a container on **Cloud Run** (see Deployment below).
- Trust score (image clarity, GPS accuracy, corroborating nearby reports, recency) is computed deterministically in code, not left to the LLM, so the scoring rubric stays auditable.

## Prerequisites

- Node.js 20+, npm
- A Postgres database (e.g. a [Cloud SQL](https://cloud.google.com/sql/docs/postgres) instance)
- A [Gemini API key](https://aistudio.google.com/apikey) with billing/prepay enabled (the free tier's request quota is easy to exhaust during development)
- [Flutter](https://flutter.dev) SDK, if running the citizen app

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in:
   ```
   DATABASE_URL=            # your Postgres connection string
   GEMINI_API_KEY=          # from Google AI Studio
   ```
3. Push the schema to Postgres:
   ```bash
   npm run db:generate
   npm run db:push
   ```
4. In another terminal, start the backend:
   ```bash
   npm run dev
   ```
   The backend listens on port 3000, bound to localhost only. If the Flutter app runs on a separate device (physical phone, LAN, VPN), expose it on all interfaces instead:
   ```bash
   npx dotenv -e .env.local -- sh -c "NODE_OPTIONS='--import ./instrument.server.mjs' vite dev --port 3000 --host 0.0.0.0"
   ```

### Running the Flutter app

```bash
cd android_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://<backend-host>:3000
```

`API_BASE_URL` defaults to `http://10.0.2.2:3000` (the Android emulator's alias for the host machine) if omitted — override it for a physical device or a deployed backend.

## Admin dashboard

`npm run dev` and open `http://localhost:3000` — it redirects to `/admin`, the issue queue: filter/sort tickets by status, category, severity, and department; open a ticket for its full detail panel (photo, trust score breakdown, location) and advance its status.

## Verifying the agent's tool use

The `findNearbyReports` tool call is logged server-side, so you can watch the model decide to invoke it:

```
[agent] findNearbyReports(pothole @ 12.9716,77.5946) -> 3 match(es)
```

The same photo and note submitted at a location with existing nearby reports vs. an isolated one produces different `severity` values — the model is incorporating retrieved context into its own judgment, not running a fixed sequence.

## Deployment

Target: Google Cloud Run, as a container. Not yet wired up — a `Dockerfile` and Cloud Run deploy config are still to be added.

## Commands

```bash
npm run dev              # start dev server (port 3000)
npm run build             # production build
npm run start              # run the production build
npm run lint                # eslint
npm run format               # prettier --write . && eslint --fix
npm run check                 # prettier --check .
npm run db:studio               # Prisma studio — browse/edit the Postgres data
```

See `CLAUDE.md` for the full architecture writeup and `project.md` for the original product spec.
