import { createFileRoute } from '@tanstack/react-router'

import { LegalShell } from '#/components/legal-shell'

export const Route = createFileRoute('/terms')({ component: TermsOfService })

function TermsOfService() {
  return (
    <LegalShell title="Terms of Service" updated="August 27, 2026">
      <p>
        FixMyCity is a prototype built for the All Things Agentic Hackathon. It
        is <strong>not</strong> an official government service, and using it
        does not guarantee that any reported issue will be reviewed, acted on,
        or resolved by any real municipal authority. By using the app or admin
        dashboard, you agree to these terms.
      </p>

      <h2>What the service does</h2>
      <p>
        You can submit a photo, location, and short note describing a civic
        issue (e.g. a pothole, an overflowing bin, a broken streetlight). An AI
        model classifies the issue, estimates its severity, checks for nearby
        duplicate reports, and routes it to a simulated department. Department
        routing is mocked for this prototype — no report is transmitted to any
        real municipal system.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          Submit genuine reports of real civic issues, not spam or joke
          submissions.
        </li>
        <li>
          Only submit photos and location data you have the right to share.
        </li>
        <li>
          Don't attempt to disrupt, overload, or reverse-engineer the service.
        </li>
        <li>
          Keep your Google account credentials secure — you're responsible for
          activity under your account.
        </li>
      </ul>

      <h2>No warranty</h2>
      <p>
        This is a hackathon project provided "as is," without warranties of any
        kind. AI-generated classifications (category, severity, description) may
        be inaccurate. We don't guarantee the service will be available,
        error-free, or secure at all times.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, FixMyCity and its creators
        aren't liable for any damages arising from your use of, or inability to
        use, the service — including reliance on any report status,
        classification, or routing decision it produces.
      </p>

      <h2>Changes to the service or these terms</h2>
      <p>
        As a hackathon prototype, features, data, and these terms may change or
        be discontinued at any time without notice.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Reach out at{' '}
        <a href="mailto:07.nilu@gmail.com">07.nilu@gmail.com</a>. See also our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalShell>
  )
}
