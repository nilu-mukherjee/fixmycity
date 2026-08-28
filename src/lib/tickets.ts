import { prisma } from '#/db'

import { haversineMeters } from './geo'

import type {
  IssueCategory,
  Severity,
  Ticket,
  TicketStatus,
} from '#/generated/prisma/client.js'

const DUPLICATE_RADIUS_METERS = 150

export interface TrustScoreInput {
  clearImagePoints: number
  exactLocationPoints: number
  nearbyReportsPoints: number
  recentReportPoints: number
}

/**
 * Same-category tickets within the duplicate radius, mirroring the reference
 * implementation in android_app/lib/services/mock_report_api.dart
 * (`_nearbyMatches` / `_haversineMeters`).
 */
export async function findNearbyTickets(params: {
  latitude: number
  longitude: number
  category: IssueCategory
}): Promise<Ticket[]> {
  const sameCategory = await prisma.ticket.findMany({
    where: { category: params.category },
  })

  return sameCategory.filter(
    (ticket) =>
      haversineMeters(
        params.latitude,
        params.longitude,
        ticket.latitude,
        ticket.longitude,
      ) <= DUPLICATE_RADIUS_METERS,
  )
}

export async function createTicket(input: {
  citizenId: string | null
  photoGcsObjectName: string
  category: IssueCategory
  severity: Severity
  description: string
  urgencyNote: string
  department: string
  latitude: number
  longitude: number
  accuracyMeters?: number
  trustScore: TrustScoreInput
  /**
   * Gemini's original suggestion, before any citizen edits on the
   * presubmit screen — null when the source draft couldn't be found.
   * Stored alongside the (possibly-edited) fields above as the
   * self-improvement feedback signal: compare `category` to
   * `aiCategory`, etc. to see where the AI's classification and the
   * citizen's correction diverged.
   */
  ai: {
    category: IssueCategory
    severity: Severity
    description: string
  } | null
}): Promise<Ticket> {
  const { trustScore, ai, ...rest } = input
  return await prisma.ticket.create({
    data: {
      ...rest,
      ...trustScore,
      aiCategory: ai?.category,
      aiSeverity: ai?.severity,
      aiDescription: ai?.description,
      status: 'received',
    },
  })
}

/** Advances (or otherwise changes) a ticket's status — the admin console's core action. */
export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<Ticket> {
  return await prisma.ticket.update({ where: { id }, data: { status } })
}

/** All tickets, most recent first — used by the (unauthenticated) admin dashboard. */
export async function listAllTickets(): Promise<Ticket[]> {
  return await prisma.ticket.findMany({ orderBy: { createdAt: 'desc' } })
}

/** Tickets submitted by a single citizen, most recent first. */
export async function listTicketsForCitizen(
  citizenId: string,
): Promise<Ticket[]> {
  return await prisma.ticket.findMany({
    where: { citizenId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getTicket(id: string): Promise<Ticket | null> {
  return await prisma.ticket.findUnique({ where: { id } })
}

export interface CorrectionExample {
  description: string
  aiCategory: IssueCategory
  category: IssueCategory
  aiSeverity: Severity
  severity: Severity
}

const CORRECTION_LOOKBACK = 30

/**
 * Most recent tickets where the citizen corrected Gemini's original
 * category or severity guess. This is the self-improvement feedback loop:
 * `runReportPipeline` feeds these back into the classification prompt as
 * few-shot examples so the agent calibrates against its own past mistakes
 * on every new report — in-context learning, not a retraining/fine-tuning
 * pipeline (there isn't one).
 *
 * Filtered in application code rather than SQL (same approach as
 * `findNearbyTickets`'s haversine filter) since Prisma can't compare two
 * columns of the same row directly.
 */
export async function getRecentCorrections(
  limit = 5,
): Promise<CorrectionExample[]> {
  const recent = await prisma.ticket.findMany({
    where: { aiCategory: { not: null }, aiSeverity: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: CORRECTION_LOOKBACK,
  })

  return recent
    .filter((t) => t.aiCategory !== t.category || t.aiSeverity !== t.severity)
    .slice(0, limit)
    .map((t) => ({
      description: t.description,
      aiCategory: t.aiCategory!,
      category: t.category,
      aiSeverity: t.aiSeverity!,
      severity: t.severity,
    }))
}
