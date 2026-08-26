import { QueryClient } from '@tanstack/react-query'
import { ConvexQueryClient } from '@convex-dev/react-query'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
if (!CONVEX_URL) {
  console.error('missing envar VITE_CONVEX_URL')
}

// Single shared instance: connects the Convex client to TanStack Query's
// cache so `convexQuery(api.foo.bar, args)` queries work (they rely on this
// being registered as the QueryClient's default queryFn/hashFn) and gives
// `AppConvexProvider` (src/integrations/convex/provider.tsx) the same
// underlying Convex client for its context provider.
export const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

export function getContext() {
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
  }
}
export default function TanstackQueryProvider() {}
