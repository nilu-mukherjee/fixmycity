import { readFileSync } from 'node:fs'
import path from 'node:path'

import { genAI, CLASSIFICATION_MODEL } from './google-genai-client'
import { FIND_NEARBY_REPORTS_TOOL } from './find-nearby-tool'

const DATASET_PATH = path.join(
  process.cwd(),
  'data/bbmp-grievance-categories.csv',
)

const CACHE_TTL_SECONDS = 24 * 60 * 60
const REFRESH_BUFFER_MS = 5 * 60 * 1000

let cacheName: string | null = null
let expiresAtMs = 0
let inflight: Promise<string | null> | null = null

/**
 * Real BBMP (Bengaluru civic body) grievance records — the same dataset the
 * user supplied for grounding classification, deduplicated down to distinct
 * (Category, Sub Category, Ward Name) triples (~11k rows / ~180k tokens).
 * The raw file (128k rows, ~8.9M tokens) was measured against Gemini's
 * actual cache ceiling and rejected outright ("Cached content is too
 * large"); empirically the ceiling sits between 900k and 1.2M tokens for
 * this model, so the low-signal columns (Complaint ID, Grievance Date,
 * Grievance Status, Staff Remarks, Staff Name) were dropped and exact
 * duplicate rows collapsed to fit with room to spare.
 *
 * Cached via Gemini's context-caching API (`caches.create`) so these ~180k
 * tokens are billed and reprocessed once per TTL window instead of on every
 * citizen photo submission — see `google-genai-client.ts` for why this goes
 * through the raw `@google/genai` SDK instead of genkit's `ai.generate()`.
 */
async function createCache(): Promise<string> {
  const csv = readFileSync(DATASET_PATH, 'utf8')
  const cache = await genAI.caches.create({
    model: CLASSIFICATION_MODEL,
    config: {
      displayName: 'bbmp-grievance-categories',
      ttl: `${CACHE_TTL_SECONDS}s`,
      // `tools` has to live on the cache — Gemini rejects any
      // `generateContent` call that sets both `cachedContent` and
      // `tools`/`toolConfig` on the request itself (see find-nearby-tool.ts).
      tools: [FIND_NEARBY_REPORTS_TOOL],
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Reference dataset: real BBMP (Bengaluru) civic grievance records, deduplicated to distinct (Category, Sub Category, Ward Name) combinations that actual citizens have filed with the municipal body. Use this to calibrate how real municipal complaints are categorized when classifying a new citizen photo report.',
                '',
                csv,
              ].join('\n'),
            },
          ],
        },
      ],
    },
  })
  if (!cache.name) {
    throw new Error('Gemini did not return a name for the created cache')
  }
  return cache.name
}

/**
 * Returns the name of a live `CachedContent` resource holding the dataset
 * above, creating (or recreating, once the TTL is close to expiring) it as
 * needed. Returns null — rather than throwing — if cache creation fails, so
 * a Gemini-side hiccup degrades to an uncached classification call instead
 * of blocking report submission entirely.
 */
export async function getDatasetCacheName(): Promise<string | null> {
  const now = Date.now()
  if (cacheName && now < expiresAtMs - REFRESH_BUFFER_MS) {
    return cacheName
  }

  if (!inflight) {
    inflight = createCache()
      .then((name) => {
        cacheName = name
        expiresAtMs = Date.now() + CACHE_TTL_SECONDS * 1000
        return name
      })
      .catch((err: unknown) => {
        console.error(
          '[dataset-cache] failed to create context cache, falling back to an uncached classification prompt:',
          err,
        )
        return null
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
