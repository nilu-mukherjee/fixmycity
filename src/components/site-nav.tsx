import { Link } from '@tanstack/react-router'

const APK_URL =
  'https://github.com/nilu-mukherjee/fixmycity/actions/workflows/flutter-build.yml'

/** Header used identically on every page — home, architecture, privacy, terms. */
export function SiteNav() {
  return (
    <header className="nav">
      <div className="wrap">
        <Link to="/" className="brand">
          <span className="mark">
            <svg
              className="hammer"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <g transform="rotate(45 12 12)">
                <rect
                  x="7"
                  y="2"
                  width="10"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                />
                <rect
                  x="10.5"
                  y="9"
                  width="3"
                  height="12"
                  rx="1.5"
                  fill="currentColor"
                />
              </g>
            </svg>
            Fix<span>My</span>City
          </span>
          <span className="tag">BETA · BLR</span>
        </Link>
        <nav className="navlinks">
          <a href="/#how" className="navlink">
            How it works
          </a>
          <a href="/#features" className="navlink">
            Features
          </a>
          <a href="/#trust" className="navlink">
            Trust score
          </a>
          <Link to="/architecture" className="navlink">
            Architecture
          </Link>
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
  )
}
