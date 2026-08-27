import { os as baseOs, ORPCError } from '@orpc/server'
import * as z from 'zod'

import { createUploadUrl } from '../../gcs/storage'
import {
  createDraft as createDraftRecord,
  getDraft as getDraftRecord,
} from '#/lib/drafts'
import {
  createTicket as createTicketRecord,
  getTicket as getTicketRecord,
  listTicketsForCitizen,
} from '#/lib/tickets'

import type { PresubmitDraft, Ticket } from '#/generated/prisma/client.js'

const os = baseOs.$context<{ userId: string | null }>()

/** Rejects unauthenticated requests to citizen-authored/citizen-scoped procedures. */
const requireCitizen = os.middleware(async ({ context, next }) => {
  if (!context.userId) {
    throw new ORPCError('UNAUTHORIZED')
  }
  return next({ context: { userId: context.userId } })
})

const CATEGORIES = [
  'pothole',
  'garbage',
  'streetlight',
  'drainage',
  'water_leakage',
  'road_blockage',
  'unsafe_footpath',
] as const

const SEVERITIES = ['low', 'medium', 'high', 'emergency'] as const

const TrustScoreSchema = z.object({
  clearImagePoints: z.number(),
  exactLocationPoints: z.number(),
  nearbyReportsPoints: z.number(),
  recentReportPoints: z.number(),
})

/**
 * Reshapes a flat-columns Ticket row into the wire shape the Flutter app's
 * `Ticket.fromJson` expects (`_id`, `_creationTime` as epoch-ms, nested
 * `trustScore`) — a compatibility shim, not the DB's own storage layout.
 */
function toWireTicket(ticket: Ticket) {
  return {
    _id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    citizenId: ticket.citizenId,
    photoGcsObjectName: ticket.photoGcsObjectName,
    category: ticket.category,
    severity: ticket.severity,
    description: ticket.description,
    urgencyNote: ticket.urgencyNote,
    department: ticket.department,
    latitude: ticket.latitude,
    longitude: ticket.longitude,
    accuracyMeters: ticket.accuracyMeters ?? undefined,
    trustScore: {
      clearImagePoints: ticket.clearImagePoints,
      exactLocationPoints: ticket.exactLocationPoints,
      nearbyReportsPoints: ticket.nearbyReportsPoints,
      recentReportPoints: ticket.recentReportPoints,
    },
    status: ticket.status,
    _creationTime: ticket.createdAt.getTime(),
  }
}

/** Same shim, for a draft's optional post-analysis fields. */
function toWireDraft(draft: PresubmitDraft) {
  const hasTrustScore = draft.clearImagePoints !== null
  return {
    _id: draft.id,
    latitude: draft.latitude,
    longitude: draft.longitude,
    accuracyMeters: draft.accuracyMeters ?? undefined,
    urgencyNote: draft.urgencyNote,
    status: draft.status,
    category: draft.category ?? undefined,
    severity: draft.severity ?? undefined,
    description: draft.description ?? undefined,
    department: draft.department ?? undefined,
    trustScore: hasTrustScore
      ? {
          clearImagePoints: draft.clearImagePoints!,
          exactLocationPoints: draft.exactLocationPoints!,
          nearbyReportsPoints: draft.nearbyReportsPoints!,
          recentReportPoints: draft.recentReportPoints!,
        }
      : undefined,
    nearbyDuplicateCount: draft.nearbyDuplicateCount ?? undefined,
    errorMessage: draft.errorMessage ?? undefined,
  }
}

/**
 * Step 1: citizen app creates a draft and gets a short-lived signed URL to
 * PUT the captured photo to. Analysis is NOT triggered here — it fires
 * asynchronously once Eventarc observes the upload land in GCS.
 */
export const createDraft = os
  .use(requireCitizen)
  .input(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracyMeters: z.number().optional(),
      urgencyNote: z.string(),
    }),
  )
  .handler(async ({ input, context }) => {
    const draft = await createDraftRecord({
      ...input,
      citizenId: context.userId,
    })

    const objectName = `reports/${draft.id}.jpg`
    const uploadUrl = await createUploadUrl(objectName, 'image/jpeg')

    return { draftId: draft.id, uploadUrl }
  })

/**
 * Step 2: citizen app polls this until the draft's Genkit analysis
 * (triggered by the GCS upload via Eventarc) finishes.
 */
export const getDraft = os
  .input(z.object({ draftId: z.string() }))
  .handler(async ({ input }) => {
    const draft = await getDraftRecord(input.draftId)
    return draft ? toWireDraft(draft) : null
  })

/** Step 3: citizen approves the (possibly edited) presubmit result, ticket is created. */
export const createTicket = os
  .use(requireCitizen)
  .input(
    z.object({
      draftId: z.string(),
      photoGcsObjectName: z.string(),
      category: z.enum(CATEGORIES),
      severity: z.enum(SEVERITIES),
      description: z.string(),
      urgencyNote: z.string(),
      department: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      accuracyMeters: z.number().optional(),
      trustScore: TrustScoreSchema,
    }),
  )
  .handler(async ({ input, context }) => {
    const { draftId, ...rest } = input
    // The draft's own category/severity/description are Gemini's original
    // suggestion — `rest` carries whatever the citizen approved, which may
    // have been edited on the presubmit screen. Diffing the two after the
    // fact is the feedback signal described in the "self-improving" plan.
    const draft = await getDraftRecord(draftId)
    const ai =
      draft?.category && draft.severity && draft.description
        ? {
            category: draft.category,
            severity: draft.severity,
            description: draft.description,
          }
        : null

    return toWireTicket(
      await createTicketRecord({ ...rest, ai, citizenId: context.userId }),
    )
  })

/** Tickets submitted by the authenticated citizen, most recent first. */
export const listTickets = os
  .use(requireCitizen)
  .input(z.object({}))
  .handler(async ({ context }) => {
    const tickets = await listTicketsForCitizen(context.userId)
    return tickets.map(toWireTicket)
  })

export const getTicket = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    const ticket = await getTicketRecord(input.id)
    return ticket ? toWireTicket(ticket) : null
  })
