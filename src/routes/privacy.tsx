import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({ component: PrivacyPolicy })

function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: August 27, 2026</p>

      <p className="mt-6 leading-relaxed">
        FixMyCity is a prototype built for a hackathon. It is not an
        official government service. This page explains what information
        the FixMyCity app and admin dashboard collect and how it's used.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Information we collect
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
        <li>
          <strong>Photos and descriptions</strong> you submit when reporting
          a civic issue (e.g. a pothole or broken streetlight).
        </li>
        <li>
          <strong>Location data</strong> (GPS coordinates and accuracy) for
          the issue you're reporting.
        </li>
        <li>
          <strong>Account information</strong> — your name, email address,
          and profile photo, provided by Google when you sign in.
        </li>
        <li>
          <strong>Ticket history</strong> — the issues you've reported and
          their status, so you can track them.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        How we use this information
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
        <li>
          To classify your report (category, severity) using an AI model
          (Google Gemini) and route it to a mocked municipal department.
        </li>
        <li>
          To detect duplicate reports of the same issue near the same
          location.
        </li>
        <li>
          To show you the status of issues you've personally reported —
          your Google account is what scopes a report to you specifically.
        </li>
        <li>
          To let city staff review, prioritize, and update the status of
          reported issues on the admin dashboard.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Where your data lives
      </h2>
      <p className="mt-3 leading-relaxed">
        Photos are stored in Google Cloud Storage. Report and account data
        are stored in a Postgres database on Google Cloud SQL. Sign-in is
        handled by Google's own OAuth service — we never see or store your
        Google password. We don't sell your data or share it with
        advertisers.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Department routing is mocked
      </h2>
      <p className="mt-3 leading-relaxed">
        This is a hackathon prototype: reports are <em>not</em> actually
        transmitted to any real municipal system or department. Routing is
        simulated for demonstration purposes only.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Your choices
      </h2>
      <p className="mt-3 leading-relaxed">
        You can stop using the app and sign out at any time. To request
        deletion of your account and associated reports, contact us using
        the details below.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Children's privacy
      </h2>
      <p className="mt-3 leading-relaxed">
        FixMyCity is not directed at children under 13, and we don't
        knowingly collect information from them.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">Changes</h2>
      <p className="mt-3 leading-relaxed">
        As this project evolves, this policy may change. We'll update the
        "Last updated" date above when it does.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-gray-900">Contact</h2>
      <p className="mt-3 leading-relaxed">
        Questions about this policy? Reach out at{' '}
        <a
          href="mailto:07.nilu@gmail.com"
          className="text-teal-700 underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          07.nilu@gmail.com
        </a>
        .
      </p>
    </div>
  )
}
