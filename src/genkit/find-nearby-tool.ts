import { z } from 'genkit'
import { createPartFromFunctionResponse } from '@google/genai'

import { findNearbyTickets } from '#/lib/tickets'

import type { FunctionCall, Part, Tool } from '@google/genai'

const CATEGORIES = [
  'pothole',
  'garbage',
  'streetlight',
  'drainage',
  'water_leakage',
  'road_blockage',
  'unsafe_footpath',
] as const

export const FindNearbyInputSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  category: z.enum(CATEGORIES),
})

const FIND_NEARBY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    latitude: { type: 'number' },
    longitude: { type: 'number' },
    category: { type: 'string', enum: [...CATEGORIES] },
  },
  required: ['latitude', 'longitude', 'category'],
}

/**
 * Static function declaration for `findNearbyReports` — shared between
 * `dataset-cache.ts` (baked into the `CachedContent` at creation time) and
 * `report-flow.ts` (for executing the call locally when the model invokes
 * it). Gemini rejects any `generateContent` request that sets both
 * `cachedContent` and `tools`/`toolConfig` ("CachedContent can not be used
 * with GenerateContent request setting system_instruction, tools or
 * tool_config") — tools have to live in the cache itself, so there's no
 * per-request `CallableTool`/automatic-function-calling here; `report-flow`
 * drives the call/response loop by hand instead.
 */
export const FIND_NEARBY_REPORTS_TOOL: Tool = {
  functionDeclarations: [
    {
      name: 'findNearbyReports',
      description:
        'Looks up existing citizen reports of the same issue category within 150m of a location. Call this once you have identified the likely category, to check whether this looks like a recurring or duplicate problem — multiple independent reports of the same hazard are evidence it is real and more urgent, not less, so factor the result into your severity judgment.',
      parametersJsonSchema: FIND_NEARBY_JSON_SCHEMA,
    },
  ],
}

/** Executes a single `findNearbyReports` function call and wraps the result as a response `Part`. */
export async function executeFindNearbyReports(
  call: FunctionCall,
): Promise<Part> {
  const input = FindNearbyInputSchema.parse(call.args)
  const matches = await findNearbyTickets(input)
  console.log(
    `[agent] findNearbyReports(${input.category} @ ${input.latitude},${input.longitude}) -> ${matches.length} match(es)`,
  )
  const output = {
    count: matches.length,
    mostRecentHoursAgo: matches.length
      ? Math.min(
          ...matches.map(
            (m) => (Date.now() - m.createdAt.getTime()) / 3_600_000,
          ),
        )
      : null,
  }
  return createPartFromFunctionResponse(
    call.id ?? call.name ?? 'findNearbyReports',
    call.name ?? 'findNearbyReports',
    output,
  )
}
