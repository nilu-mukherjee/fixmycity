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
                <svg
                  viewBox="0 0 1100 900"
                  role="img"
                  aria-label="Architecture diagram: a citizen's Flutter app creates a draft on Cloud Run and uploads a photo to Cloud Storage; the storage event fires through Eventarc into a private Cloud Run service, which runs a Genkit flow calling Gemini for classification, optionally querying Cloud SQL for nearby duplicate reports, then writes the result to Cloud SQL; the citizen reviews and approves to create a ticket; the admin dashboard polls the same API; GitHub pushes trigger Cloud Build to deploy both Cloud Run services."
                >
                  <defs>
                    <marker
                      id="arch-arrow-blue"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 z" fill="var(--route)" />
                    </marker>
                    <marker
                      id="arch-arrow-ai"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 z" fill="var(--ai)" />
                    </marker>
                    <marker
                      id="arch-arrow-muted"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-muted)" />
                    </marker>
                  </defs>

                  <line
                    x1="40"
                    y1="770"
                    x2="1060"
                    y2="770"
                    stroke="var(--line)"
                    strokeWidth="1"
                  />
                  <text x="40" y="792" className="arch-band-label">
                    DEPLOY TIME — ON EVERY PUSH TO MAIN
                  </text>
                  <text x="40" y="42" className="arch-band-label">
                    RUNTIME — PER CITIZEN REPORT
                  </text>

                  <line
                    x1="150"
                    y1="70"
                    x2="486"
                    y2="70"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text
                    x="318"
                    y="63"
                    textAnchor="middle"
                    className="arch-edge-label-strong"
                  >
                    1 · create draft (photo meta, GPS)
                  </text>

                  <line
                    x1="486"
                    y1="98"
                    x2="150"
                    y2="98"
                    stroke="var(--route)"
                    strokeWidth="1.4"
                    strokeDasharray="5 4"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text
                    x="318"
                    y="114"
                    textAnchor="middle"
                    className="arch-edge-label"
                  >
                    signed upload URL &nbsp;·&nbsp; 6 review &amp; approve
                  </text>

                  <line
                    x1="90"
                    y1="110"
                    x2="90"
                    y2="226"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text x="98" y="172" className="arch-edge-label-strong">
                    2 · upload photo
                  </text>

                  <line
                    x1="120"
                    y1="260"
                    x2="486"
                    y2="260"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text x="140" y="243" className="arch-edge-label-strong">
                    3 · Eventarc: object.finalized
                  </text>
                  <g transform="translate(292,246)">
                    <path
                      d="M6,0 L0,10 L5,10 L2,18 L11,7 L6,7 Z"
                      fill="var(--route)"
                    />
                  </g>

                  <line
                    x1="520"
                    y1="290"
                    x2="520"
                    y2="406"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text x="528" y="352" className="arch-edge-label-strong">
                    4 · run pipeline
                  </text>

                  <line
                    x1="550"
                    y1="440"
                    x2="756"
                    y2="440"
                    stroke="var(--ai)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-ai)"
                  />
                  <text
                    x="653"
                    y="433"
                    textAnchor="middle"
                    className="arch-edge-label-ai"
                  >
                    classify + score
                  </text>

                  <polyline
                    points="790,470 790,620 550,620"
                    fill="none"
                    stroke="var(--ai)"
                    strokeWidth="1.4"
                    strokeDasharray="5 4"
                    markerEnd="url(#arch-arrow-ai)"
                  />
                  <text x="796" y="548" className="arch-edge-label-ai">
                    tool call:
                  </text>
                  <text x="796" y="562" className="arch-edge-label-ai">
                    findNearbyReports
                  </text>
                  <text x="796" y="576" className="arch-edge-label">
                    within 150m, same
                  </text>
                  <text x="796" y="588" className="arch-edge-label">
                    category · model decides
                  </text>

                  <polyline
                    points="490,272 420,272 420,620 486,620"
                    fill="none"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text x="330" y="443" className="arch-edge-label-strong">
                    5 · mark draft ready
                  </text>

                  <polyline
                    points="490,90 300,90 300,650 486,650"
                    fill="none"
                    stroke="var(--route)"
                    strokeWidth="1.6"
                    markerEnd="url(#arch-arrow-blue)"
                  />
                  <text x="230" y="83" className="arch-edge-label">
                    create ticket
                  </text>

                  <polyline
                    points="900,90 660,90 660,55 584,55"
                    fill="none"
                    stroke="var(--ink-muted)"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                    markerEnd="url(#arch-arrow-muted)"
                  />
                  <text x="665" y="83" className="arch-edge-label">
                    poll every 5s
                  </text>

                  <line
                    x1="480"
                    y1="825"
                    x2="556"
                    y2="825"
                    stroke="var(--ink-muted)"
                    strokeWidth="1.4"
                    markerEnd="url(#arch-arrow-muted)"
                  />

                  <line
                    x1="570"
                    y1="800"
                    x2="570"
                    y2="746"
                    stroke="var(--ink-muted)"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                    markerEnd="url(#arch-arrow-muted)"
                  />
                  <text x="580" y="770" className="arch-edge-label">
                    deploys fixmycity +
                  </text>
                  <text x="580" y="782" className="arch-edge-label">
                    fixmycity-events
                  </text>

                  <g transform="translate(60,40)">
                    <title>Citizen — Flutter Android app</title>
                    <rect width="60" height="60" rx="14" fill="var(--route)" />
                    <rect
                      x="21"
                      y="12"
                      width="18"
                      height="36"
                      rx="3"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <circle cx="30" cy="42" r="1.6" fill="var(--surface)" />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Citizen
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      Flutter app
                    </text>
                  </g>

                  <g transform="translate(870,40)">
                    <title>City staff — Admin dashboard (browser)</title>
                    <rect
                      width="60"
                      height="60"
                      rx="14"
                      fill="var(--ink-muted)"
                    />
                    <rect
                      x="14"
                      y="16"
                      width="32"
                      height="22"
                      rx="2"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <line
                      x1="14"
                      y1="22"
                      x2="46"
                      y2="22"
                      stroke="var(--surface)"
                      strokeWidth="1.4"
                    />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Admin
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      dashboard
                    </text>
                  </g>

                  <g transform="translate(490,40)">
                    <title>
                      Cloud Run — fixmycity (public): oRPC API + Better Auth
                    </title>
                    <rect width="60" height="60" rx="14" fill="var(--route)" />
                    <circle
                      cx="30"
                      cy="30"
                      r="14"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <path d="M25,22 L38,30 L25,38 Z" fill="var(--surface)" />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Cloud Run
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      fixmycity (public)
                    </text>
                  </g>

                  <g transform="translate(60,220)">
                    <title>Cloud Storage — reports/&lt;draftId&gt;.jpg</title>
                    <rect width="60" height="60" rx="14" fill="var(--route)" />
                    <path
                      d="M17,42 L17,26 Q17,22 22,22 L38,22 Q43,22 43,26 L43,42 Z"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <line
                      x1="17"
                      y1="30"
                      x2="43"
                      y2="30"
                      stroke="var(--surface)"
                      strokeWidth="1.4"
                    />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Cloud Storage
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      reports/*.jpg
                    </text>
                  </g>

                  <g transform="translate(490,220)">
                    <title>
                      Cloud Run — fixmycity-events (private, IAM-locked):
                      /api/events/photo-uploaded
                    </title>
                    <rect width="60" height="60" rx="14" fill="var(--route)" />
                    <circle
                      cx="30"
                      cy="30"
                      r="14"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <path d="M25,22 L38,30 L25,38 Z" fill="var(--surface)" />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Cloud Run
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      events (private)
                    </text>
                  </g>

                  <g transform="translate(490,400)">
                    <title>
                      Genkit Flow — analyzeReport: isCivicIssue, category,
                      severity, description, imageIsClear
                    </title>
                    <rect width="60" height="60" rx="14" fill="var(--ai)" />
                    <circle
                      cx="18"
                      cy="30"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.6"
                    />
                    <circle
                      cx="42"
                      cy="20"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.6"
                    />
                    <circle
                      cx="42"
                      cy="40"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.6"
                    />
                    <line
                      x1="22"
                      y1="28"
                      x2="38"
                      y2="21"
                      stroke="var(--surface)"
                      strokeWidth="1.4"
                    />
                    <line
                      x1="22"
                      y1="32"
                      x2="38"
                      y2="39"
                      stroke="var(--surface)"
                      strokeWidth="1.4"
                    />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Genkit
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      analyzeReport
                    </text>
                  </g>

                  <g transform="translate(760,400)">
                    <title>
                      Gemini 3.6 Flash — vision, structured output, tool calling
                    </title>
                    <rect width="60" height="60" rx="14" fill="var(--ai)" />
                    <path
                      d="M30,14 L34,26 L46,30 L34,34 L30,46 L26,34 L14,30 L26,26 Z"
                      fill="var(--surface)"
                    />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Gemini
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      3.6 Flash
                    </text>
                  </g>

                  <g transform="translate(490,590)">
                    <title>
                      Cloud SQL — Postgres: PresubmitDraft, Ticket, User/Session
                    </title>
                    <rect width="60" height="60" rx="14" fill="var(--route)" />
                    <path
                      d="M18,24 Q30,17 42,24 L42,38 Q30,45 18,38 Z"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <path
                      d="M18,24 Q30,31 42,24"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.6"
                    />
                    <text
                      x="30"
                      y="78"
                      textAnchor="middle"
                      className="arch-node-label"
                    >
                      Cloud SQL
                    </text>
                    <text
                      x="30"
                      y="90"
                      textAnchor="middle"
                      className="arch-node-sub"
                    >
                      Postgres
                    </text>
                  </g>

                  <g transform="translate(430,800)">
                    <title>GitHub — push to main</title>
                    <rect
                      width="50"
                      height="50"
                      rx="12"
                      fill="var(--ink-muted)"
                      opacity="0.85"
                    />
                    <circle
                      cx="17"
                      cy="25"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="33"
                      cy="16"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="33"
                      cy="34"
                      r="4"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M20,24 Q28,20 30,17"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M20,26 Q28,30 30,33"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.3"
                    />
                    <text
                      x="25"
                      y="66"
                      textAnchor="middle"
                      className="arch-node-label"
                      style={{ fontSize: '11px' }}
                    >
                      GitHub
                    </text>
                  </g>

                  <g transform="translate(560,800)">
                    <title>
                      Cloud Build — two triggers, auto build and deploy
                    </title>
                    <rect
                      width="50"
                      height="50"
                      rx="12"
                      fill="var(--route)"
                      opacity="0.9"
                    />
                    <rect
                      x="16"
                      y="21"
                      width="18"
                      height="8"
                      rx="2"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.6"
                      transform="rotate(-35 25 25)"
                    />
                    <circle
                      cx="33"
                      cy="17"
                      r="3"
                      fill="none"
                      stroke="var(--surface)"
                      strokeWidth="1.4"
                    />
                    <text
                      x="25"
                      y="66"
                      textAnchor="middle"
                      className="arch-node-label"
                      style={{ fontSize: '11px' }}
                    >
                      Cloud Build
                    </text>
                  </g>
                </svg>
              </div>
              <figcaption>
                Solid blue = the request path through GCP infrastructure,
                numbered in sequence. Solid violet = the AI layer (Genkit
                calling Gemini). Dashed = asynchronous, polled, or
                model-initiated. Grey = deploy-time, not part of a
                citizen&apos;s request.
              </figcaption>
            </figure>

            <div className="arch-legend">
              <span className="item">
                <span
                  className="swatch"
                  style={{ background: 'var(--route)' }}
                />
                GCP infrastructure (Cloud Run, Storage, SQL)
              </span>
              <span className="item">
                <span className="swatch" style={{ background: 'var(--ai)' }} />
                AI layer (Genkit + Gemini)
              </span>
              <span className="item">
                <span
                  className="swatch dashed"
                  style={{ color: 'var(--ink-muted)' }}
                />
                Async / polled / model-decided
              </span>
              <span className="item">
                <span
                  className="swatch"
                  style={{ background: 'var(--ink-muted)' }}
                />
                Deploy-time (CI/CD)
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Under the hood</p>
              <h2 className="display">What each layer actually does</h2>
            </div>
            <div className="arch-prose">
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
              <h2 className="display">Four decisions, made on purpose</h2>
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
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
