import '#/polyfill'

import { createFileRoute } from '@tanstack/react-router'

import { getPublicUrl } from '#/gcs/url'
import { runReportPipeline } from '#/genkit/report-flow'
import {
  getDraft,
  markDraftError,
  markDraftNotCivicIssue,
  markDraftReady,
} from '#/lib/drafts'

/**
 * Eventarc's destination for `google.cloud.storage.object.v1.finalized`.
 * Delivered as a CloudEvent in binary content mode: metadata in `ce-*`
 * headers, the GCS object resource as the raw JSON body. Runs on the
 * IAM-locked `fixmycity-events` Cloud Run service, invokable only by the
 * trigger's own service account — never exposed on the public `fixmycity`
 * service, since `--allow-unauthenticated` is whole-service, not per-route.
 */
async function handle({ request }: { request: Request }) {
  const ceType = request.headers.get('ce-type')
  if (ceType && ceType !== 'google.cloud.storage.object.v1.finalized') {
    // Not an event we care about — ack it so Eventarc doesn't retry.
    return new Response('ignored', { status: 200 })
  }

  const body = (await request.json()) as { bucket?: string; name?: string }
  const objectName = body.name
  if (!objectName) {
    console.error('[events] photo-uploaded: missing object name in event body')
    return new Response('missing object name', { status: 200 })
  }

  const match = /^reports\/([^/]+)\.jpg$/.exec(objectName)
  if (!match) {
    console.error(`[events] photo-uploaded: unrecognized object name ${objectName}`)
    return new Response('unrecognized object name', { status: 200 })
  }
  const draftId = match[1]

  const draft = await getDraft(draftId)
  if (!draft) {
    console.error(`[events] photo-uploaded: no draft found for id ${draftId}`)
    return new Response('no such draft', { status: 200 })
  }

  try {
    const result = await runReportPipeline({
      photoUrl: getPublicUrl(objectName),
      latitude: draft.latitude,
      longitude: draft.longitude,
      accuracyMeters: draft.accuracyMeters ?? undefined,
      urgencyNote: draft.urgencyNote,
    })

    if (!result.isCivicIssue) {
      await markDraftNotCivicIssue(draftId, result.description)
    } else {
      await markDraftReady(draftId, {
        category: result.category,
        issueLabel: result.issueLabel,
        severity: result.severity,
        description: result.description,
        department: result.department,
        trustScore: result.trustScore,
        nearbyDuplicateCount: result.nearbyDuplicateCount,
      })
    }
  } catch (error) {
    console.error(`[events] photo-uploaded: pipeline failed for draft ${draftId}`, error)
    await markDraftError(
      draftId,
      error instanceof Error ? error.message : String(error),
    )
  }

  return new Response('ok', { status: 200 })
}

export const Route = createFileRoute('/api/events/photo-uploaded')({
  server: {
    handlers: {
      POST: handle,
    },
  },
})
