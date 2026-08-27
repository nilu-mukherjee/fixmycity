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
}): Promise<Ticket> {
  const { trustScore, ...rest } = input
  return await prisma.ticket.create({
    data: {
      ...rest,
      ...trustScore,
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
