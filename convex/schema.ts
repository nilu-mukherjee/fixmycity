import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  tickets: defineTable({
    photoGcsObjectName: v.string(),
    category: v.union(
      v.literal('pothole'),
      v.literal('garbage'),
      v.literal('streetlight'),
      v.literal('drainage'),
      v.literal('water_leakage'),
      v.literal('road_blockage'),
      v.literal('unsafe_footpath'),
    ),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('emergency'),
    ),
    description: v.string(),
    urgencyNote: v.string(),
    department: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    accuracyMeters: v.optional(v.number()),
    trustScore: v.object({
      clearImagePoints: v.number(),
      exactLocationPoints: v.number(),
      nearbyReportsPoints: v.number(),
      recentReportPoints: v.number(),
    }),
    status: v.union(
      v.literal('received'),
      v.literal('verified'),
      v.literal('assigned'),
      v.literal('in_progress'),
      v.literal('resolved'),
    ),
  }).index('by_category', ['category']),
  // A photo has been uploaded to GCS and is awaiting (or has finished) the
  // Genkit analysis triggered by Eventarc — separate from `tickets` because
  // most of its fields don't exist until analysis completes, whereas every
  // `tickets` row is always fully formed.
  presubmitDrafts: defineTable({
    latitude: v.number(),
    longitude: v.number(),
    accuracyMeters: v.optional(v.number()),
    urgencyNote: v.string(),
    status: v.union(
      v.literal('processing'),
      v.literal('ready'),
      // Gemini determined the photo doesn't depict a real civic issue at
      // all (a screen, a pet, a person, etc.) — distinct from 'error' since
      // this isn't a failure, it's the pipeline correctly refusing to
      // fabricate a category for it.
      v.literal('not_a_civic_issue'),
      v.literal('error'),
    ),
    category: v.optional(
      v.union(
        v.literal('pothole'),
        v.literal('garbage'),
        v.literal('streetlight'),
        v.literal('drainage'),
        v.literal('water_leakage'),
        v.literal('road_blockage'),
        v.literal('unsafe_footpath'),
      ),
    ),
    severity: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('emergency'),
      ),
    ),
    description: v.optional(v.string()),
    department: v.optional(v.string()),
    trustScore: v.optional(
      v.object({
        clearImagePoints: v.number(),
        exactLocationPoints: v.number(),
        nearbyReportsPoints: v.number(),
        recentReportPoints: v.number(),
      }),
    ),
    nearbyDuplicateCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }),
})
