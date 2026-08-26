import { ConvexProvider } from 'convex/react'

import { convexQueryClient } from '../tanstack-query/root-provider'

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </ConvexProvider>
  )
}
