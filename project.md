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
2. Camera opens; user photographs the issue (pothole, garbage, etc.) like a normal camera — no on-device/live object detection. The captured photo is sent to the backend.
3. Backend (Genkit flow + Gemini Vision) detects the issue, classifies category and severity, and returns a **presubmit** structured report.
4. App shows the presubmit data to the user, editable (category, severity, description, location) before anything is finalized.
5. User approves → ticket is created.

Pipeline, driven by a Genkit flow on the backend:

Citizen report (Flutter app, photo captured) → Genkit flow → Gemini Vision (image understanding) → issue classification → severity score → duplicate check tool → department routing → presubmit ticket summary (user reviews/edits) → user approves → ticket created

The Flutter app calls the Cloud Run backend (which hosts the Genkit flow and Postgres data) to submit reports and poll/receive ticket status.

## Data Store

**Prisma/Postgres** (Cloud SQL) is the store for reports/tickets, alongside Better Auth's user/session tables — one GCP-native database, no third-party hosted service. (This repo initially used Convex for reports/tickets; it was later removed so the whole stack runs on Google Cloud with nothing external.) Citizen photo uploads go straight to **GCS**, not through the database. Duplicate-by-location checks are a simple haversine-distance filter over tickets fetched via Prisma — no PostGIS/geospatial index needed at this scale. The accepted tradeoff versus Convex: the admin dashboard's ticket list polls (a few seconds) instead of getting Convex's free live/reactive updates.

## Auth

Citizens (and admins) log in via **Google and Microsoft** social sign-in, using **Better Auth**'s `socialProviders` (already scaffolded in `src/lib/auth.ts`, currently email/password only — needs Google/Microsoft provider config added, plus OAuth client credentials as env vars).

## Inspiration

In cities like Bengaluru, citizens often report potholes, garbage overflow, broken streetlights, water leakage, open drains, unsafe footpaths, and traffic signal issues. But these complaints are usually unstructured, duplicated, wrongly categorized, and difficult to track. We wanted to build a smarter civic reporting system that helps citizens raise issues easily and helps city teams understand, prioritize, and route them faster.

## What it does

FixMyCity AI allows citizens to report civic issues by uploading a photo, adding a short description, and sharing the location. The AI analyzes the report, identifies the issue category, estimates severity, detects possible duplicate complaints, and routes the ticket to the right department. It also gives citizens a simple tracking status so they know whether the issue is received, verified, assigned, in progress, or resolved.

## How we built it

We built the frontend using React, TypeScript, and Tailwind CSS for a clean and responsive user experience. The backend handles report creation, image upload, issue classification, duplicate detection, ticket status, and department routing. We used AI vision and language models to understand uploaded images and descriptions, then converted messy citizen reports into structured civic tickets. The dashboard helps admins view issues by category, severity, location, and status.

## Challenges we ran into

The biggest challenge was converting unclear, real-world complaints into structured data. Citizen reports can have poor image quality, missing details, vague descriptions, or repeated reports for the same issue. Another challenge was designing a routing flow that feels realistic without depending on actual government systems. We solved this by creating a mock department-routing workflow and a simple priority scoring system.

## Accomplishments that we're proud of

We are proud that FixMyCity AI is more than just a complaint form. It acts like an intelligent civic assistant that can classify issues, detect duplicates, assign priority, and create actionable tickets. We are also proud of the citizen-friendly tracking flow, because transparency is an important part of public issue reporting. The project shows how AI can support both citizens and city operations in a practical way.

## What we learned

We learned that civic tech problems are not only about collecting data, but also about making that data usable. A good report should be clear, categorized, prioritized, routed, and trackable. We also learned how AI can be used beyond chatbots by supporting a complete workflow from report submission to decision-making.

## What's next for FixMyCity AI

Next, we want to add map-based issue clustering, WhatsApp reporting, multilingual support, real-time department dashboards, SLA tracking, and analytics for city hotspots. We also want to improve duplicate detection using location, image similarity, and report timing. In the future, FixMyCity AI could integrate with municipal systems to help cities respond faster and give citizens better visibility into local issue resolution.