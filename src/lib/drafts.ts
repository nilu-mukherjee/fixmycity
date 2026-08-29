import { prisma } from '#/db'

import type {
  IssueCategory,
  PresubmitDraft,
  Severity,
} from '#/generated/prisma/client.js'
import type { TrustScoreInput } from './tickets'

/**
 * Created the moment the citizen app requests an upload URL, before the
 * photo bytes even exist in GCS — the draft's `id` is embedded in the GCS
 * object path (`reports/{draftId}.jpg`) so the Eventarc-triggered handler
 * can find it from the object name alone.
 */
export async function createDraft(input: {
  citizenId: string | null
  latitude: number
  longitude: number
  accuracyMeters?: number
  urgencyNote: string
}): Promise<PresubmitDraft> {
  return await prisma.presubmitDraft.create({
    data: { ...input, status: 'processing' },
  })
}

export async function getDraft(id: string): Promise<PresubmitDraft | null> {
  return await prisma.presubmitDraft.findUnique({ where: { id } })
}

/** Called by the photo-uploaded event handler once Gemini analysis succeeds. */
export async function markDraftReady(
  id: string,
  result: {
    category: IssueCategory
    issueLabel: string
    severity: Severity
    description: string
    department: string
    trustScore: TrustScoreInput
    nearbyDuplicateCount: number
  },
): Promise<PresubmitDraft> {
  const { trustScore, ...rest } = result
  return await prisma.presubmitDraft.update({
    where: { id },
    data: { ...rest, ...trustScore, status: 'ready' },
  })
}

/**
 * Called by the photo-uploaded event handler when Gemini determines the
 * photo doesn't depict a real civic issue — submission is blocked rather
 * than creating a ticket with a fabricated category.
 */
export async function markDraftNotCivicIssue(
  id: string,
  description: string,
): Promise<PresubmitDraft> {
  return await prisma.presubmitDraft.update({
    where: { id },
    data: { status: 'not_a_civic_issue', description },
  })
}

/** Called by the photo-uploaded event handler if analysis fails. */
export async function markDraftError(
  id: string,
  errorMessage: string,
): Promise<PresubmitDraft> {
  return await prisma.presubmitDraft.update({
    where: { id },
    data: { status: 'error', errorMessage },
  })
}
