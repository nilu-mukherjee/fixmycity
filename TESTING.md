# Testing FixMyCity AI

Two ways to try this: the hosted deployment (no install), or running the full stack locally.

## 1. Hosted deployment — no install needed

- **Live app:** https://fixmycity-1003427733440.asia-south1.run.app
- **Admin dashboard** (no login required): `/admin` — filter/sort tickets by category, severity, department, status, trust score, and report time; open any ticket to see Gemini's original AI suggestion next to the citizen's final (possibly corrected) values, plus the trust-score breakdown.
- **Architecture walkthrough:** `/architecture` — animated diagram of the Cloud Run / Eventarc / Genkit pipeline.

### Full end-to-end pipeline (citizen report → AI classification → ticket)

Requires an Android device or emulator, since the citizen app is a separate Flutter app, not a web form:

1. Download the release APK from the site's download button, or directly:
   `https://storage.googleapis.com/fixmycity-506122-photos/builds/fixmycity-release-arm64.apk`
2. Sign in with Google (citizen tickets are scoped per Google account).
3. Take a photo of a civic issue (camera-only capture, no gallery picker) and submit with your location.
4. The photo triggers a GCS `object.finalized` event → Eventarc → the Genkit flow calls Gemini to classify category/severity/description and decide whether to call the `findNearbyReports` tool.
5. Within a few seconds the ticket appears in the `/admin` dashboard (polls every 5s) with its AI-assigned category, severity, department, and trust score.

**To see duplicate-detection affect severity:** submit two reports of the same category within a short distance of each other — the second report's AI severity should trend higher, since the model is instructed to treat corroborating nearby reports as a severity signal, not noise.

## 2. Running locally

### Prerequisites

- Node.js 20+, npm
- A Postgres database (e.g. a [Cloud SQL](https://cloud.google.com/sql/docs/postgres) instance)
- A [Gemini API key](https://aistudio.google.com/apikey) with billing/prepay enabled (the free tier's request quota is easy to exhaust during development)
- [Flutter](https://flutter.dev) SDK, if also running the citizen app

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in:
   ```
   DATABASE_URL=            # your Postgres connection string
   GEMINI_API_KEY=          # from Google AI Studio
   BETTER_AUTH_URL=
   BETTER_AUTH_SECRET=
   GOOGLE_CLIENT_ID=        # Google OAuth client (Web application type)
   GOOGLE_CLIENT_SECRET=
   ```
3. Push the schema to Postgres:
   ```bash
   npm run db:generate
   npm run db:push
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```
   The backend listens on port 3000, bound to localhost only. If the Flutter app runs on a separate device (physical phone, LAN, VPN), expose it on all interfaces instead:
   ```bash
   npx dotenv -e .env.local -- sh -c "NODE_OPTIONS='--import ./instrument.server.mjs' vite dev --port 3000 --host 0.0.0.0"
   ```

### Running the Flutter app locally

```bash
cd android_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://<backend-host>:3000
```

`API_BASE_URL` defaults to `http://10.0.2.2:3000` (the Android emulator's alias for the host machine) if omitted — override it for a physical device or a deployed backend.

### Admin dashboard locally

`npm run dev` and open `http://localhost:3000` — it redirects to `/admin`, the issue queue: filter/sort tickets by status, category, severity, and department; open a ticket for its full detail panel (photo, trust score breakdown, location) and advance its status.

### Verifying the agent's tool use

The `findNearbyReports` tool call is logged server-side, so you can watch the model decide to invoke it:

```
[agent] findNearbyReports(pothole @ 12.9716,77.5946) -> 3 match(es)
```

The same photo and note submitted at a location with existing nearby reports vs. an isolated one produces different `severity` values — the model is incorporating retrieved context into its own judgment, not running a fixed sequence.
