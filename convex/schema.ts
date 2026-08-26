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
    photoStorageId: v.id('_storage'),
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
})
