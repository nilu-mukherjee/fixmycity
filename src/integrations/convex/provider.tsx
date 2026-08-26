import { ConvexProvider } from 'convex/react'

import type { ConvexQueryClient } from '@convex-dev/react-query'

export default function AppConvexProvider({
  convexQueryClient,
  children,
}: {
  convexQueryClient: ConvexQueryClient
  children: React.ReactNode
}) {
  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </ConvexProvider>
  )
}
