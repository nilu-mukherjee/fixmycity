import { Link } from '@tanstack/react-router'

const GITHUB_URL = 'https://github.com/nilu-mukherjee/fixmycity'
const GITHUB_PROFILE_URL = 'https://github.com/nilu-mukherjee'
const DEVPOST_URL = 'https://allthingsagentichackathon.devpost.com/'

/** Footer used identically on every page — home, architecture, privacy, terms. */
export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-links">
            <div className="foot-about">
              <h5>About</h5>
              <p>
                FixMyCity AI was built solo by Nilu Mukherjee for the All Things
                Agentic Hackathon — backend, admin dashboard, and the Android
                app, end to end.
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
              <a href="/#how">How it works</a>
              <a href="/#features">Features</a>
              <Link to="/admin">Admin dashboard</Link>
            </div>
            <div>
              <h5>Legal</h5>
              <Link to="/privacy">Privacy policy</Link>
              <Link to="/terms">Terms of service</Link>
            </div>
            <div>
              <h5>Project</h5>
              <Link to="/architecture">Architecture</Link>
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
          <span>FixMyCity AI — a hackathon build, Bengaluru civic pilot.</span>
          <span className="mono">
            Backend: <span style={{ color: 'var(--route)' }}>●</span>{' '}
            operational
          </span>
        </div>
      </div>
    </footer>
  )
}
