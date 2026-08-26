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

/** Short-lived URL the citizen app POSTs the raw photo bytes to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Resolves a stored photo to a fetchable HTTPS URL + its content type, for
 * the Genkit flow (outside Convex) to hand to Gemini. Gemini only infers
 * media content type from `data:` URIs, not plain `https:` URLs, so the
 * content type has to be passed through explicitly.
 */
export const getPhotoUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId)
    if (!url) return null
    const metadata = await ctx.db.system.get('_storage', args.storageId)
    return { url, contentType: metadata?.contentType ?? null }
  },
})

/**
 * Same-category tickets within the duplicate radius (150m), mirroring the
 * reference implementation in android_app/lib/services/mock_report_api.dart
 * (`_nearbyMatches` / `_haversineMeters`).
 */
export const findNearby = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const DUPLICATE_RADIUS_METERS = 150

    const sameCategory = await ctx.db
      .query('tickets')
      .withIndex('by_category', (q) => q.eq('category', args.category))
      .collect()

    return sameCategory.filter(
      (ticket) =>
        haversineMeters(
          args.latitude,
          args.longitude,
          ticket.latitude,
          ticket.longitude,
        ) <= DUPLICATE_RADIUS_METERS,
    )
  },
})

export const create = mutation({
  args: {
    photoStorageId: v.id('_storage'),
    category: categoryValidator,
    severity: severityValidator,
    description: v.string(),
    urgencyNote: v.string(),
    department: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    accuracyMeters: v.optional(v.number()),
    trustScore: trustScoreValidator,
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('tickets', {
      ...args,
      status: 'received',
    })
    return await ctx.db.get(id)
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('tickets')
      .withIndex('by_creation_time')
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { id: v.id('tickets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/** Great-circle distance between two points, in meters. */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_METERS * c
}
