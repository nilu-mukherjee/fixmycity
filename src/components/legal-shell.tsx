import { SiteFooter } from '#/components/site-footer'
import { SiteNav } from '#/components/site-nav'

import '#/styles/landing.css'

/** Shared chrome for /privacy and /terms — same nav/footer/typography as the
 * rest of the site, so these read as part of one product instead of a
 * generic styled document. */
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
      <SiteNav />

      <main>
        <section className="legal-main">
          <div className="legal-wrap">
            <p className="eyebrow">Last updated: {updated}</p>
            <h1 className="display">{title}</h1>
            <div className="legal-body">{children}</div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
