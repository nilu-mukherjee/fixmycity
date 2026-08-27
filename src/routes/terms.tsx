import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({ component: TermsOfService })

function TermsOfService() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: August 27, 2026</p>

      <p className="mt-6 leading-relaxed">
        FixMyCity is a prototype built for the All Things Agentic Hackathon.
        It is <strong>not</strong> an official government service, and using
        it does not guarantee that any reported issue will be reviewed,
        acted on, or resolved by any real municipal authority. By using the
        app or admin dashboard, you agree to these terms.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        What the service does
      </h2>
      <p className="mt-3 leading-relaxed">
        You can submit a photo, location, and short note describing a civic
        issue (e.g. a pothole, an overflowing bin, a broken streetlight).
        An AI model classifies the issue, estimates its severity, checks
        for nearby duplicate reports, and routes it to a simulated
        department. Department routing is mocked for this prototype — no
        report is transmitted to any real municipal system.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Your responsibilities
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
        <li>Submit genuine reports of real civic issues, not spam or joke submissions.</li>
        <li>Only submit photos and location data you have the right to share.</li>
        <li>Don't attempt to disrupt, overload, or reverse-engineer the service.</li>
        <li>Keep your Google account credentials secure — you're responsible for activity under your account.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        No warranty
      </h2>
      <p className="mt-3 leading-relaxed">
        This is a hackathon project provided "as is," without warranties of
        any kind. AI-generated classifications (category, severity,
        description) may be inaccurate. We don't guarantee the service will
        be available, error-free, or secure at all times.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Limitation of liability
      </h2>
      <p className="mt-3 leading-relaxed">
        To the fullest extent permitted by law, FixMyCity and its creators
        aren't liable for any damages arising from your use of, or
        inability to use, the service — including reliance on any report
        status, classification, or routing decision it produces.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Changes to the service or these terms
      </h2>
      <p className="mt-3 leading-relaxed">
        As a hackathon prototype, features, data, and these terms may
        change or be discontinued at any time without notice.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">Contact</h2>
      <p className="mt-3 leading-relaxed">
        Questions about these terms? Reach out at{' '}
        <a
          href="mailto:07.nilu@gmail.com"
          className="text-teal-700 underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          07.nilu@gmail.com
        </a>
        . See also our{' '}
        <a
          href="/privacy"
          className="text-teal-700 underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  )
}
