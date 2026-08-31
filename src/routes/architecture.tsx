import { createFileRoute } from '@tanstack/react-router'

import { SiteFooter } from '#/components/site-footer'
import { SiteNav } from '#/components/site-nav'

import '#/styles/landing.css'

export const Route = createFileRoute('/architecture')({
  head: () => ({
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Staatliches&display=swap',
      },
    ],
  }),
  component: ArchitecturePage,
})

function ArchitecturePage() {
  return (
    <div className="landing">
      <SiteNav />

      <main>
        <section className="arch-main">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Google Cloud · System Architecture</p>
              <h1 className="display">
                How FixMyCity routes a photo to a department
              </h1>
              <p>
                One agentic pipeline, from a citizen&apos;s camera to a
                trust-scored, routed ticket — and which Google Cloud service
                does each step.
              </p>
            </div>

            <figure className="arch-diagram">
              <div className="arch-diagram-scroll">
                <object
                  type="image/svg+xml"
                  data="/architecture-diagram.svg"
                  className="arch-diagram-embed"
                >
                  Your browser doesn&apos;t support embedded SVG.{' '}
                  <a href="/architecture-diagram.svg">
                    View the architecture diagram directly
                  </a>
                  .
                </object>
              </div>
            </figure>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Under the hood</p>
              <h2 className="display">What each layer actually does</h2>
            </div>
            <div className="arch-prose arch-prose-grid">
              <div>
                <h3>Citizen app flow</h3>
                <p>
                  The user opens the app and starts a new complaint. The camera
                  opens and the user photographs the issue — a pothole, garbage,
                  a broken streetlight. A live on-device object-detection
                  overlay (MediaPipe/TFLite, via the{' '}
                  <code>object_detection</code> Flutter package) runs during
                  framing purely as a &quot;something&apos;s in frame&quot;
                  confirmation — it only recognizes generic COCO classes
                  (person, car, ...), not civic-issue categories, so it never
                  claims to identify the actual issue. The captured photo is
                  sent to the backend for real classification.
                </p>
                <p>
                  The backend (Genkit flow + Gemini Vision) detects the issue,
                  classifies category and severity, and returns a{' '}
                  <strong>presubmit</strong> structured report. The app shows
                  this data to the user, editable — category, severity,
                  description, location — before anything is finalized. Once the
                  user approves, the ticket is created.
                </p>
              </div>

              <div>
                <h3>Data store</h3>
                <p>
                  <strong>Prisma/Postgres</strong> (Cloud SQL) is the store for
                  reports, tickets, and Better Auth&apos;s user/session tables —
                  one GCP-native database, no third-party hosted service.
                  Citizen photo uploads go straight to <strong>GCS</strong>, not
                  through the database. Duplicate-by-location checks are a
                  haversine-distance filter over tickets fetched via Prisma — no
                  PostGIS or geospatial index needed at this scale.
                </p>
              </div>

              <div>
                <h3>Auth</h3>
                <p>
                  Citizens log in via <strong>Google</strong> social sign-in
                  (Better Auth&apos;s <code>socialProviders.google</code>) —
                  live end-to-end: a real GCP OAuth client, with{' '}
                  <code>GOOGLE_CLIENT_ID</code>/
                  <code>GOOGLE_CLIENT_SECRET</code> set on Cloud Run, and
                  tickets scoped per signed-in citizen. The admin dashboard has
                  no login gate — unauthenticated by design, per its own oRPC
                  router.
                </p>
              </div>

              <div>
                <h3>What&apos;s actually live</h3>
                <ul>
                  <li>
                    Backend + admin dashboard on Google Cloud Run, auto-
                    deploying via Cloud Build on every push to <code>main</code>
                    .
                  </li>
                  <li>
                    The full pipeline: photo upload → GCS → Eventarc- triggered
                    Genkit flow → Gemini Vision classification → presubmit draft
                    → citizen review/edit → ticket creation.
                  </li>
                  <li>
                    Trust score, duplicate detection, and department routing,
                    all computed and shown to citizens today.
                  </li>
                  <li>
                    A self-improvement feedback loop, early stage: every{' '}
                    <code>Ticket</code> stores Gemini&apos;s original
                    category/severity/description suggestion alongside the
                    citizen&apos;s final, possibly corrected, values — no
                    retraining pipeline yet, but the data needed to refine the
                    classification prompt is being captured on every ticket.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Why it&apos;s shaped this way</p>
              <h2 className="display">Five decisions, made on purpose</h2>
            </div>
            <div className="decisions-grid">
              <div className="feature">
                <h4>Two Cloud Run services, not one</h4>
                <p>
                  Classification runs on a separate, IAM-locked service — the
                  public API never runs untrusted-latency AI work, and the AI
                  pipeline is never internet-reachable.
                </p>
              </div>
              <div className="feature">
                <h4>Postgres, not Convex</h4>
                <p>
                  One GCP-native database instead of a second platform, at the
                  cost of trading live dashboard updates for a 5-second poll.
                </p>
              </div>
              <div className="feature">
                <h4>Haversine, not PostGIS</h4>
                <p>
                  A distance formula in application code beats a spatial index
                  nobody needs yet at this data volume.
                </p>
              </div>
              <div className="feature">
                <h4>The model decides when to check for duplicates</h4>
                <p>
                  findNearbyReports is a real tool call Gemini chooses to make,
                  not a hard-coded step in the pipeline.
                </p>
              </div>
              <div className="feature">
                <h4>It calibrates in context, not by retraining</h4>
                <p>
                  Every ticket stores what Gemini originally said next to what
                  the citizen filed. The five most recent disagreements go into
                  the next prompt as few-shot examples — no fine-tuning pipeline
                  exists.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Common questions</p>
              <h2 className="display">What judges usually ask</h2>
            </div>
            <div className="arch-prose">
              <div>
                <h3>Is FixMyCity already self-improving?</h3>
                <p>
                  Yes, in a specific and honest sense: not by retraining the
                  model. The database stores Gemini&apos;s original category,
                  severity, and description alongside the values the citizen
                  finally approves — every correction is captured.
                </p>
                <p>
                  Before classifying a new report, the agent (
                  <code>runReportPipeline</code>) pulls the most recent
                  corrections and folds them into its own prompt as few-shot
                  examples: &quot;you previously guessed X here, the citizen
                  corrected it to Y, don&apos;t repeat that.&quot; That&apos;s
                  in-context learning from the system&apos;s own mistakes, on
                  every single report.
                </p>
                <p>
                  There is still no automated fine-tuning or retraining
                  pipeline, and no claim here that the underlying model changes.
                  Calling it self-training would overstate the implementation.
                  The accurate claim is that FixMyCity actively feeds its own
                  correction history back into the agent&apos;s reasoning, in
                  real time, without any offline training step.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
