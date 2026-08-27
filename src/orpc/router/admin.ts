import { os } from '@orpc/server'
import * as z from 'zod'

import {
  listAllTickets as listAllTicketsRecords,
  updateTicketStatus as updateTicketStatusRecord,
} from '#/lib/tickets'

import type { Ticket } from '#/generated/prisma/client.js'
import type { TrustScoreInput } from '#/lib/tickets'

/** A `Ticket` row with its flat trust-score columns reshaped as a nested object. */
export type AdminTicket = Ticket & { trustScore: TrustScoreInput }

const STATUSES = [
  'received',
  'verified',
  'assigned',
  'in_progress',
  'resolved',
] as const

/**
 * All tickets, most recent first, with a nested `trustScore` reshape (same
 * wire convenience as the citizen-facing router, cheap to keep consistent
 * even though the admin dashboard is the only consumer). Unauthenticated by
 * design — the admin dashboard has no login gate.
 */
export const listAllTickets = os.input(z.object({})).handler(async () => {
  const tickets = await listAllTicketsRecords()
  return tickets.map((ticket) => ({
    ...ticket,
    trustScore: {
      clearImagePoints: ticket.clearImagePoints,
      exactLocationPoints: ticket.exactLocationPoints,
      nearbyReportsPoints: ticket.nearbyReportsPoints,
      recentReportPoints: ticket.recentReportPoints,
    },
  }))
})

export const updateTicketStatus = os
  .input(z.object({ id: z.string(), status: z.enum(STATUSES) }))
  .handler(async ({ input }) => {
    return await updateTicketStatusRecord(input.id, input.status)
  })
