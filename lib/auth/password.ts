import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(":")
  if (!salt || !expectedHash) return false

  const actualHash = scryptSync(password, salt, KEY_LEN).toString("hex")
  const a = Buffer.from(actualHash, "hex")
  const b = Buffer.from(expectedHash, "hex")

  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
