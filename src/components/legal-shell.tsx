import { Link } from '@tanstack/react-router'

import '#/styles/landing.css'

/** Shared chrome for /privacy and /terms — same nav/footer/typography as the
 * landing page (src/routes/index.tsx), so these read as part of one site
 * instead of a generic styled document. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="landing">
      <header className="nav">
        <div className="wrap">
          <Link to="/" className="brand">
            <span className="mark">
              Fix<span>My</span>City
            </span>
            <span className="tag">BETA · BLR</span>
          </Link>
          <div className="navbtns">
            <Link to="/" className="btn btn-ghost btn-sm">
              ← Back to home
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="legal-main">
          <div className="legal-wrap">
            <p className="eyebrow">Last updated: {updated}</p>
            <h1 className="display">{title}</h1>
            <div className="legal-body">{children}</div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-bottom" style={{ paddingTop: 0 }}>
            <span>
              FixMyCity AI — a hackathon build, Bengaluru civic pilot.
            </span>
            <span className="mono">
              <Link to="/privacy">Privacy</Link> ·{' '}
              <Link to="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
