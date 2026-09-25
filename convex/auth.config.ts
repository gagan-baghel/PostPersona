import type { AuthConfig } from "convex/server"

// The Next.js server proves who it is with the OIDC token Vercel issues to every function
// (lib/convex/client.ts). Nothing here is secret, and there is no key to copy or leak.
const VERCEL_TEAM = "gagans-projects-be082505"

export default {
  providers: [
    {
      type: "customJwt",
      issuer: `https://oidc.vercel.com/${VERCEL_TEAM}`,
      jwks: `https://oidc.vercel.com/${VERCEL_TEAM}/.well-known/jwks`,
      algorithm: "RS256",
      applicationID: `https://vercel.com/${VERCEL_TEAM}`,
    },
  ],
} satisfies AuthConfig
