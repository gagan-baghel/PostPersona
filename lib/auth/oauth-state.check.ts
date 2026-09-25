// Run: npx jiti lib/auth/oauth-state.check.ts
import assert from "node:assert/strict"

import { createSessionToken, signOAuthState, verifyOAuthState, verifySessionToken } from "./session"

process.env.SESSION_SECRET = "test-secret"

const data = { userId: "victim", ts: 1, nextPath: "/dashboard/generate", nonce: "n1" }
const state = signOAuthState(data)
const [payload, sig] = state.split(".")

// Round-trips.
assert.deepEqual(verifyOAuthState(state), data)

// Tampered payload (swap userId, keep the original signature) is rejected.
const forgedPayload = Buffer.from(JSON.stringify({ ...data, userId: "attacker" })).toString("base64url")
assert.equal(verifyOAuthState(`${forgedPayload}.${sig}`), null)

// Tampered signature is rejected.
assert.equal(verifyOAuthState(`${payload}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`), null)

// Old-style unsigned state is rejected.
assert.equal(verifyOAuthState(payload), null)

// Extra segments, empty, and missing values are rejected.
assert.equal(verifyOAuthState(`${state}.x`), null)
assert.equal(verifyOAuthState(""), null)
assert.equal(verifyOAuthState(null), null)

// A session token is not a valid state (signatures are domain-separated).
assert.equal(verifyOAuthState(createSessionToken("victim")), null)

// Session tokens still verify, and a tampered one doesn't (timing-safe compare).
const token = createSessionToken("u1")
assert.equal(verifySessionToken(token), "u1")
assert.equal(verifySessionToken(`${token.split(".")[0]}.${"x".repeat(token.split(".")[1].length)}`), null)
assert.equal(verifySessionToken(`${token}x`), null)

// A state signed with a different secret is rejected.
process.env.SESSION_SECRET = "other-secret"
assert.equal(verifyOAuthState(state), null)

console.log("oauth-state check: ok")
