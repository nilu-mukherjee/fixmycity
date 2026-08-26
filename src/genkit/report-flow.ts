import { genkit, z } from 'genkit'
import { googleAI } from '@genkit-ai/google-genai'
import { ConvexHttpClient } from 'convex/browser'

import { api } from '../../convex/_generated/api'

import type { Doc } from '../../convex/_generated/dataModel'

const ai = genkit({ plugins: [googleAI()] })

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

export type IssueCategory = (typeof CATEGORIES)[number]
export type Severity = (typeof SEVERITIES)[number]

/** Mocked department routing (project.md: no real municipal integration). */
const DEPARTMENT_BY_CATEGORY: Record<IssueCategory, string> = {
  pothole: 'Road Department',
  road_blockage: 'Road Department',
  unsafe_footpath: 'Road Department',
  garbage: 'Waste Management',
  streetlight: 'Electricity / Streetlight Team',
  drainage: 'Water Board',
  water_leakage: 'Water Board',
}

const GeminiAnalysisSchema = z.object({
  isCivicIssue: z
    .boolean()
    .describe(
      'True if the photo depicts a genuine public infrastructure / civic problem matching one of the categories. False if it shows something unrelated to civic infrastructure — a person, a pet, a screen, an indoor object, food, etc. Check this first: everything else in this schema still needs a value even when this is false, but the caller will discard them and refuse the submission.',
    ),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  description: z
    .string()
    .describe(
      'A one to two sentence, citizen-facing description of what the photo actually shows. If isCivicIssue is false, explain what the photo shows instead and why it is not a civic issue.',
    ),
  imageIsClear: z
    .boolean()
    .describe(
      'True if the photo clearly and unambiguously shows the reported issue, false if it is blurry, too dark, too far away, or otherwise hard to verify.',
    ),
})

/**
 * Lets the model itself decide when to check for nearby duplicate reports as
 * part of its own severity reasoning — a real tool-use decision, not a step
 * we hard-wire in TypeScript. (The trust-score's own nearby-count is still
 * computed deterministically afterward in `runReportPipeline`, independent
 * of anything the model reports — the rubric shouldn't depend on the LLM's
 * arithmetic.)
 */
const findNearbyReportsTool = ai.defineTool(
  {
    name: 'findNearbyReports',
    description:
      'Looks up existing citizen reports of the same issue category within 150m of a location. Call this once you have identified the likely category, to check whether this looks like a recurring or duplicate problem — multiple independent reports of the same hazard are evidence it is real and more urgent, not less, so factor the result into your severity judgment.',
    inputSchema: z.object({
      latitude: z.number(),
      longitude: z.number(),
      category: z.enum(CATEGORIES),
    }),
    outputSchema: z.object({
      count: z.number().describe('How many other reports of this category exist nearby.'),
      mostRecentHoursAgo: z
        .number()
        .nullable()
        .describe('Hours since the most recent nearby report, or null if there are none.'),
    }),
  },
  async (input) => {
    const convexUrl = process.env.VITE_CONVEX_URL
    if (!convexUrl) {
      throw new Error('VITE_CONVEX_URL is not set')
    }
    const convex = new ConvexHttpClient(convexUrl)
    const matches = await convex.query(api.tickets.findNearby, input)
    console.log(
      `[agent] findNearbyReports(${input.category} @ ${input.latitude},${input.longitude}) -> ${matches.length} match(es)`,
    )
    return {
      count: matches.length,
      mostRecentHoursAgo: matches.length
        ? Math.min(...matches.map((m) => (Date.now() - m._creationTime) / 3_600_000))
        : null,
    }
  },
)

const analyzeReportFlow = ai.defineFlow(
  {
    name: 'analyzeReport',
    inputSchema: z.object({
      // A `data:` URI (base64-inline), not a remote `https:` link — Gemini's
      // remote-URL media fetching is separately quota-gated and threw
      // RESOURCE_EXHAUSTED even with a funded account; inline data works.
      photoDataUri: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      urgencyNote: z.string(),
    }),
    outputSchema: GeminiAnalysisSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemini-3.6-flash'),
      tools: [findNearbyReportsTool],
      output: { schema: GeminiAnalysisSchema },
      prompt: [
        { media: { url: input.photoDataUri } },
        {
          text: [
            'You are the AI intake system for a civic issue-reporting app.',
            'A citizen submitted this photo, claiming it shows a public infrastructure problem, along with this note:',
            `"${input.urgencyNote}"`,
            `The report's location is latitude ${input.latitude}, longitude ${input.longitude}.`,
            '',
            'First, check whether the photo actually shows a real civic/public-infrastructure problem at all — as opposed to something unrelated (a person, a pet, a screen, an indoor object, food, a meme, etc.). Set isCivicIssue accordingly. Submissions where isCivicIssue is false get blocked before reaching a human, so be honest rather than charitable here.',
            '',
            'If it is a civic issue, classify it into exactly one category:',
            CATEGORIES.join(', '),
            '',
            'Once you have identified the likely category, call findNearbyReports with that category and this location to check whether other citizens have already reported the same issue nearby. Skip this call if isCivicIssue is false.',
            '',
            'Estimate its severity as one of: low, medium, high, emergency',
            '(emergency = immediate danger to life/safety, e.g. exposed live wires, deep open drain on a walkway, major road collapse).',
            'Multiple recent nearby reports of the same hazard should push your severity estimate up, not down — treat them as corroboration, not noise.',
            '',
            'Write a short, factual, citizen-facing description of what the photo shows.',
            'Judge whether the photo is clear enough to verify the issue (well-lit, in focus, issue clearly visible).',
          ].join('\n'),
        },
      ],
    })

    if (!output) {
      throw new Error('Gemini returned no structured output for report analysis')
    }
    return output
  },
)

export interface TrustScoreBreakdown {
  clearImagePoints: number
  exactLocationPoints: number
  nearbyReportsPoints: number
  recentReportPoints: number
}

const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Trust score formula — must stay in sync with the reference implementation
 * in android_app/lib/services/mock_report_api.dart (`_scoreReport`).
 */
function computeTrustScore(params: {
  imageIsClear: boolean
  accuracyMeters: number | undefined
  nearbyMatches: Array<Doc<'tickets'>>
}): TrustScoreBreakdown {
  const clearImagePoints = params.imageIsClear ? 30 : 0

  const exactLocationPoints =
    params.accuracyMeters === undefined
      ? 0
      : params.accuracyMeters <= 20
        ? 30
        : params.accuracyMeters <= 50
          ? 15
          : 0

  const nearbyReportsPoints =
    params.nearbyMatches.length === 0
      ? 0
      : params.nearbyMatches.length === 1
        ? 10
        : params.nearbyMatches.length === 2
          ? 18
          : 25

  const now = Date.now()
  const hasRecentMatch = params.nearbyMatches.some(
    (t) => now - t._creationTime <= RECENT_WINDOW_MS,
  )
  const recentReportPoints = hasRecentMatch ? 15 : 0

  return {
    clearImagePoints,
    exactLocationPoints,
    nearbyReportsPoints,
    recentReportPoints,
  }
}

export type PresubmitResult =
  | {
      isCivicIssue: true
      category: IssueCategory
      severity: Severity
      description: string
      department: string
      trustScore: TrustScoreBreakdown
      nearbyDuplicateCount: number
    }
  | {
      isCivicIssue: false
      description: string
    }

/**
 * Orchestrates the full "presubmit" pipeline: Gemini Vision classification,
 * duplicate check against Convex, trust score, department routing. Does not
 * persist anything — that happens once the citizen approves (see
 * `src/orpc/router/reports.ts`'s `createTicket`).
 */
export async function runReportPipeline(params: {
  photoUrl: string
  latitude: number
  longitude: number
  accuracyMeters: number | undefined
  urgencyNote: string
}): Promise<PresubmitResult> {
  const convexUrl = process.env.VITE_CONVEX_URL
  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is not set')
  }
  // A fresh client per call — ConvexHttpClient is stateful and not safe to
  // share across concurrent server requests.
  const convex = new ConvexHttpClient(convexUrl)

  const photoResponse = await fetch(params.photoUrl)
  if (!photoResponse.ok) {
    throw new Error(`Could not fetch photo from GCS: ${photoResponse.status}`)
  }
  const photoBase64 = Buffer.from(await photoResponse.arrayBuffer()).toString(
    'base64',
  )
  const photoContentType = photoResponse.headers.get('content-type') ?? 'image/jpeg'
  const photoDataUri = `data:${photoContentType};base64,${photoBase64}`

  const analysis = await analyzeReportFlow({
    photoDataUri,
    latitude: params.latitude,
    longitude: params.longitude,
    urgencyNote: params.urgencyNote,
  })

  if (!analysis.isCivicIssue) {
    return { isCivicIssue: false, description: analysis.description }
  }

  const nearbyMatches = await convex.query(api.tickets.findNearby, {
    latitude: params.latitude,
    longitude: params.longitude,
    category: analysis.category,
  })

  const trustScore = computeTrustScore({
    imageIsClear: analysis.imageIsClear,
    accuracyMeters: params.accuracyMeters,
    nearbyMatches,
  })

  return {
    isCivicIssue: true,
    category: analysis.category,
    severity: analysis.severity,
    description: analysis.description,
    department: DEPARTMENT_BY_CATEGORY[analysis.category],
    trustScore,
    nearbyDuplicateCount: nearbyMatches.length,
  }
}
