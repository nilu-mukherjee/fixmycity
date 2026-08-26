import { Storage } from '@google-cloud/storage'

import { getPublicUrl } from './url'

const BUCKET_NAME = 'fixmycity-506122-photos'

export { getPublicUrl }

// A fresh client per call, consistent with this repo's pattern for other
// stateful clients (ConvexHttpClient) — cheap to construct, avoids sharing
// mutable state across concurrent requests.
function bucket() {
  return new Storage().bucket(BUCKET_NAME)
}

const SIGNED_URL_EXPIRY_MS = 15 * 60 * 1000

/**
 * A V4 signed PUT URL the citizen app uploads the photo bytes directly to.
 * Requires the runtime service account to have `roles/iam.serviceAccountTokenCreator`
 * on itself — Cloud Run's Application Default Credentials have no private
 * key, so signing goes through IAM's signBlob API by impersonating the same
 * service account.
 */
export async function createUploadUrl(
  objectName: string,
  contentType: string,
): Promise<string> {
  const [url] = await bucket().file(objectName).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + SIGNED_URL_EXPIRY_MS,
    contentType,
  })
  return url
}
