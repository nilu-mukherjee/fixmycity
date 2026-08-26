import { os } from '@orpc/server'
import { ConvexHttpClient } from 'convex/browser'
import * as z from 'zod'

import { api } from '../../../convex/_generated/api'
import { createUploadUrl } from '../../gcs/storage'

import type { Id } from '../../../convex/_generated/dataModel'

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

function convexClient() {
  const url = process.env.VITE_CONVEX_URL
  if (!url) {
    throw new Error('VITE_CONVEX_URL is not set')
  }
  // A fresh client per request — ConvexHttpClient is stateful and not safe
  // to share across concurrent server requests.
  return new ConvexHttpClient(url)
}

/**
 * Step 1: citizen app creates a draft and gets a short-lived signed URL to
 * PUT the captured photo to. Analysis is NOT triggered here — it fires
 * asynchronously once Eventarc observes the upload land in GCS.
 */
export const createDraft = os
  .input(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracyMeters: z.number().optional(),
      urgencyNote: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    const convex = convexClient()
    const draft = await convex.mutation(api.drafts.create, input)
    if (!draft) {
      throw new Error('Failed to create draft')
    }

    const objectName = `reports/${draft._id}.jpg`
    const uploadUrl = await createUploadUrl(objectName, 'image/jpeg')

    return { draftId: draft._id, uploadUrl }
  })

/**
 * Step 2: citizen app polls this until the draft's Genkit analysis
 * (triggered by the GCS upload via Eventarc) finishes.
 */
export const getDraft = os
  .input(z.object({ draftId: z.string() }))
  .handler(async ({ input }) => {
    return await convexClient().query(api.drafts.get, {
      id: input.draftId as Id<'presubmitDrafts'>,
    })
  })

/** Step 3: citizen approves the (possibly edited) presubmit result, ticket is created. */
export const createTicket = os
  .input(
    z.object({
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
  .handler(async ({ input }) => {
    return await convexClient().mutation(api.tickets.create, input)
  })

/** All tickets, most recent first. No citizen scoping yet (auth not wired up). */
export const listTickets = os.input(z.object({})).handler(async () => {
  return await convexClient().query(api.tickets.list, {})
})

export const getTicket = os
  .input(z.object({ id: z.string() }))
  .handler(async ({ input }) => {
    return await convexClient().query(api.tickets.get, {
      id: input.id as Id<'tickets'>,
    })
  })
