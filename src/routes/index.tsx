import { Link, createFileRoute } from '@tanstack/react-router'

import '#/styles/landing.css'

const GITHUB_URL = 'https://github.com/nilu-mukherjee/fixmycity'
const GITHUB_PROFILE_URL = 'https://github.com/nilu-mukherjee'
const DEVPOST_URL = 'https://allthingsagentichackathon.devpost.com/'
const APK_URL =
  'https://github.com/nilu-mukherjee/fixmycity/actions/workflows/flutter-build.yml'

export const Route = createFileRoute('/')({
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
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="landing">
      <header className="nav">
        <div className="wrap">
          <a href="#" className="brand">
            <span className="mark">
              Fix<span>My</span>City
            </span>
            <span className="tag">BETA · BLR</span>
          </a>
          <nav className="navlinks">
            <a href="#how" className="navlink">
              How it works
            </a>
            <a href="#features" className="navlink">
              Features
            </a>
            <a href="#trust" className="navlink">
              Trust score
            </a>
          </nav>
          <div className="navbtns">
            <Link to="/admin" className="btn btn-ghost btn-sm">
              Dashboard
            </Link>
            <a
              href={APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
              </svg>
              <span className="btn-label-long">Download Android app</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <div>
              <p className="eyebrow">CIVIC COMPLAINT → VERIFIED WORK ORDER</p>
              <h1 className="display">
                Bengaluru&apos;s potholes
                <br />
                now get a <em>case number.</em>
              </h1>
              <p className="lede">
                Snap a photo, drop a pin. Our agent reads the damage, scores how
                urgent it is, checks whether ten other people already reported
                the same crater, and files it with the department that actually
                owns the road.
              </p>
              <div className="ctas">
                <Link to="/admin" className="btn btn-primary">
                  View the live dashboard →
                </Link>
                <a href="#how" className="btn btn-ghost">
                  See how it works
                </a>
              </div>
            </div>

            <div className="ticket">
              <div className="stamp">
                <span>
                  AI
                  <br />
                  VERIFIED
                </span>
              </div>
              <div className="ticket-top">
                <div>
                  <div className="ticket-id">
                    TICKET <b>FMC004</b>
                  </div>
                  <h3>Unsafe Footpath</h3>
                  <div className="addr">
                    100ft Road, Indiranagar · reported 6 min ago
                  </div>
                </div>
              </div>
              <span className="flag">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 21V4l14 4-14 4" />
                </svg>
                High priority
              </span>
              <div className="trust-row">
                <div className="trust-bar">
                  <span />
                </div>
                <span className="trust-num">82 / 100 trust</span>
              </div>
              <div className="perforation" />
              <div className="ticket-foot">
                <span>ROUTED → BBMP Roads Dept.</span>
                <span>
                  <b>●</b> Assigned
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="strip">
          <div className="wrap">
            <div className="item">
              <b>Blurry photos.</b> Nobody can tell what&apos;s actually broken.
            </div>
            <div className="item">
              <b>Ten duplicate reports.</b> Same pothole, ten separate tickets.
            </div>
            <div className="item">
              <b>Wrong department.</b> Water leak sent to the electricity board.
            </div>
            <div className="item">
              <b>Total silence.</b> No one hears back after filing.
            </div>
          </div>
        </div>

        <section id="how">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">The workflow</p>
              <h2 className="display">
                From &quot;someone should fix this&quot; to a resolved ticket
              </h2>
              <p>
                One agentic pipeline runs on every report — not a chatbot
                answering questions, an agent doing the filing for you.
              </p>
            </div>
            <div className="flow">
              <div className="flow-line" />
              <div className="flow-steps">
                <div className="flow-step">
                  <div className="flow-dot">1</div>
                  <h4>Received</h4>
                  <p>
                    Photo, description or voice note, and GPS pin come in from
                    the citizen app.
                  </p>
                </div>
                <div className="flow-step">
                  <div className="flow-dot">2</div>
                  <h4>Verified</h4>
                  <p>
                    Gemini Vision classifies the issue and scores severity — low
                    to emergency.
                  </p>
                </div>
                <div className="flow-step">
                  <div className="flow-dot">3</div>
                  <h4>Assigned</h4>
                  <p>
                    Nearby duplicates are grouped, then the ticket is routed to
                    a department.
                  </p>
                </div>
                <div className="flow-step">
                  <div className="flow-dot">4</div>
                  <h4>In progress</h4>
                  <p>
                    Crews pick it up; the citizen sees the same status the
                    dashboard shows.
                  </p>
                </div>
                <div className="flow-step">
                  <div className="flow-dot">5</div>
                  <h4>Resolved</h4>
                  <p>
                    Closed out, timestamped, counted toward that
                    department&apos;s record.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="showcase">
          <div className="wrap">
            <PhoneShowcase />
            <div className="showcase-copy">
              <p className="eyebrow">The citizen app</p>
              <h2 className="display">Report it in three taps</h2>
              <ul>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>
                    <b>Live camera capture</b> — no gallery picker, so every
                    photo is fresh and geotagged.
                  </span>
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>
                    <b>Auto-analyzes on capture</b> — no separate &quot;submit
                    for review&quot; tap.
                  </span>
                </li>
                <li>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>
                    <b>Same status, both screens</b> — the citizen app and admin
                    dashboard read the same ticket.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">What the agent actually does</p>
              <h2 className="display">Six jobs, one pipeline</h2>
            </div>
            <div className="feature-grid">
              <div className="feature">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <h4>Vision classification</h4>
                <p>
                  Sorts photos into pothole, garbage, streetlight, drainage,
                  water leak, blockage, or unsafe footpath.
                </p>
              </div>
              <div className="feature">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 3l1.9 5.8H20l-4.9 3.6L17 18l-5-3.6L7 18l1.9-5.6L4 8.8h6.1z" />
                </svg>
                <h4>Severity scoring</h4>
                <p>
                  Flags low, medium, high, or emergency, so the worst hazards
                  surface first.
                </p>
              </div>
              <div className="feature">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="8" cy="8" r="3.2" />
                  <circle cx="16" cy="16" r="3.2" />
                  <path d="M10.3 10.3l3.4 3.4" />
                </svg>
                <h4>Duplicate clustering</h4>
                <p>
                  Ten reports of the same pothole become one ticket with ten
                  confirmations, not ten tickets.
                </p>
              </div>
              <div className="feature">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 3v6M12 21v-6M3 12h6M21 12h-6" />
                  <circle cx="12" cy="12" r="2.4" />
                </svg>
                <h4>Department routing</h4>
                <p>
                  Roads, waste, electricity, water, or traffic — the agent
                  decides who owns it.
                </p>
              </div>
              <div className="feature">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M4 12h4l2-7 4 14 2-7h4" />
                </svg>
                <h4>Public status page</h4>
                <p>
                  Received, verified, assigned, in progress, resolved — the
                  citizen watches every step.
                </p>
              </div>
              <div className="feature callout">
                <svg
                  className="ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z" />
                </svg>
                <h4>Admin dashboard</h4>
                <p>
                  Open issues, priority areas, duplicate clusters, and SLA
                  status, department by department.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="trust">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">No extra forms to fill in</p>
              <h2 className="display">
                A trust score, computed from what you already sent
              </h2>
              <p>
                Every report earns points from signals it already carries — a
                clearer photo, a tighter GPS fix, corroboration from neighbors,
                and how fresh the report is.
              </p>
            </div>
            <div className="score-card">
              <div className="score-rows">
                <div>
                  <span>Clear, in-focus image</span> <b>+30</b>
                </div>
                <div>
                  <span>Exact GPS location</span> <b>+30</b>
                </div>
                <div>
                  <span>Multiple nearby reports</span> <b>+25</b>
                </div>
                <div>
                  <span>Recently reported</span> <b>+15</b>
                </div>
              </div>
              <div className="score-total">
                <div className="num mono">82</div>
                <div className="lbl">Trust / 100</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap plaque-grid">
            <div className="plaque">
              <p className="eyebrow">Municipal ops view</p>
              <h3>Watch tickets move, live</h3>
              <p>
                The same backend that scores and routes every report also runs
                this admin console — open issues, duplicate clusters, and
                department queues in one screen.
              </p>
              <Link to="/admin" className="btn btn-primary">
                Open the dashboard
              </Link>
            </div>
            <div className="plaque">
              <p className="eyebrow">Built for a hackathon</p>
              <h3>All Things Agentic</h3>
              <p>
                Vision AI, an agentic workflow, and a working dashboard — built
                end-to-end for the All Things Agentic Hackathon.
              </p>
              <a
                href={DEVPOST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View on Devpost
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-links">
              <div className="foot-about">
                <h5>About</h5>
                <p>
                  FixMyCity AI was built solo by Nilu Mukherjee for the All
                  Things Agentic Hackathon — backend, admin dashboard, and the
                  Android app, end to end.
                </p>
                <div className="about-links">
                  <a
                    href={GITHUB_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub →
                  </a>
                  <a href="mailto:07.nilu@gmail.com">Email →</a>
                </div>
              </div>
              <div>
                <h5>Product</h5>
                <a href="#how">How it works</a>
                <a href="#features">Features</a>
                <Link to="/admin">Admin dashboard</Link>
              </div>
              <div>
                <h5>Legal</h5>
                <Link to="/privacy">Privacy policy</Link>
                <Link to="/terms">Terms of service</Link>
              </div>
              <div>
                <h5>Project</h5>
                <a href={DEVPOST_URL} target="_blank" rel="noopener noreferrer">
                  Devpost submission
                </a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>
              FixMyCity AI — a hackathon build, Bengaluru civic pilot.
            </span>
            <span className="mono">
              Backend: <span style={{ color: 'var(--route)' }}>●</span>{' '}
              operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PhoneShowcase() {
  return (
    <div className="phone-wrap">
      <div className="phone back">
        <div className="phone-screen">
          <img src="/app-list.png" alt="FixMyCity app, ticket list" />
        </div>
      </div>
      <div className="phone front">
        <div className="phone-screen">
          <img
            src="/app-detail.png"
            alt="FixMyCity app, ticket detail with status tracker"
          />
        </div>
      </div>
    </div>
  )
}
