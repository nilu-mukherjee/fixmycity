const BUCKET_NAME = 'fixmycity-506122-photos'

/**
 * Public read URL for an object. No Node-only dependencies (unlike
 * `storage.ts`, which pulls in `@google-cloud/storage`) so this is safe to
 * import from client components like the admin console.
 */
export function getPublicUrl(objectName: string): string {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`
}
