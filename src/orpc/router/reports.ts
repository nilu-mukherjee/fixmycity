import { os } from '@orpc/server'
import { ConvexHttpClient } from 'convex/browser'
import * as z from 'zod'

import { api } from '../../../convex/_generated/api'
import { runReportPipeline } from '../../genkit/report-flow'

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

/** Step 1: citizen app gets a short-lived URL to upload the captured photo to. */
export const getUploadUrl = os.input(z.object({})).handler(async () => {
  const uploadUrl = await convexClient().mutation(
    api.tickets.generateUploadUrl,
    {},
  )
  return { uploadUrl }
})

/**
 * Step 2: runs the Genkit flow (Gemini Vision classification, duplicate
 * check, trust score, department routing) and returns an editable presubmit
 * result. Nothing is persisted yet.
 */
export const analyzeReport = os
  .input(
    z.object({
      photoStorageId: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      accuracyMeters: z.number().optional(),
      urgencyNote: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    return await runReportPipeline({
      photoStorageId: input.photoStorageId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      urgencyNote: input.urgencyNote,
    })
  })

/** Step 3: citizen approves the (possibly edited) presubmit result, ticket is created. */
export const createTicket = os
  .input(
    z.object({
      photoStorageId: z.string(),
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
    return await convexClient().mutation(api.tickets.create, {
      ...input,
      photoStorageId: input.photoStorageId as Id<'_storage'>,
    })
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
