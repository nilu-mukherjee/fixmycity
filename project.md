Winning Idea: FixMyCity AI
An AI agent that turns citizen complaints into verified, prioritized, and routed civic repair tickets.
One-line pitch
FixMyCity AI converts photos, voice notes, and location reports into structured civic issue tickets, verifies severity, groups duplicates, and routes them to the right department.
Problem
In cities like Bengaluru, people report potholes, garbage overflow, broken streetlights, water leakage, open drains, unsafe footpaths, and traffic signal issues. But complaints are usually messy: unclear photos, duplicate reports, wrong categories, no priority, no proper routing, and no transparent follow-up.
Why this can win
This has a stronger hackathon story than a normal AI app because it combines:
Vision AI + agentic workflow + social impact + dashboard + real-world demo.
Judges like projects that solve visible problems. Current hackathon writeups emphasize real operational pain points and deployable AI solutions, while 2026 idea roundups highlight specific AI agents that complete multi-step tasks and impact themes like climate, healthcare, accessibility, and public good. Express Computer
MVP Features

1. Citizen Report Form
   User uploads:

- Photo of issue
- Short description or voice note
- Location
- Urgency level
  Example:
  “Big pothole near Whitefield main road, dangerous for bikes.”

2. AI Issue Classifier
   AI detects category:

- Pothole
- Garbage
- Streetlight
- Drainage
- Water leakage
- Road blockage
- Unsafe footpath
  It also extracts severity: low, medium, high, emergency.

3. Duplicate Detection
   If 10 people report the same pothole, the system groups it into one issue instead of creating 10 separate tickets.
   This makes the project more realistic and impressive.
4. Department Routing Agent
   The agent decides where to route it:

- Road department
- Waste management
- Electricity/streetlight team
- Water board
- Traffic department

5. Civic Dashboard
   Admin dashboard shows:

- Open issues
- Highest-priority areas
- Duplicate clusters
- Department-wise pending tickets
- Map/list view
- SLA status

6. Public Status Page
   Citizens can see:

- Report received
- Verified
- Assigned
- In progress
- Resolved
  Agentic AI Angle
  The agent does not just answer questions. It performs a workflow:
  Input report → classify issue → check duplicate → estimate severity → route department → generate ticket → create citizen update → update dashboard.
  That “AI doing work” is much stronger for Devpost than a simple chatbot.
  Demo Flow for Devpost

1. Open app.
2. Upload pothole image.
3. AI detects: “Road damage / pothole.”
4. AI marks severity: “High risk for two-wheelers.”
5. App checks similar nearby reports.
6. App groups duplicates.
7. Agent creates ticket for road maintenance department.
8. Dashboard updates with priority score.
9. Citizen gets a tracking message.
   Tech Stack for You
   Since you are strong in React/Full Stack, this is realistic:
   Frontend: React / Next.js, TypeScript, Tailwind
   Backend: FastAPI or Node.js
   Database: Supabase/PostgreSQL
   Storage: Supabase Storage/S3
   AI: Gemini/OpenAI vision model for image understanding
   Maps: Google Maps/Mapbox/OpenStreetMap
   Agent workflow: LangGraph / custom workflow engine
   Notifications: Email/WhatsApp mock integration  
   What to Build in 24–48 Hours
   Build only this:

- Report submission form
- Image upload
- AI category/severity detection
- Duplicate grouping by location + category
- Admin dashboard
- Ticket status flow
- Devpost demo video
  Do not build real government integration. Mock the department routing.

## Extra Winning Feature: Trust Score

Add a "trust score" for every complaint, built from signals available at report time:

- Clear image: +30
- Exact location: +30
- Multiple nearby reports: +25
- Recent report: +15

This makes the app look more product-ready.

## Deployment

Target: **Google Cloud Run**, running the backend as a container. The AI classification/severity/duplicate/routing workflow is implemented as a **Genkit flow** (not a raw Gemini API call, and not Vertex AI Agent Builder/ADK). Adds to the existing stack: a `Dockerfile` for the Cloud Run container, the Genkit dependency, a `GEMINI_API_KEY` (or Vertex-mode Gemini credentials) env var, and Cloud Run service config/deploy steps.

## Client Architecture

Citizen-facing interface: a **Flutter app** (a separate codebase/repo from this one, not the web frontend, not a wrapper around it) — citizens open the app, submit a report, and see the issue move through the pipeline. It talks to the Cloud Run/Genkit/Postgres backend over HTTP. The admin dashboard stays on the web (TanStack Start, this repo).

Citizen app flow:

1. User opens the app, starts a new complaint.
2. Camera opens; user photographs the issue (pothole, garbage, etc.). A live on-device object-detection overlay (MediaPipe/TFLite, via the `object_detection` Flutter package) runs during framing purely as a "something's in frame" confirmation — it only recognizes generic COCO classes (person, car, ...), not civic-issue categories, so it never claims to identify the actual issue. The captured photo is sent to the backend for real classification.
3. Backend (Genkit flow + Gemini Vision) detects the issue, classifies category and severity, and returns a **presubmit** structured report.
4. App shows the presubmit data to the user, editable (category, severity, description, location) before anything is finalized.
5. User approves → ticket is created.

Pipeline, driven by a Genkit flow on the backend:

Citizen report (Flutter app, photo captured) → Genkit flow → Gemini Vision (image understanding) → issue classification → severity score → duplicate check tool → department routing → presubmit ticket summary (user reviews/edits) → user approves → ticket created

The Flutter app calls the Cloud Run backend (which hosts the Genkit flow and Postgres data) to submit reports and poll/receive ticket status.

## Data Store

**Prisma/Postgres** (Cloud SQL) is the store for reports/tickets, alongside Better Auth's user/session tables — one GCP-native database, no third-party hosted service. (This repo initially used Convex for reports/tickets; it was later removed so the whole stack runs on Google Cloud with nothing external.) Citizen photo uploads go straight to **GCS**, not through the database. Duplicate-by-location checks are a simple haversine-distance filter over tickets fetched via Prisma — no PostGIS/geospatial index needed at this scale. The accepted tradeoff versus Convex: the admin dashboard's ticket list polls (a few seconds) instead of getting Convex's free live/reactive updates.

## Auth

Citizens log in via **Google** social sign-in (Better Auth's `socialProviders.google`, `src/lib/auth.ts`) — live end-to-end: real GCP OAuth client, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set on Cloud Run, tickets scoped per signed-in citizen. Microsoft sign-in is not implemented (only Google). The admin dashboard has no login gate (unauthenticated by design, per its oRPC router).

## Implementation Status

What's actually built and deployed, vs. still spec/aspiration above:

**Live and deployed:**

- Backend + admin dashboard on **Google Cloud Run** (`fixmycity-1003427733440.asia-south1.run.app`), auto-deploying via Cloud Build on every push to `main`.
- **Postgres on Cloud SQL** is the sole data store (reports/tickets, presubmit drafts, Better Auth users/sessions) — no third-party DB.
- Full pipeline: photo upload → GCS → Eventarc-triggered Genkit flow → Gemini Vision classification → presubmit draft → citizen review/edit → ticket creation.
- **Trust score** (clear image / exact location / nearby reports / recency, max 100) computed and shown to citizens.
- **Duplicate detection** via haversine distance over same-category tickets (no PostGIS).
- **Department routing** — mocked mapping, no real municipal integration (per spec).
- **Admin dashboard** — TailAdmin-style UI, human-readable sequential ticket ids (FMC001, FMC002, ...), Google Maps link per ticket, real dates + month-over-month stats, ticket list sorted by report time by default.
- **Specific issue labels** — beyond the fixed category enum, Gemini also returns a short human-readable description of exactly what it sees (e.g. "Exposed Electrical Wiring on Pole" instead of a generic "electrical issue" bucket), stored as `Ticket.issueLabel`/`PresubmitDraft.issueLabel` and shown in the admin dashboard; a backfill script reclassifies pre-existing tickets that predate the field.
- **Public `/architecture` page** — an animated diagram of the Cloud Run/Eventarc/Genkit pipeline, embedded alongside the rest of the public site nav/footer.
- **Citizen Flutter app**: Google Sign-In (tickets scoped per citizen), camera-only capture (no gallery picker) with immediate auto-analyze on capture, a live on-device object-detection overlay (MediaPipe/TFLite) as a framing aid only, pinch-to-zoom, full-screen camera preview, reverse-geocoded full address shown instead of raw lat/lng, a public status-tracking page (received → verified → assigned → in progress → resolved), and friendly (non-raw-exception) error states throughout.
- **Self-improvement feedback loop**: `Ticket` rows store Gemini's original category/severity/description suggestion (`aiCategory`/`aiSeverity`/`aiDescription`) alongside the citizen's final (possibly corrected) values. `getRecentCorrections` (`src/lib/tickets.ts`) surfaces the most recent mismatches, and `runReportPipeline` (`src/genkit/report-flow.ts`) folds them into the classification prompt as few-shot examples on every new report — the agent calibrates against its own past mistakes via in-context learning. This is not a fine-tuning/retraining pipeline; there isn't one, and nothing here changes the underlying model.
- Release APKs are built, signed (real release keystore), and verified via GitHub Actions CI (the native object-detection dependency needs a real x86_64 build machine, which is why this isn't built locally); the site's download button force-downloads the APK from Cloud Storage rather than linking to a GitHub Release/Actions page.

**Not implemented (still just the spec above or the "What's next" list):**

- Microsoft sign-in (Google only).
- Map-based issue clustering, WhatsApp reporting, multilingual support, SLA analytics, image-similarity duplicate detection.
- Any real municipal/government system integration (intentionally out of scope).

## Architecture Decisions

### ADR-1: Postgres (Cloud SQL) over Convex for reports/tickets

- **Context:** Needed one data layer for `Ticket`/`PresubmitDraft` plus Better Auth sessions.
- **Decision:** Prisma on Cloud SQL Postgres; Convex removed entirely.
- **Alternatives:** Convex (reactive queries out of the box) — rejected because it's a second platform outside GCP, and the hackathon's mandatory-GCP-service criterion rewards staying native.
- **Consequences:** Lost live dashboard updates, replaced with TanStack Query polling every 5s. Traded a nice-to-have for one unified, judge-legible GCP stack.

### ADR-2: Event-driven classification (GCS → Eventarc → private Cloud Run) over synchronous processing

- **Context:** Gemini Vision classification takes seconds; the citizen shouldn't block on it mid-upload.
- **Decision:** Photo lands in GCS → `object.finalized` event → Eventarc → a separate, IAM-locked `fixmycity-events` Cloud Run service runs the Genkit pipeline and writes the result back to the draft.
- **Alternatives:** Run the pipeline inline in the same request that creates the draft — rejected: couples upload latency to LLM latency, and mixes a public-facing service with a privileged pipeline that shouldn't be internet-reachable.
- **Consequences:** Two Cloud Run services to operate instead of one, but a smaller public attack surface and a citizen flow that isn't blocked on Gemini.

### ADR-3: Haversine distance in application code over PostGIS

- **Context:** Need "same category, within ~150m" duplicate lookups.
- **Decision:** Filter by category in Postgres, then compute haversine distance in TypeScript.
- **Alternatives:** PostGIS spatial index — rejected as unjustified operational complexity at this data volume.
- **Consequences:** Won't scale past tens of thousands of rows without an index; explicitly fine for a hackathon pilot, and cheap to migrate later since the call site (`findNearbyTickets`) is already isolated.

### ADR-4: Mocked department routing over real municipal integration

- **Context:** Explicit project constraint: no real government integration.
- **Decision:** Static category→department lookup table, no external dispatch.
- **Alternatives:** None seriously considered — this is a standard, judge-accepted hackathon pattern for enterprise/government integrations that can't use real data or systems, not a shortcut being defended.
- **Consequences:** The full agentic pipeline (classify → score → dedupe → route) is real end-to-end except the very last hop, matching the hackathon brief's actual scope.

## Inspiration

In cities like Bengaluru, citizens often report potholes, garbage overflow, broken streetlights, water leakage, open drains, unsafe footpaths, and traffic signal issues. But these complaints are usually unstructured, duplicated, wrongly categorized, and difficult to track. We wanted to build a smarter civic reporting system that helps citizens raise issues easily and helps city teams understand, prioritize, and route them faster.

## What it does

FixMyCity AI allows citizens to report civic issues by uploading a photo, adding a short description, and sharing the location. The AI analyzes the report, identifies the issue category and a specific, human-readable description of exactly what it sees (not just a generic bucket like "electrical issue" — something like "Exposed Electrical Wiring on Pole"), estimates severity, detects possible duplicate complaints, and routes the ticket to the right department. It also gives citizens a simple tracking status so they know whether the issue is received, verified, assigned, in progress, or resolved.

## How we built it

The citizen-facing app is a separate Flutter mobile app — camera capture, GPS location, and an urgency note, no on-device detection. It talks to a TanStack Start backend (exposed over both raw RPC and OpenAPI) that hosts the actual agent pipeline.

Classification runs as a Genkit flow calling Gemini 3.6 Flash on the uploaded photo. The interesting part: duplicate-detection isn't a step we hard-code in TypeScript and hand the model the result of — it's a tool (`findNearbyReports`) we give the model, and the model decides for itself whether to call it while reasoning about severity. The prompt tells it that multiple recent nearby reports of the same hazard should push its severity estimate up, not down, and we've seen this change real outcomes in testing: the same kind of report submitted somewhere with existing nearby reports of the same issue tends to come back with a higher severity than the identical input submitted somewhere isolated — the agent is genuinely incorporating retrieved context into its own judgment, not running a fixed sequence.

Data and file storage run on Google Cloud — Postgres on Cloud SQL for tickets and presubmit drafts (via Prisma), and photos go straight to Cloud Storage. We started on Convex for its reactive queries, then pulled it out in favor of one GCP-native database, so the whole stack — including the Genkit flow itself — runs on Google Cloud with no third-party platform in the loop. The tradeoff: the admin dashboard no longer updates live off reactive queries; it polls every few seconds via TanStack Query instead. The backend deploys itself, too — Cloud Build redeploys both Cloud Run services on every push to main.

A trust score (clear image, exact GPS accuracy, corroborating nearby reports, recency) is computed deterministically in code, not left to the LLM, so the scoring rubric stays auditable. Department routing is an explicit mocked lookup table, per the brief's constraint against real government integration.

## Challenges we ran into

The biggest challenge was converting unclear, real-world complaints into structured data. Citizen reports can have poor image quality, missing details, vague descriptions, or repeated reports for the same issue. Another challenge was designing a routing flow that feels realistic without depending on actual government systems. We solved this by creating a mock department-routing workflow and a simple priority scoring system.

## Accomplishments that we're proud of

We are proud that FixMyCity AI is more than just a complaint form. It acts like an intelligent civic assistant that can classify issues, detect duplicates, assign priority, and create actionable tickets. We are also proud of the citizen-friendly tracking flow, because transparency is an important part of public issue reporting. The project shows how AI can support both citizens and city operations in a practical way.

## What we learned

We learned that civic tech problems are not only about collecting data, but also about making that data usable. A good report should be clear, categorized, prioritized, routed, and trackable. We also learned how AI can be used beyond chatbots by supporting a complete workflow from report submission to decision-making.

## What's next for FixMyCity AI

Next, we want to add map-based issue clustering, WhatsApp reporting, multilingual support, real-time department dashboards, SLA tracking, and analytics for city hotspots. We also want to improve duplicate detection using location, image similarity, and report timing. In the future, FixMyCity AI could integrate with municipal systems to help cities respond faster and give citizens better visibility into local issue resolution.
