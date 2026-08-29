import { genkit, z } from 'genkit'

import { findNearbyTickets, getRecentCorrections } from '#/lib/tickets'

import { genAI, CLASSIFICATION_MODEL } from './google-genai-client'
import { getDatasetCacheName } from './dataset-cache'
import { executeFindNearbyReports } from './find-nearby-tool'

import type { CorrectionExample } from '#/lib/tickets'
import type { Content, GenerateContentConfig } from '@google/genai'

// No `googleAI` plugin here — the actual classification call goes through
// the raw `@google/genai` client (`google-genai-client.ts`) so it can
// reference a `CachedContent` resource, which genkit's `ai.generate()` has
// no way to do (see that file's comment). `ai.defineFlow` below is kept
// purely for genkit's tracing/dev-UI, not for generation.
const ai = genkit({})

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
  streetlight: 'Electricity Department',
  drainage: 'Water Board',
  water_leakage: 'Water Board',
}

/**
 * Grounds classification in real-world municipal taxonomy instead of the
 * bare category names alone — distilled from a real BBMP (Bengaluru)
 * grievance dataset (128k+ complaints), one representative slice of the
 * actual sub-categories citizens use per bucket. Static, not a live
 * retrieval/embedding lookup: the dataset is categorical labels, not
 * free-text descriptions, so there isn't enough semantic texture in it to
 * justify a vector-search pipeline over the same ~7-10 labels per category.
 */
const CATEGORY_EXAMPLES: Record<IssueCategory, string> = {
  pothole: 'potholes, road cutting/excavation left unfilled',
  garbage:
    'garbage dump, uncollected garbage, illegal dumping in vacant sites, burning garbage in open space',
  streetlight:
    'street light not working, street lights left on during daytime, exposed/open electrical junction box, earthing issue on electric poles',
  drainage:
    'storm water drain maintenance, blocked or overflowing drains, road-side drains, water stagnation',
  water_leakage:
    'water leakage on the road surface, sewerage water leaking into a storm drain',
  road_blockage:
    'debris or construction material blocking the road, unauthorised construction encroaching on the road',
  unsafe_footpath: 'damaged or broken footpath, footpath encroachment',
}

function buildCategoryExamplesBlock(): string[] {
  return [
    'If it is a civic issue, classify it into exactly one category. Real-world examples of what each category actually covers, from real municipal grievance records:',
    ...CATEGORIES.map((c) => `- ${c}: ${CATEGORY_EXAMPLES[c]}`),
  ]
}

const GeminiAnalysisSchema = z.object({
  isCivicIssue: z
    .boolean()
    .describe(
      'True if the photo depicts a genuine public infrastructure / civic problem matching one of the categories. False if it shows something unrelated to civic infrastructure — a person, a pet, a screen, an indoor object, food, etc. Check this first: everything else in this schema still needs a value even when this is false, but the caller will discard them and refuse the submission.',
    ),
  category: z.enum(CATEGORIES),
  issueLabel: z
    .string()
    .describe(
      'A short, specific, citizen-facing phrase (2-6 words) naming exactly what the photo shows — e.g. "Exposed Electrical Wiring", "Overflowing Garbage Bin", "Deep Pothole on Main Road". This is NOT the category (category stays one of the fixed values above, for routing) — it is the specific, readable label shown alongside it, so it should be more precise than the category name. Leave it as a best-effort guess (not empty) even when isCivicIssue is false.',
    ),
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

// Hand-written rather than derived via a zod `toJSONSchema()` call: `z` here
// is genkit's re-exported zod v3 (bundled by @genkit-ai/core), which has no
// such method — and it must stay v3, since `ai.defineFlow`'s
// inputSchema/outputSchema below are genkit APIs. These two schemas are
// small and static, so keeping a plain JSON Schema literal in sync by hand
// (both pull category/severity values from the same CATEGORIES/SEVERITIES
// arrays) is simpler than wiring in a second zod version just for this.
const GEMINI_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    isCivicIssue: {
      type: 'boolean',
      description:
        'True if the photo depicts a genuine public infrastructure / civic problem matching one of the categories. False if it shows something unrelated to civic infrastructure — a person, a pet, a screen, an indoor object, food, etc. Check this first: everything else in this schema still needs a value even when this is false, but the caller will discard them and refuse the submission.',
    },
    category: { type: 'string', enum: [...CATEGORIES] },
    issueLabel: {
      type: 'string',
      description:
        'A short, specific, citizen-facing phrase (2-6 words) naming exactly what the photo shows — e.g. "Exposed Electrical Wiring", "Overflowing Garbage Bin", "Deep Pothole on Main Road". This is NOT the category (category stays one of the fixed values above, for routing) — it is the specific, readable label shown alongside it, so it should be more precise than the category name. Leave it as a best-effort guess (not empty) even when isCivicIssue is false.',
    },
    severity: { type: 'string', enum: [...SEVERITIES] },
    description: {
      type: 'string',
      description:
        'A one to two sentence, citizen-facing description of what the photo actually shows. If isCivicIssue is false, explain what the photo shows instead and why it is not a civic issue.',
    },
    imageIsClear: {
      type: 'boolean',
      description:
        'True if the photo clearly and unambiguously shows the reported issue, false if it is blurry, too dark, too far away, or otherwise hard to verify.',
    },
  },
  required: [
    'isCivicIssue',
    'category',
    'issueLabel',
    'severity',
    'description',
    'imageIsClear',
  ],
}

// The `findNearbyReports` tool itself (declaration + local execution) lives
// in `find-nearby-tool.ts`, shared with `dataset-cache.ts` — Gemini rejects
// any `generateContent` request that sets both `cachedContent` and
// `tools`/`toolConfig`, so the tool's function declaration has to be baked
// into the `CachedContent` at creation time instead of passed per-request
// here. That also rules out `@google/genai`'s automatic-function-calling
// (`CallableTool`), which only auto-invokes tools passed in the request's
// own `config.tools` — so `analyzeReportFlow` below drives the
// call/response loop by hand.

/**
 * Turns recent citizen corrections into a few-shot block appended to the
 * classification prompt — this is the actual self-improvement mechanism:
 * in-context learning from the system's own past mistakes on every new
 * report, no fine-tuning/retraining pipeline involved. Empty when there's
 * no correction history yet (e.g. a fresh deployment).
 */
function buildCorrectionsPromptBlock(
  corrections: CorrectionExample[],
): string[] {
  if (corrections.length === 0) return []

  return [
    '',
    "Recent corrections a citizen made to this system's own past classifications — use these to calibrate your judgment on similar cases, don't just repeat the same mistake:",
    ...corrections.map(
      (c, i) =>
        `${i + 1}. Photo described as: "${c.description}". Previously guessed ${c.aiCategory} / ${c.aiSeverity}, but the citizen corrected it to ${c.category} / ${c.severity}.`,
    ),
  ]
}

const CorrectionExampleSchema = z.object({
  description: z.string(),
  aiCategory: z.enum(CATEGORIES),
  category: z.enum(CATEGORIES),
  aiSeverity: z.enum(SEVERITIES),
  severity: z.enum(SEVERITIES),
})

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
      // Self-improvement feedback: recent tickets where a citizen corrected
      // Gemini's own past guess, folded into the prompt as few-shot
      // examples (see `getRecentCorrections`). In-context learning, not a
      // fine-tuning/retraining pipeline.
      corrections: z.array(CorrectionExampleSchema),
    }),
    outputSchema: GeminiAnalysisSchema,
  },
  async (input) => {
    const [, base64Data] = input.photoDataUri.split(',', 2)
    const mimeTypeMatch = /^data:([^;]+);base64,/.exec(input.photoDataUri)
    if (!base64Data || !mimeTypeMatch) {
      throw new Error('photoDataUri must be a base64 `data:` URI')
    }

    // The dataset context cache (real BBMP grievance records — see
    // `dataset-cache.ts`) is sent alongside the photo on every
    // classification call; `cachedContent` is only reachable through the
    // raw SDK (see `google-genai-client.ts`), not genkit's `ai.generate()`.
    const cachedContent = await getDatasetCacheName()

    // `tools` is deliberately absent here — it lives on the cache itself
    // (see dataset-cache.ts / find-nearby-tool.ts) since Gemini rejects a
    // request that sets both `cachedContent` and `tools`.
    const config: GenerateContentConfig = {
      ...(cachedContent ? { cachedContent } : {}),
      responseMimeType: 'application/json',
      responseJsonSchema: GEMINI_ANALYSIS_JSON_SCHEMA,
    }

    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeTypeMatch[1], data: base64Data } },
          {
            text: [
              'You are the AI intake system for a civic issue-reporting app.',
              'A citizen submitted this photo, claiming it shows a public infrastructure problem, along with this note:',
              `"${input.urgencyNote}"`,
              `The report's location is latitude ${input.latitude}, longitude ${input.longitude}.`,
              '',
              'First, check whether the photo actually shows a real civic/public-infrastructure problem at all — as opposed to something unrelated (a person, a pet, a screen, an indoor object, food, a meme, etc.). Set isCivicIssue accordingly. Submissions where isCivicIssue is false get blocked before reaching a human, so be honest rather than charitable here.',
              '',
              ...buildCategoryExamplesBlock(),
              '',
              'A reference dataset of real BBMP civic grievance records (Category, Sub Category, Ward Name) is attached as context — use it to ground your category choice in how real municipal complaints are actually filed, not just the category names above.',
              '',
              'You have access to a findNearbyReports function. Once you have identified the likely category, call it with that category and this location to check whether other citizens have already reported the same issue nearby. Skip this call if isCivicIssue is false.',
              '',
              'Estimate its severity as one of: low, medium, high, emergency',
              '(emergency = immediate danger to life/safety, e.g. exposed live wires, deep open drain on a walkway, major road collapse).',
              'Multiple recent nearby reports of the same hazard should push your severity estimate up, not down — treat them as corroboration, not noise.',
              '',
              'Write a short, factual, citizen-facing description of what the photo shows.',
              'Judge whether the photo is clear enough to verify the issue (well-lit, in focus, issue clearly visible).',
              ...buildCorrectionsPromptBlock(input.corrections),
            ].join('\n'),
          },
        ],
      },
    ]

    let response = await genAI.models.generateContent({
      model: CLASSIFICATION_MODEL,
      config,
      contents,
    })

    // Manual tool-call loop (mirroring what `@google/genai`'s own automatic
    // function calling does internally — see find-nearby-tool.ts) since that
    // automatic path only works when `tools` is set on the request, which
    // isn't allowed alongside `cachedContent`.
    const MAX_TOOL_ITERATIONS = 3
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const calls = response.functionCalls
      if (!calls || calls.length === 0) break

      const modelContent = response.candidates?.[0]?.content
      if (modelContent) contents.push(modelContent)

      const responseParts = await Promise.all(
        calls.map((call) => executeFindNearbyReports(call)),
      )
      contents.push({ role: 'user', parts: responseParts })

      response = await genAI.models.generateContent({
        model: CLASSIFICATION_MODEL,
        config,
        contents,
      })
    }

    const text = response.text
    if (!text) {
      throw new Error(
        'Gemini returned no structured output for report analysis',
      )
    }
    return GeminiAnalysisSchema.parse(JSON.parse(text))
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
  nearbyMatches: Awaited<ReturnType<typeof findNearbyTickets>>
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
    (t) => now - t.createdAt.getTime() <= RECENT_WINDOW_MS,
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
      issueLabel: string
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
 * Orchestrates the full "presubmit" pipeline: fetch recent citizen
 * corrections for the self-improvement feedback loop, Gemini Vision
 * classification (calibrated against those corrections), duplicate check
 * against Postgres, trust score, department routing. Does not persist
 * anything — that happens once the citizen approves (see
 * `src/orpc/router/reports.ts`'s `createTicket`).
 */
export async function runReportPipeline(params: {
  photoUrl: string
  latitude: number
  longitude: number
  accuracyMeters: number | undefined
  urgencyNote: string
}): Promise<PresubmitResult> {
  const photoResponse = await fetch(params.photoUrl)
  if (!photoResponse.ok) {
    throw new Error(`Could not fetch photo from GCS: ${photoResponse.status}`)
  }
  const photoBase64 = Buffer.from(await photoResponse.arrayBuffer()).toString(
    'base64',
  )
  const photoContentType =
    photoResponse.headers.get('content-type') ?? 'image/jpeg'
  const photoDataUri = `data:${photoContentType};base64,${photoBase64}`

  const corrections = await getRecentCorrections()

  const analysis = await analyzeReportFlow({
    photoDataUri,
    latitude: params.latitude,
    longitude: params.longitude,
    urgencyNote: params.urgencyNote,
    corrections,
  })

  if (!analysis.isCivicIssue) {
    return { isCivicIssue: false, description: analysis.description }
  }

  const nearbyMatches = await findNearbyTickets({
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
    issueLabel: analysis.issueLabel,
    severity: analysis.severity,
    description: analysis.description,
    department: DEPARTMENT_BY_CATEGORY[analysis.category],
    trustScore,
    nearbyDuplicateCount: nearbyMatches.length,
  }
}
