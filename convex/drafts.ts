import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const categoryValidator = v.union(
  v.literal('pothole'),
  v.literal('garbage'),
  v.literal('streetlight'),
  v.literal('drainage'),
  v.literal('water_leakage'),
  v.literal('road_blockage'),
  v.literal('unsafe_footpath'),
)

const severityValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('emergency'),
)

const trustScoreValidator = v.object({
  clearImagePoints: v.number(),
  exactLocationPoints: v.number(),
  nearbyReportsPoints: v.number(),
  recentReportPoints: v.number(),
})

/**
 * Created the moment the citizen app requests an upload URL, before the
 * photo bytes even exist in GCS — the draft's `_id` is embedded in the GCS
 * object path (`reports/{draftId}.jpg`) so the Eventarc-triggered handler
 * can find it from the object name alone.
 */
export const create = mutation({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    accuracyMeters: v.optional(v.number()),
    urgencyNote: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('presubmitDrafts', {
      ...args,
      status: 'processing',
    })
    return await ctx.db.get(id)
  },
})

export const get = query({
  args: { id: v.id('presubmitDrafts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/** Called by the photo-uploaded event handler once Gemini analysis succeeds. */
export const markReady = mutation({
  args: {
    id: v.id('presubmitDrafts'),
    category: categoryValidator,
    severity: severityValidator,
    description: v.string(),
    department: v.string(),
    trustScore: trustScoreValidator,
    nearbyDuplicateCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...result } = args
    await ctx.db.patch(id, { ...result, status: 'ready' })
    return await ctx.db.get(id)
  },
})

/**
 * Called by the photo-uploaded event handler when Gemini determines the
 * photo doesn't depict a real civic issue — submission is blocked rather
 * than creating a ticket with a fabricated category.
 */
export const markNotCivicIssue = mutation({
  args: {
    id: v.id('presubmitDrafts'),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'not_a_civic_issue',
      description: args.description,
    })
    return await ctx.db.get(args.id)
  },
})

/** Called by the photo-uploaded event handler if analysis fails. */
export const markError = mutation({
  args: {
    id: v.id('presubmitDrafts'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: 'error',
      errorMessage: args.errorMessage,
    })
    return await ctx.db.get(args.id)
  },
})
