import { useEffect, useMemo, useState } from 'react'
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

/** TailAdmin-style badge tones — light bg + colored text, brighter text on dark bg. */
const SEVERITY_BADGE: Record<Severity, string> = {
  low: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  medium: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500',
  high: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  emergency: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500',
}

const STATUS_LABEL: Record<Status, string> = {
  received: 'Received',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

const STATUS_BADGE: Record<Status, string> = {
  received: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400',
  verified: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  assigned: 'bg-theme-purple-50 text-theme-purple-700 dark:bg-theme-purple-500/15 dark:text-theme-purple-500',
  in_progress: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500',
  resolved: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
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

function formatDate(creationTime: number): string {
  return new Date(creationTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function relativeTime(creationTime: number): string {
  const ms = Date.now() - creationTime
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

interface MonthOverMonth {
  /** null when there's nothing to compare against (no reports last month). */
  pct: number | null
  /** True when last month had zero reports but this month has some. */
  isNew: boolean
}

/**
 * Change in report count, this calendar month vs last, for one severity.
 * For a civic-issue tracker, fewer reports is the good direction — so the
 * caller should render a negative pct as "good" (green), not the usual
 * business-KPI convention of "up = good".
 */
function monthOverMonth(tickets: Array<Doc<'tickets'>>, severity: Severity): MonthOverMonth {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()

  let thisMonth = 0
  let lastMonth = 0
  for (const t of tickets) {
    if (t.severity !== severity) continue
    if (t._creationTime >= thisMonthStart) thisMonth++
    else if (t._creationTime >= lastMonthStart) lastMonth++
  }

  if (lastMonth === 0) {
    return { pct: null, isNew: thisMonth > 0 }
  }
  return { pct: Math.round(((thisMonth - lastMonth) / lastMonth) * 100), isNew: false }
}

function trustTotal(score: Doc<'tickets'>['trustScore']): number {
  return (
    score.clearImagePoints +
    score.exactLocationPoints +
    score.nearbyReportsPoints +
    score.recentReportPoints
  )
}

type SortKey = 'category' | 'severity' | 'status' | 'department' | 'trust' | 'reported'

function compareBySortKey(key: SortKey, a: Doc<'tickets'>, b: Doc<'tickets'>): number {
  switch (key) {
    case 'category':
      return CATEGORY_LABEL[a.category].localeCompare(CATEGORY_LABEL[b.category])
    case 'severity':
      return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    case 'status':
      return STATUS_PIPELINE.indexOf(a.status) - STATUS_PIPELINE.indexOf(b.status)
    case 'department':
      return a.department.localeCompare(b.department)
    case 'trust':
      return trustTotal(a.trustScore) - trustTotal(b.trustScore)
    case 'reported':
      return a._creationTime - b._creationTime
  }
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    try {
      return localStorage.getItem('admin-dark-mode') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('admin-dark-mode', String(isDark))
    } catch {
      // Private-browsing / storage-disabled — dark mode just won't persist.
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark((v) => !v) }
}

function AdminConsole() {
  const ticketsQuery = useQuery(convexQuery(api.tickets.list, {}))
  const tickets = ticketsQuery.data ?? []
  const { isDark, toggle: toggleDark } = useDarkMode()

  const [statusFilter, setStatusFilter] = useState<Set<Status>>(
    () => new Set(['received', 'verified', 'assigned', 'in_progress']),
  )
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set())
  const [selectedId, setSelectedId] = useState<Id<'tickets'> | null>(null)
  const [sortColumn, setSortColumn] = useState<SortKey | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const result = tickets
      .filter((t) => statusFilter.size === 0 || statusFilter.has(t.status))
      .filter((t) => severityFilter.size === 0 || severityFilter.has(t.severity))

    return [...result].sort((a, b) => {
      if (sortColumn) {
        const cmp = compareBySortKey(sortColumn, a, b)
        return sortAsc ? cmp : -cmp
      }
      const sevDiff = SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity)
      return sevDiff !== 0 ? sevDiff : b._creationTime - a._creationTime
    })
  }, [tickets, statusFilter, severityFilter, sortColumn, sortAsc])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, severityFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)
  const pageStart = (clampedPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortColumn === key) {
      setSortAsc((v) => !v)
    } else {
      setSortColumn(key)
      setSortAsc(true)
    }
  }

  const selected = tickets.find((t) => t._id === selectedId) ?? null
  const openCount = tickets.filter((t) => t.status !== 'resolved').length

  function toggle<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setter(next)
  }

  return (
    <div className={`admin flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 ${isDark ? 'dark' : ''}`}>
      <SidebarRail />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Header
          openCount={openCount}
          totalCount={tickets.length}
          isDark={isDark}
          toggleDark={toggleDark}
        />
        <main className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6">
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {SEVERITY_ORDER.map((s) => (
              <PriorityBadge key={s} s={s} tickets={tickets} />
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Reported Issues</h3>
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {filtered.length} issue{filtered.length === 1 ? '' : 's'} matching the filters above
                </p>
              </div>
              <div className="inline-flex h-11 w-full gap-0.5 overflow-x-auto rounded-lg bg-gray-100 p-0.5 sm:w-auto lg:min-w-fit dark:bg-gray-900">
                <StatusTab
                  label="All"
                  active={statusFilter.size === 0}
                  onClick={() => setStatusFilter(new Set())}
                />
                {STATUS_PIPELINE.map((s) => (
                  <StatusTab
                    key={s}
                    label={STATUS_LABEL[s]}
                    active={statusFilter.size === 1 && statusFilter.has(s)}
                    onClick={() => setStatusFilter(new Set([s]))}
                  />
                ))}
              </div>
            </div>

            {ticketsQuery.isLoading ? (
              <div className="w-full px-4 py-16 sm:px-5">
                <p className="text-theme-sm text-center text-gray-500 dark:text-gray-400">
                  Loading queue…
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="w-full px-4 py-16 sm:px-5">
                <p className="text-theme-sm text-center text-gray-500 dark:text-gray-400">
                  No issues match these filters.
                </p>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <Th>ID</Th>
                        <SortableTh label="Issue" sortKey="category" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableTh label="Severity" sortKey="severity" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableTh label="Department" sortKey="department" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableTh label="Trust" sortKey="trust" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableTh label="Reported" sortKey="reported" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableTh label="Status" sortKey="status" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((t) => (
                        <TicketRow key={t._id} ticket={t} onClick={() => setSelectedId(t._id)} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:px-5 dark:border-gray-800">
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    Showing {pageRows.length === 0 ? 0 : pageStart + 1}–{pageStart + pageRows.length} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={clampedPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="shadow-theme-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                    >
                      Previous
                    </button>
                    <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                      Page {clampedPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={clampedPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="shadow-theme-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {selected && <DetailPanel ticket={selected} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function Header({
  openCount,
  totalCount,
  isDark,
  toggleDark,
}: {
  openCount: number
  totalCount: number
  isDark: boolean
  toggleDark: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="" className="size-9 shrink-0 rounded-lg" />
          <div>
            <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
              FixMyCity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-800 dark:text-white/90">{openCount}</span>{' '}
            open of {totalCount}
          </p>
          <button
            type="button"
            onClick={toggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  )
}

/**
 * Permanently collapsed icon rail — TailAdmin's sidebar has real
 * expand/collapse + multi-page nav, but this app only has one real page
 * (Issue Queue). Rather than build out fake pages, the rail stays locked
 * collapsed and every icon besides the active one is an inert "coming
 * soon" stub — an honest placeholder for where the rest of TailAdmin's
 * nav would go once there's more than one admin page.
 */
function SidebarRail() {
  return (
    <aside className="hidden w-[90px] shrink-0 flex-col items-center border-r border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-black sm:flex">
      <img src="/favicon.png" alt="FixMyCity" className="mb-8 size-9 rounded-lg" />
      <nav className="flex flex-col items-center gap-2">
        <RailIcon label="Issue Queue" active>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z"
          />
        </RailIcon>
        <RailIcon label="Calendar — coming soon">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8 2C8.41421 2 8.75 2.33579 8.75 2.75V3.75H15.25V2.75C15.25 2.33579 15.5858 2 16 2C16.4142 2 16.75 2.33579 16.75 2.75V3.75H18.5C19.7426 3.75 20.75 4.75736 20.75 6V9V19C20.75 20.2426 19.7426 21.25 18.5 21.25H5.5C4.25736 21.25 3.25 20.2426 3.25 19V9V6C3.25 4.75736 4.25736 3.75 5.5 3.75H7.25V2.75C7.25 2.33579 7.58579 2 8 2ZM8 5.25H5.5C5.08579 5.25 4.75 5.58579 4.75 6V8.25H19.25V6C19.25 5.58579 18.9142 5.25 18.5 5.25H16H8ZM19.25 9.75H4.75V19C4.75 19.4142 5.08579 19.75 5.5 19.75H18.5C18.9142 19.75 19.25 19.4142 19.25 19V9.75Z"
          />
        </RailIcon>
        <RailIcon label="Tables — coming soon">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.25 5.5C3.25 4.25736 4.25736 3.25 5.5 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V18.5C20.75 19.7426 19.7426 20.75 18.5 20.75H5.5C4.25736 20.75 3.25 19.7426 3.25 18.5V5.5ZM5.5 4.75C5.08579 4.75 4.75 5.08579 4.75 5.5V8.58325L19.25 8.58325V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H5.5ZM19.25 10.0833H15.416V13.9165H19.25V10.0833ZM13.916 10.0833L10.083 10.0833V13.9165L13.916 13.9165V10.0833ZM8.58301 10.0833H4.75V13.9165H8.58301V10.0833ZM4.75 18.5V15.4165H8.58301V19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5ZM10.083 19.25V15.4165L13.916 15.4165V19.25H10.083ZM15.416 19.25V15.4165H19.25V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15.416Z"
          />
        </RailIcon>
        <RailIcon label="Forms — coming soon">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H18.5001C19.7427 20.75 20.7501 19.7426 20.7501 18.5V5.5C20.7501 4.25736 19.7427 3.25 18.5001 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H18.5001C18.9143 4.75 19.2501 5.08579 19.2501 5.5V18.5C19.2501 18.9142 18.9143 19.25 18.5001 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V5.5ZM6.25005 9.7143C6.25005 9.30008 6.58583 8.9643 7.00005 8.9643L17 8.96429C17.4143 8.96429 17.75 9.30008 17.75 9.71429C17.75 10.1285 17.4143 10.4643 17 10.4643L7.00005 10.4643C6.58583 10.4643 6.25005 10.1285 6.25005 9.7143ZM6.25005 14.2857C6.25005 13.8715 6.58583 13.5357 7.00005 13.5357H17C17.4143 13.5357 17.75 13.8715 17.75 14.2857C17.75 14.6999 17.4143 15.0357 17 15.0357H7.00005C6.58583 15.0357 6.25005 14.6999 6.25005 14.2857Z"
          />
        </RailIcon>
        <RailIcon label="User Profile — coming soon">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
          />
        </RailIcon>
      </nav>
    </aside>
  )
}

function RailIcon({
  label,
  active,
  children,
}: {
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        disabled={!active}
        aria-label={label}
        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${active
          ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
          : 'cursor-not-allowed text-gray-400 dark:text-gray-600'
          }`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          {children}
        </svg>
      </button>
      <span className="text-theme-xs pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-md bg-gray-900 px-2.5 py-1.5 font-medium whitespace-nowrap text-white opacity-0 shadow-theme-lg transition-opacity group-hover:opacity-100 dark:bg-gray-800">
        {label}
      </span>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 first:pl-6 last:pr-6">
      <p className="text-theme-xs font-medium text-gray-500 uppercase dark:text-gray-400">
        {children}
      </p>
    </th>
  )
}

function SortableTh({
  label,
  sortKey,
  sortColumn,
  sortAsc,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sortColumn: SortKey | null
  sortAsc: boolean
  onSort: (key: SortKey) => void
}) {
  const isActive = sortColumn === sortKey
  return (
    <th className="px-5 py-3 first:pl-6 last:pr-6">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 uppercase dark:text-gray-400"
      >
        {label}
        <span className="flex flex-col gap-0.5">
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            className={isActive && sortAsc ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-700'}
          >
            <path
              d="M4.40962 0.585167C4.21057 0.300808 3.78943 0.300807 3.59038 0.585166L1.05071 4.21327C0.81874 4.54466 1.05582 5 1.46033 5H6.53967C6.94418 5 7.18126 4.54466 6.94929 4.21327L4.40962 0.585167Z"
              fill="currentColor"
            />
          </svg>
          <svg
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            className={isActive && !sortAsc ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-700'}
          >
            <path
              d="M4.40962 4.41483C4.21057 4.69919 3.78943 4.69919 3.59038 4.41483L1.05071 0.786732C0.81874 0.455343 1.05582 0 1.46033 0H6.53967C6.94418 0 7.18126 0.455342 6.94929 0.786731L4.40962 4.41483Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>
    </th>
  )
}

function PriorityBadge({
  s,
  tickets,
}: {
  s: Severity
  tickets: Array<Doc<'tickets'>>
}) {
  const momChange = monthOverMonth(tickets, s)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        {SEVERITY_LABEL[s]}
      </p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            {tickets.filter((t) => t.severity === s).length}
          </h4>
        </div>
        <MonthOverMonthBadge change={momChange} />
      </div>
    </div>
  )
}

function StatusTab({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-theme-sm h-10 flex-1 rounded-md px-2 py-2 font-medium whitespace-nowrap sm:px-3 lg:flex-initial ${
        active
          ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
          : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-theme-sm inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-colors ${active
        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/5'
        }`}
    >
      {label}
    </button>
  )
}

/**
 * Fewer reports than last month is the good direction for a civic-issue
 * tracker, so a negative pct renders green and a positive one renders red
 * — the reverse of the usual "up = good" business-KPI convention.
 */
function MonthOverMonthBadge({ change }: { change: MonthOverMonth }) {
  if (change.isNew) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-theme-xs rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400">
          New
        </span>
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">this month</span>
      </div>
    )
  }
  if (change.pct === null) {
    return <span className="text-theme-xs text-gray-400 dark:text-gray-500">No data last month</span>
  }

  const isIncrease = change.pct > 0
  const tone =
    change.pct === 0
      ? 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400'
      : isIncrease
        ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
        : 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'

  return (
    <div className="flex items-center gap-1">
      <span className={`text-theme-xs rounded-full px-2 py-0.5 font-medium ${tone}`}>
        {change.pct > 0 ? '+' : ''}
        {change.pct}%
      </span>
      <span className="text-theme-xs text-gray-500 dark:text-gray-400">Vs last month</span>
    </div>
  )
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span
      className={`text-theme-xs inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium whitespace-nowrap ${tone}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** TailAdmin's "Light Background with Left Icon" badge alert glyph — a filled triangle, fitting for a severity indicator. */
function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="fill-current" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.00012 1.25C6.27346 1.25 6.52462 1.39908 6.65597 1.63875L11.156 9.63875C11.2833 9.87105 11.2792 10.1536 11.1452 10.382C11.0112 10.6104 10.7658 10.75 10.5001 10.75H1.50012C1.23448 10.75 0.989039 10.6104 0.855068 10.382C0.721097 10.1536 0.716918 9.87105 0.844287 9.63875L5.34429 1.63875C5.47563 1.39908 5.72679 1.25 6.00012 1.25ZM6.00012 4.25C6.34531 4.25 6.62512 4.52982 6.62512 4.875V6.875C6.62512 7.22018 6.34531 7.5 6.00012 7.5C5.65494 7.5 5.37512 7.22018 5.37512 6.875V4.875C5.37512 4.52982 5.65494 4.25 6.00012 4.25ZM6.00012 9.25C6.41434 9.25 6.75012 8.91422 6.75012 8.5C6.75012 8.08579 6.41434 7.75 6.00012 7.75C5.58591 7.75 5.25012 8.08579 5.25012 8.5C5.25012 8.91422 5.58591 9.25 6.00012 9.25Z"
        fill=""
      />
    </svg>
  )
}

function TicketRow({ ticket, onClick }: { ticket: Doc<'tickets'>; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
    >
      <td className="px-5 py-4 pl-6">
        <span className="text-theme-xs font-mono text-gray-400 dark:text-gray-500">
          {formatTicketId(ticket.ticketNumber)}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={
              ticket.severity === 'emergency'
                ? 'severity-stripe--emergency h-9 w-1.5 shrink-0 rounded-full'
                : 'h-9 w-1.5 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700'
            }
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-800 dark:text-white/90">
              {CATEGORY_LABEL[ticket.category]}
            </p>
            <p className="text-theme-xs max-w-[260px] truncate text-gray-500 dark:text-gray-400">
              {ticket.description}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <Badge tone={SEVERITY_BADGE[ticket.severity]} icon={<AlertIcon />}>
          {SEVERITY_LABEL[ticket.severity]}
        </Badge>
      </td>
      <td className="text-theme-sm px-5 py-4 text-gray-600 dark:text-gray-300">
        {ticket.department}
      </td>
      <td className="text-theme-sm px-5 py-4 font-mono text-gray-600 dark:text-gray-300">
        {trustTotal(ticket.trustScore)}/100
      </td>
      <td className="text-theme-xs px-5 py-4 pr-6 whitespace-nowrap text-gray-400 dark:text-gray-500">
        {relativeTime(ticket._creationTime)}
      </td>
      <td className="px-5 py-4">
        <Badge tone={STATUS_BADGE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
      </td>
    </tr>
  )
}

function TrustRow({ label, points, max }: { label: string; points: number; max: number }) {
  const pct = (points / max) * 100
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-theme-sm text-gray-600 dark:text-gray-300">{label}</span>
        <span className="text-theme-sm font-mono text-gray-500 dark:text-gray-400">
          +{points}
          <span className="text-gray-400 dark:text-gray-600">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function DetailPanel({ ticket, onClose }: { ticket: Doc<'tickets'>; onClose: () => void }) {
  const updateStatus = useConvexMutation(api.tickets.updateStatus)
  const [pending, setPending] = useState(false)
  const next = nextStatus(ticket.status)
  const total = trustTotal(ticket.trustScore)

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
        className="fixed inset-0 z-40 bg-gray-900/50"
      />
      <aside className="admin fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <p className="text-theme-xs font-mono text-gray-400 dark:text-gray-500">
              {formatTicketId(ticket.ticketNumber)}
            </p>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {CATEGORY_LABEL[ticket.category]}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close panel"
            className="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          >
            ✕
          </Button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center gap-2">
            <Badge tone={SEVERITY_BADGE[ticket.severity]} icon={<AlertIcon />}>
          {SEVERITY_LABEL[ticket.severity]}
        </Badge>
            <Badge tone={STATUS_BADGE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
          </div>

          <p className="text-theme-xs text-gray-400 dark:text-gray-500">
            Reported {formatDate(ticket._creationTime)}
          </p>

          <img
            src={getPublicUrl(ticket.photoGcsObjectName)}
            alt={`Reported ${CATEGORY_LABEL[ticket.category].toLowerCase()}`}
            className="aspect-4/3 w-full rounded-xl border border-gray-200 object-cover dark:border-gray-800"
          />

          <p className="text-theme-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {ticket.description}
          </p>

          {ticket.urgencyNote && (
            <div>
              <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                Citizen note
              </p>
              <p className="text-theme-sm text-gray-600 dark:text-gray-400">{ticket.urgencyNote}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                Department
              </p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300">{ticket.department}</p>
            </div>
            <div>
              <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                Location
              </p>
              <p className="text-theme-xs font-mono">
                <a
                  href={`https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline decoration-dotted underline-offset-2 hover:decoration-solid dark:text-brand-400"
                >
                  {ticket.latitude.toFixed(5)}, {ticket.longitude.toFixed(5)}
                </a>
                {ticket.accuracyMeters !== undefined && (
                  <span className="text-gray-400 dark:text-gray-500"> ±{Math.round(ticket.accuracyMeters)}m</span>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                Trust score
              </p>
              <p className="text-theme-sm font-mono font-semibold text-gray-800 dark:text-white/90">
                {total}/100
              </p>
            </div>
            <TrustRow label="Clear image" points={ticket.trustScore.clearImagePoints} max={30} />
            <TrustRow label="Exact location" points={ticket.trustScore.exactLocationPoints} max={30} />
            <TrustRow label="Nearby reports" points={ticket.trustScore.nearbyReportsPoints} max={25} />
            <TrustRow label="Recent report" points={ticket.trustScore.recentReportPoints} max={15} />
          </div>
        </div>

        <div className="mt-auto border-t border-gray-200 p-6 dark:border-gray-800">
          {next ? (
            <Button
              className="text-theme-sm w-full bg-brand-500 text-white hover:bg-brand-600"
              disabled={pending}
              onClick={advance}
            >
              {pending ? 'Updating…' : `Mark as ${STATUS_LABEL[next]}`}
            </Button>
          ) : (
            <p className="text-theme-sm text-center text-gray-500 dark:text-gray-400">
              Resolved — nothing further to do.
            </p>
          )}
        </div>
      </aside>
    </>
  )
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99998 1.5415C10.4142 1.5415 10.75 1.87729 10.75 2.2915V3.5415C10.75 3.95572 10.4142 4.2915 9.99998 4.2915C9.58577 4.2915 9.24998 3.95572 9.24998 3.5415V2.2915C9.24998 1.87729 9.58577 1.5415 9.99998 1.5415ZM10.0009 6.79327C8.22978 6.79327 6.79402 8.22904 6.79402 10.0001C6.79402 11.7712 8.22978 13.207 10.0009 13.207C11.772 13.207 13.2078 11.7712 13.2078 10.0001C13.2078 8.22904 11.772 6.79327 10.0009 6.79327ZM5.29402 10.0001C5.29402 7.40061 7.40135 5.29327 10.0009 5.29327C12.6004 5.29327 14.7078 7.40061 14.7078 10.0001C14.7078 12.5997 12.6004 14.707 10.0009 14.707C7.40135 14.707 5.29402 12.5997 5.29402 10.0001ZM15.9813 5.08035C16.2742 4.78746 16.2742 4.31258 15.9813 4.01969C15.6884 3.7268 15.2135 3.7268 14.9207 4.01969L14.0368 4.90357C13.7439 5.19647 13.7439 5.67134 14.0368 5.96423C14.3297 6.25713 14.8045 6.25713 15.0974 5.96423L15.9813 5.08035ZM18.4577 10.0001C18.4577 10.4143 18.1219 10.7501 17.7077 10.7501H16.4577C16.0435 10.7501 15.7077 10.4143 15.7077 10.0001C15.7077 9.58592 16.0435 9.25013 16.4577 9.25013H17.7077C18.1219 9.25013 18.4577 9.58592 18.4577 10.0001ZM14.9207 15.9806C15.2135 16.2735 15.6884 16.2735 15.9813 15.9806C16.2742 15.6877 16.2742 15.2128 15.9813 14.9199L15.0974 14.036C14.8045 13.7431 14.3297 13.7431 14.0368 14.036C13.7439 14.3289 13.7439 14.8038 14.0368 15.0967L14.9207 15.9806ZM9.99998 15.7088C10.4142 15.7088 10.75 16.0445 10.75 16.4588V17.7088C10.75 18.123 10.4142 18.4588 9.99998 18.4588C9.58577 18.4588 9.24998 18.123 9.24998 17.7088V16.4588C9.24998 16.0445 9.58577 15.7088 9.99998 15.7088ZM5.96356 15.0972C6.25646 14.8043 6.25646 14.3295 5.96356 14.0366C5.67067 13.7437 5.1958 13.7437 4.9029 14.0366L4.01902 14.9204C3.72613 15.2133 3.72613 15.6882 4.01902 15.9811C4.31191 16.274 4.78679 16.274 5.07968 15.9811L5.96356 15.0972ZM4.29224 10.0001C4.29224 10.4143 3.95645 10.7501 3.54224 10.7501H2.29224C1.87802 10.7501 1.54224 10.4143 1.54224 10.0001C1.54224 9.58592 1.87802 9.25013 2.29224 9.25013H3.54224C3.95645 9.25013 4.29224 9.58592 4.29224 10.0001ZM4.9029 5.9637C5.1958 6.25659 5.67067 6.25659 5.96356 5.9637C6.25646 5.6708 6.25646 5.19593 5.96356 4.90303L5.07968 4.01915C4.78679 3.72626 4.31191 3.72626 4.01902 4.01915C3.72613 4.31204 3.72613 4.78692 4.01902 5.07981L4.9029 5.9637Z"
        fill="currentColor"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.4547 11.97C17.1885 11.1934 16.944 11.4207 16.944 11.4207C15.8869 12.4035 14.4721 13.0035 12.9154 13.0035C9.64678 13.0035 6.99707 10.3538 6.99707 7.08524C6.99707 5.52854 7.5971 4.11366 8.57989 3.05657C8.79489 2.82658 8.5613 2.44684 8.24 2.5C4.21532 2.77574 1.54199 6.07486 1.54199 10.0003C1.54199 14.6717 5.32892 18.4586 10.0003 18.4586C13.9257 18.4586 17.2249 15.7853 18.1799 12.1611C18.265 11.8383 17.7267 12.2178 17.4547 11.97Z"
        fill="currentColor"
      />
    </svg>
  )
}
