import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'

import { Button } from '#/components/ui/button'
import { getPublicUrl } from '#/gcs/url'
import { api } from '../../convex/_generated/api'

import type { Doc, Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({ component: AdminConsole })

type Category = Doc<'tickets'>['category']
type Severity = Doc<'tickets'>['severity']
type Status = Doc<'tickets'>['status']

const CATEGORY_LABEL: Record<Category, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage Overflow',
  streetlight: 'Broken Streetlight',
  drainage: 'Open Drainage',
  water_leakage: 'Water Leakage',
  road_blockage: 'Road Blockage',
  unsafe_footpath: 'Unsafe Footpath',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  emergency: 'Emergency',
}

const SEVERITY_ORDER: Array<Severity> = ['low', 'medium', 'high', 'emergency']

const STATUS_LABEL: Record<Status, string> = {
  received: 'Received',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const STATUS_PIPELINE: Array<Status> = [
  'received',
  'verified',
  'assigned',
  'in_progress',
  'resolved',
]

function nextStatus(status: Status): Status | null {
  const i = STATUS_PIPELINE.indexOf(status)
  return i === -1 || i === STATUS_PIPELINE.length - 1 ? null : STATUS_PIPELINE[i + 1]
}

function formatTicketId(ticketNumber: number): string {
  return `FMC${ticketNumber.toString().padStart(3, '0')}`
}

function relativeTime(creationTime: number): string {
  const ms = Date.now() - creationTime
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function AdminConsole() {
  const ticketsQuery = useQuery(convexQuery(api.tickets.list, {}))
  const tickets = ticketsQuery.data ?? []

  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    () => new Set(['received', 'verified', 'assigned', 'in_progress']),
  )
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set())
  const [selectedId, setSelectedId] = useState<Id<'tickets'> | null>(null)

  const filtered = useMemo(() => {
    return tickets
      .filter((t) => statusFilter.size === 0 || statusFilter.has(t.status))
      .filter((t) => severityFilter.size === 0 || severityFilter.has(t.severity))
      .sort((a, b) => {
        const sevDiff = SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity)
        return sevDiff !== 0 ? sevDiff : b._creationTime - a._creationTime
      })
  }, [tickets, statusFilter, severityFilter])

  const selected = tickets.find((t) => t._id === selectedId) ?? null
  const openCount = tickets.filter((t) => t.status !== 'resolved').length

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  return (
    <div className="admin min-h-screen">
      <header className="border-b px-6 py-5 sm:px-10" style={{ borderColor: 'var(--admin-line)' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="size-9 shrink-0" />
            <div>
              <p className="font-mono text-[0.68rem] tracking-[0.14em] uppercase" style={{ color: 'var(--admin-ink-soft)' }}>
                FixMyCity — Admin
              </p>
              <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--admin-ink)' }}>
                Issue Queue
              </h1>
            </div>
          </div>
          <p className="font-mono text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--admin-ink)' }}>
              {openCount}
            </span>{' '}
            open of {tickets.length}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
        <div className="mb-5 flex flex-wrap gap-2">
          {STATUS_PIPELINE.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter.has(s)}
              label={STATUS_LABEL[s]}
              color={`var(--status-${s})`}
              onClick={() => toggle(statusFilter, s, setStatusFilter)}
            />
          ))}
          <span className="mx-1 w-px" style={{ background: 'var(--admin-line)' }} />
          {SEVERITY_ORDER.map((s) => (
            <FilterChip
              key={s}
              active={severityFilter.has(s)}
              label={SEVERITY_LABEL[s]}
              color={`var(--severity-${s})`}
              onClick={() => toggle(severityFilter, s, setSeverityFilter)}
            />
          ))}
        </div>

        {ticketsQuery.isLoading ? (
          <p className="py-16 text-center font-mono text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
            Loading queue…
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center font-mono text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
            No issues match these filters.
          </p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-md border" style={{ borderColor: 'var(--admin-line)' }}>
            {filtered.map((t) => (
              <TicketRow key={t._id} ticket={t} onClick={() => setSelectedId(t._id)} />
            ))}
          </ul>
        )}
      </div>

      {selected && <DetailPanel ticket={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function FilterChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
      style={{
        borderColor: active ? color : 'var(--admin-line)',
        background: active ? `color-mix(in oklab, ${color} 16%, var(--admin-panel))` : 'var(--admin-panel)',
        color: active ? color : 'var(--admin-ink-soft)',
      }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </button>
  )
}

function TicketRow({ ticket, onClick }: { ticket: Doc<'tickets'>; onClick: () => void }) {
  const trustTotal =
    ticket.trustScore.clearImagePoints +
    ticket.trustScore.exactLocationPoints +
    ticket.trustScore.nearbyReportsPoints +
    ticket.trustScore.recentReportPoints

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-4 border-b px-0 py-3 text-left transition-colors last:border-b-0 hover:brightness-[0.98]"
        style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-panel)' }}
      >
        <span
          aria-hidden
          className={
            ticket.severity === 'emergency'
              ? 'severity-stripe--emergency h-11 w-1.5 shrink-0'
              : 'h-11 w-1.5 shrink-0'
          }
          style={
            ticket.severity === 'emergency'
              ? undefined
              : { background: `var(--severity-${ticket.severity})` }
          }
        />
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs" style={{ color: 'var(--admin-ink-soft)' }}>
              {formatTicketId(ticket.ticketNumber)}
            </span>
            <span className="font-medium">{CATEGORY_LABEL[ticket.category]}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--admin-ink-soft)' }}>
              {relativeTime(ticket._creationTime)}
            </span>
          </div>
          <p className="truncate text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
            {ticket.description}
          </p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs" style={{ color: 'var(--admin-ink-soft)' }}>
            {ticket.department}
          </p>
          <p className="font-mono text-xs" style={{ color: 'var(--admin-ink-soft)' }}>
            Trust {trustTotal}/100
          </p>
        </div>
        <StatusPill status={ticket.status} />
      </button>
    </li>
  )
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{
        color: `var(--status-${status})`,
        background: `color-mix(in oklab, var(--status-${status}) 16%, var(--admin-panel))`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function TrustRow({ label, points, max }: { label: string; points: number; max: number }) {
  const earned = points > 0
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span style={{ color: earned ? 'var(--admin-ink)' : 'var(--admin-ink-soft)' }}>{label}</span>
      <span className="font-mono" style={{ color: earned ? 'var(--admin-ink)' : 'var(--admin-ink-soft)' }}>
        +{points}
        <span style={{ color: 'var(--admin-ink-soft)' }}>/{max}</span>
      </span>
    </div>
  )
}

function DetailPanel({ ticket, onClose }: { ticket: Doc<'tickets'>; onClose: () => void }) {
  const updateStatus = useConvexMutation(api.tickets.updateStatus)
  const [pending, setPending] = useState(false)
  const next = nextStatus(ticket.status)

  const trustTotal =
    ticket.trustScore.clearImagePoints +
    ticket.trustScore.exactLocationPoints +
    ticket.trustScore.nearbyReportsPoints +
    ticket.trustScore.recentReportPoints

  async function advance() {
    if (!next) return
    setPending(true)
    try {
      await updateStatus({ id: ticket._id, status: next })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'color-mix(in oklab, var(--admin-ink) 32%, transparent)' }}
      />
      <aside
        className="admin fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l shadow-xl"
        style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-paper)' }}
      >
        <div className="flex items-start justify-between border-b p-6" style={{ borderColor: 'var(--admin-line)' }}>
          <div>
            <p className="font-mono text-xs" style={{ color: 'var(--admin-ink-soft)' }}>
              {formatTicketId(ticket.ticketNumber)}
            </p>
            <h2 className="font-display text-2xl font-semibold">{CATEGORY_LABEL[ticket.category]}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
            ✕
          </Button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center gap-2">
            <span
              className={
                ticket.severity === 'emergency' ? 'severity-stripe--emergency h-6 w-2 rounded-full' : 'h-6 w-2 rounded-full'
              }
              style={ticket.severity === 'emergency' ? undefined : { background: `var(--severity-${ticket.severity})` }}
            />
            <span className="text-sm font-medium">{SEVERITY_LABEL[ticket.severity]} severity</span>
            <StatusPill status={ticket.status} />
          </div>

          <img
            src={getPublicUrl(ticket.photoGcsObjectName)}
            alt={`Reported ${CATEGORY_LABEL[ticket.category].toLowerCase()}`}
            className="aspect-4/3 w-full rounded-md border object-cover"
            style={{ borderColor: 'var(--admin-line)' }}
          />

          <p className="text-sm leading-relaxed">{ticket.description}</p>

          {ticket.urgencyNote && (
            <div>
              <p className="font-mono text-[0.68rem] tracking-[0.1em] uppercase" style={{ color: 'var(--admin-ink-soft)' }}>
                Citizen note
              </p>
              <p className="text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
                {ticket.urgencyNote}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-[0.68rem] tracking-[0.1em] uppercase" style={{ color: 'var(--admin-ink-soft)' }}>
                Department
              </p>
              <p>{ticket.department}</p>
            </div>
            <div>
              <p className="font-mono text-[0.68rem] tracking-[0.1em] uppercase" style={{ color: 'var(--admin-ink-soft)' }}>
                Location
              </p>
              <p className="font-mono text-xs">
                <a
                  href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                >
                  {ticket.latitude.toFixed(5)}, {ticket.longitude.toFixed(5)}
                </a>
                {ticket.accuracyMeters !== undefined && (
                  <span style={{ color: 'var(--admin-ink-soft)' }}> ±{Math.round(ticket.accuracyMeters)}m</span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-md border p-4" style={{ borderColor: 'var(--admin-line)', background: 'var(--admin-panel)' }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[0.68rem] tracking-[0.1em] uppercase" style={{ color: 'var(--admin-ink-soft)' }}>
                Trust score
              </p>
              <p className="font-mono text-sm font-semibold">{trustTotal}/100</p>
            </div>
            <TrustRow label="Clear image" points={ticket.trustScore.clearImagePoints} max={30} />
            <TrustRow label="Exact location" points={ticket.trustScore.exactLocationPoints} max={30} />
            <TrustRow label="Nearby reports" points={ticket.trustScore.nearbyReportsPoints} max={25} />
            <TrustRow label="Recent report" points={ticket.trustScore.recentReportPoints} max={15} />
          </div>
        </div>

        <div className="mt-auto border-t p-6" style={{ borderColor: 'var(--admin-line)' }}>
          {next ? (
            <Button className="w-full" disabled={pending} onClick={advance}>
              {pending ? 'Updating…' : `Mark as ${STATUS_LABEL[next]}`}
            </Button>
          ) : (
            <p className="text-center text-sm" style={{ color: 'var(--admin-ink-soft)' }}>
              Resolved — nothing further to do.
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
