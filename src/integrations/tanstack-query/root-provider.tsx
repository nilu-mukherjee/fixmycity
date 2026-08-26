import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
if (!CONVEX_URL) {
  console.error('missing envar VITE_CONVEX_URL')
}

export function getContext() {
  // A fresh ConvexQueryClient per call, not a module-level singleton.
  // getContext() runs once per incoming request on the server (every page
  // load AND every API route — TanStack Start's router tree covers both)
  // and once on the client at hydration. ConvexQueryClient.connect() can
  // only be called once per instance ("already subscribed!" otherwise), so
  // reusing one across server requests broke every request after the first.
  // Client-side this still behaves like a singleton, since getRouter() (and
  // therefore getContext()) only runs once per browser session there.
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  return {
    queryClient,
    convexQueryClient,
  }
}
export default function TanstackQueryProvider() {}
