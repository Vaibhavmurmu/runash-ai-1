import bcrypt from "bcryptjs"
import { createHash, randomBytes } from "node:crypto"

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex")
}
