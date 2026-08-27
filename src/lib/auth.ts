import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { bearer } from 'better-auth/plugins'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { prisma } from '#/db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // bearer() must come before tanstackStartCookies() — its after-hook reads
  // the raw `set-cookie` response header to emit `set-auth-token` (for the
  // Flutter app, which has no cookie jar), and tanstackStartCookies() drains
  // that header into the framework's own cookie store. If the cookie plugin
  // runs first, bearer() sees nothing and no token reaches the client — this
  // is also what Better Auth's own startup warning about plugin order was
  // pointing at.
  plugins: [bearer(), tanstackStartCookies()],
})
