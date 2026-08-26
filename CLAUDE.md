# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

FixMyCity AI is a **hackathon (Devpost) project**: an AI agent that turns citizen complaints into verified, prioritized, routed civic repair tickets. Full pitch and MVP spec in `project.md` — re-read it if it's been edited, it's the living spec.

Citizens submit a report (photo, short description or voice note, location, urgency) **from a Flutter app** — a separate codebase/repo, not this repo's web frontend and not a wrapper around it. This repo (TanStack Start) is the **admin dashboard + backend/API**. The system runs an agentic workflow, implemented as a **Genkit flow** on the backend:

**Citizen report (Flutter app, photo captured) → Genkit flow → Gemini Vision → issue classification → severity score → duplicate check tool → department routing → presubmit ticket summary (user reviews/edits) → user approves → ticket created.**

Object detection is **server-side only** (Gemini Vision, after the photo is captured) — the camera is a plain capture UI, not a live/on-device detector. The user always sees and can edit the AI's classification (category, severity, description, location) before the ticket is finalized ("presubmit" step).

That end-to-end "AI doing work" (not a chatbot) is the core pitch. The Flutter app talks to this backend over HTTP to submit reports and read ticket status; the admin dashboard reads the same backend/data directly.

MVP scope called out in `project.md` (build only this, in a 24-48 hour window):
- Report submission form + image upload
- AI category/severity detection (categories: pothole, garbage, streetlight, drainage, water leakage, road blockage, unsafe footpath; severity: low/medium/high/emergency)
- Duplicate grouping by location + category
- Admin dashboard (open issues, priority areas, duplicate clusters, department-wise pending tickets, map/list view, SLA status)
- Public citizen status page (received → verified → assigned → in progress → resolved)
- Demo video

**Explicit constraint from the spec: do not build real government/municipal integration — department routing must be mocked.**

`project.md` also calls out a **trust score** as an "extra winning feature" — a per-complaint score summing: clear image +30, exact location +30, multiple nearby reports +25, recent report +15. It's meant to be computable from signals already captured at report time (image quality, location precision, duplicate/nearby-report count, report recency) — no extra user input required.

`project.md`'s suggested tech stack (React/Next.js + TypeScript + Tailwind, FastAPI or Node.js, Supabase/PostgreSQL, Supabase Storage/S3, Gemini/OpenAI vision model, Google Maps/Mapbox/OSM, LangGraph or a custom agent workflow engine, email/WhatsApp mock notifications) is a suggestion, not a mandate — this repo's actual scaffold (TanStack Start, Prisma/Postgres, Convex, `@tanstack/ai-*` packages for Gemini/OpenAI/Anthropic/Ollama) already covers most of it; no maps or agent-workflow library is wired in yet. Confirm with the user before introducing FastAPI, Supabase, or LangGraph — they'd be additions alongside, not replacements for, what's already scaffolded.

Deferred to post-MVP (per `project.md`'s "what's next," don't build unprompted): map-based issue clustering, WhatsApp reporting, multilingual support, real-time department dashboards, SLA tracking analytics, hotspot analytics, and image-similarity/timing-based duplicate detection improvements.

### Data store: Convex (not Prisma/Postgres)

Decided: reports/tickets live in **Convex**, not Prisma/Postgres — resolving the "two parallel data layers" ambiguity noted below in favor of Convex for this feature. Prisma/Postgres stays as unused scaffold unless a specific relational/SQL need comes up later. Why Convex: built-in file storage (no separate GCS/S3 setup for citizen photos), reactive queries (live citizen-status and admin-dashboard updates without hand-rolled polling/websockets), it's already the more deeply wired provider (`ConvexProvider` wraps the whole root route), and fast TS iteration fits the short build window. Duplicate-by-location checks: a haversine-distance function inside a Convex query, no PostGIS needed at this scale.

### Auth: Google + Microsoft social login

Citizens and admins authenticate via **Google and Microsoft** social sign-in through Better Auth's `socialProviders` (`src/lib/auth.ts` currently only has `emailAndPassword` — needs provider config + OAuth client credentials as env vars added). No email/password flow is planned for citizens.

### Deployment target

Google Cloud Run, as a container, hosting the backend (including the Genkit flow) — not Vertex AI Agent Builder/ADK. Needs: a `Dockerfile`, the Genkit dependency (not yet installed — supersedes the earlier plan to call Gemini directly via `@tanstack/ai-gemini`; confirm with the user whether to keep `@tanstack/ai-gemini` for anything or fully replace it with Genkit), a `GEMINI_API_KEY` env var, and Cloud Run deploy config — none of which exist yet.

### Client split

This repo is the **web side only**: admin dashboard + backend/API (including the Genkit flow, once added). The citizen-facing client is a **separate Flutter app** (its own repo/codebase, Dart, not a wrapper around this web app) — it POSTs reports (photo, description/voice note, location, urgency) to this backend and reads back ticket/status data. Don't build a citizen-facing report form in the TanStack Start web UI unless asked — that's the Flutter app's job.

## Project status

This is a freshly scaffolded [TanStack Start](https://tanstack.com/start) app (created via `create-tanstack-app`, see `.cta.json` for the exact add-on list). Almost everything currently in `src/`, `convex/`, and `prisma/` is unmodified starter/demo code (todo lists, placeholder routes) — none of the product features above are implemented yet. Treat existing files as scaffolding to build on or replace, not as established product conventions.

The project has **two parallel data layers wired in side by side** (Convex and Prisma/Postgres) plus **two parallel API layers** (oRPC and a raw MCP route) — this is an artifact of the scaffold choosing many add-ons, not a deliberate architecture. Confirm with the user which stack to actually build on before assuming both are meant to stay.

## Commands

```bash
npm run dev              # start dev server on port 3000 (loads .env.local, wraps in Sentry instrumentation)
npm run build            # vite build + copy Sentry instrumentation into .output/server
npm run start            # run the production build (.output/server)
npm run preview           # vite preview

npm run lint              # eslint
npm run format             # prettier --write . && eslint --fix
npm run check              # prettier --check .

npm run generate-routes    # regenerate src/routeTree.gen.ts from src/routes (tsr generate)

npm run db:generate        # prisma generate (loads .env.local)
npm run db:push            # prisma db push
npm run db:migrate         # prisma migrate dev
npm run db:studio          # prisma studio
npm run db:seed            # prisma db seed (prisma/seed.ts)
```

There is no test runner configured in `package.json` — check with the user before assuming a test framework/command.

Convex is run separately from the app dev server: `npx -y convex dev` (needs `CONVEX_DEPLOYMENT` / `VITE_CONVEX_URL` in `.env.local`, see `.env.example`).

## Architecture

### Routing

File-based routing via TanStack Router, files live in `src/routes/`. `src/routeTree.gen.ts` is **generated** — run `npm run generate-routes` (or just start the dev server, which regenerates it on the fly) after adding/removing route files rather than hand-editing the generated tree. Route filenames use TanStack Router's flat convention (e.g. `api.rpc.$.ts` → `/api/rpc/$`).

`src/routes/__root.tsx` defines the document shell (`shellComponent`), wraps the app in `ConvexProvider`, and wires Paraglide's `getLocale()` into the `<html lang>` attribute. Router context (`MyRouterContext`) combines the Apollo Client integration's context with a TanStack Query `QueryClient` — see `src/router.tsx` and `src/integrations/tanstack-query/root-provider.tsx`.

### Two API surfaces under `/api`

- **oRPC** (`src/orpc/`): `src/orpc/router/index.ts` aggregates procedure modules (e.g. `todos.ts`, built with `os.input(...).handler(...)`). It's exposed twice:
  - `src/routes/api.rpc.$.ts` — raw RPC handler (`@orpc/server/fetch`'s `RPCHandler`), prefix `/api/rpc`.
  - `src/routes/api.$.ts` — OpenAPI handler (`@orpc/openapi/fetch`'s `OpenAPIHandler`) with Zod→JSON-Schema conversion and a generated API reference/docs UI, prefix `/api`.
  Add new procedures under `src/orpc/router/` and register them in `index.ts`; they become available through both surfaces automatically.
- **MCP server** (`src/routes/mcp.ts`): a `McpServer` from `@modelcontextprotocol/sdk` registered with tools (e.g. `addTodo`), served over POST via `src/utils/mcp-handler.ts`, which bridges a single HTTP request through an in-memory linked transport pair (there's no persistent MCP session — each request spins up and tears down a fresh linked transport).

### Data layers

- **Convex** (`convex/`): schema in `convex/schema.ts`, functions in `convex/todos.ts`, generated bindings in `convex/_generated/`. The client is wired via `@convex-dev/react-query`'s `ConvexQueryClient` in `src/integrations/convex/provider.tsx`, so Convex queries can flow through TanStack Query. Requires `VITE_CONVEX_URL`.
- **Prisma/Postgres** (`prisma/schema.prisma`, `src/db.ts`): uses the new Prisma driver-adapter style client (`@prisma/client` generated to `src/generated/prisma`, `@prisma/adapter-pg`). `src/db.ts` exports a singleton `prisma` client cached on `globalThis.__prisma` in dev to survive HMR. `getDatabaseUrl()` in `src/database-url.ts` resolves the connection string. When editing the schema, regenerate with `npm run db:generate` after `db:push`/`db:migrate`.

### Auth

Better Auth (`src/lib/auth.ts`) is configured with email/password only and the `tanstackStartCookies()` plugin (no database adapter wired in yet — see the README's "Adding a Database" section if persistence needs to be added). Client-side hook/helpers are in `src/lib/auth-client.ts`. Auth API route lives at `src/routes/api/auth/$.ts`. `BETTER_AUTH_SECRET` must be set in `.env.local`.

### i18n

Paraglide JS is wired through `paraglideVitePlugin` in `vite.config.ts` (source messages in `project.inlang/`, generated runtime in `src/paraglide/`, output regenerated on dev/build). Locale routing strategy is `['url', 'baseLocale']`. Do not hand-edit generated files under `src/paraglide/`.

### Observability

Sentry (`@sentry/tanstackstart-react`) instruments the server; `npm run dev`/`start` explicitly load `instrument.server.mjs` via `NODE_OPTIONS='--import ...'` before the app starts, and `npm run build` copies that file into `.output/server` so production picks it up too. When adding a `createServerFn`, wrap its implementation in `Sentry.startSpan({ name: '...' }, async () => { ... })` (import `* as Sentry from '@sentry/tanstackstart-react'`).

### Path aliases

Both `#/*` and `@/*` map to `./src/*` (see `tsconfig.json` `paths` and the `imports` field in `package.json` — note `package.json` only declares `#/*`, so prefer `#/` in new code for consistency with existing imports).

### UI

Tailwind CSS v4 (via `@tailwindcss/vite`) plus shadcn/ui (`components.json`, `src/components/ui/`). Add new shadcn components with `pnpm dlx shadcn@latest add <component>` even though the project otherwise uses `npm` as its package manager (shadcn's CLI is invoked standalone via `dlx`/`npx`).

React Compiler is enabled through a Babel preset (`babel-plugin-react-compiler` via `@rolldown/plugin-babel` in `vite.config.ts`) — avoid manual `useMemo`/`useCallback` micro-optimizations that fight the compiler.
