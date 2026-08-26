// srvx's `--static` flag only serves static files when it owns request
// routing outright — once a custom `entry` handler is supplied (our
// TanStack Start SSR handler), srvx delegates every request to it and never
// touches disk itself. So static files (the hashed JS/CSS in dist/client,
// plus anything copied from Vite's public/ dir) have to be served here,
// before falling through to SSR — otherwise every /assets/* request 404s
// against the SSR handler's own catch-all and the page never hydrates.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { Readable } from 'node:stream'

import ssrHandler from './dist/server/server.js'

const STATIC_ROOT = join(import.meta.dirname, 'dist', 'client')

const CONTENT_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function resolveStaticFile(pathname) {
  if (pathname.includes('..')) return null
  const filePath = normalize(join(STATIC_ROOT, pathname))
  if (!filePath.startsWith(STATIC_ROOT)) return null
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null
  return filePath
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const filePath = resolveStaticFile(decodeURIComponent(url.pathname))
    if (filePath) {
      const contentType = CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream'
      // Hashed filenames under /assets/ are immutable; everything else
      // (favicon.png, logo.png from public/) gets a short cache instead.
      const cacheControl = url.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600'
      return new Response(Readable.toWeb(createReadStream(filePath)), {
        headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl },
      })
    }
    return ssrHandler.fetch(request)
  },
}
