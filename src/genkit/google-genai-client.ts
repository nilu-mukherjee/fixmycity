import { GoogleGenAI } from '@google/genai'

/**
 * A raw `@google/genai` client, separate from the `genkit`-wrapped `ai`
 * instance in `report-flow.ts`. Genkit's `googleAI` plugin (as of
 * @genkit-ai/google-genai@1.41) has no way to reference a pre-built
 * `CachedContent` resource on a `generate()` call — its config schema only
 * exposes an unused `contextCache: boolean` flag, and any `cachedContent`
 * string passed through `config` gets silently absorbed into
 * `generationConfig` (the wrong place in the REST request) instead of the
 * request's top-level `cachedContent` field. The raw SDK's
 * `GenerateContentConfig` supports it directly, so the dataset-context-cache
 * path (`dataset-cache.ts`, `report-flow.ts`) talks to Gemini through this
 * client instead of through genkit.
 */
export const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export const CLASSIFICATION_MODEL = 'gemini-3.6-flash'
