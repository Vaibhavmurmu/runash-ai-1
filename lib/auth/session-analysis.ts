import { db } from "@/lib/db"
import { type LocationData, calculateGeolocationDistance } from "@/lib/geo"

export interface SessionAnalysisResult {
  isSuspicious: boolean
  riskScore: number
  reasons: string[]
  recommendedAction: "allow" | "challenge" | "block"
  metadata: {
    newLocation: boolean
    unusualTime: boolean
    impossibleTravel: boolean
    newDevice: boolean
    velocityCheck: boolean
    geoVelocityMphActual: number
  }
}

export interface SessionLocationData {
  sessionId: string
  userId: number
  ipAddress: string
  location: LocationData
  userAgent: string
  timestamp: Date
}

export interface DeviceFingerprint {
  userId: number
  deviceHash: string
  deviceName: string
  lastSeen: Date
  isVerified: boolean
  createdAt: Date
}

/**
 * Analyze a login attempt for suspicious activity
 */
export async function analyzeLoginPattern(
  userId: number,
  currentLocation: LocationData,
  ipAddress: string,
  userAgent: string,
): Promise<SessionAnalysisResult> {
  const riskFactors: string[] = []
  let riskScore = 0

  // Check for new location
  const previousLocation = await getLastUserLocation(userId)
  const isNewLocation = !previousLocation || 
    (previousLocation.location.latitude !== currentLocation.latitude || 
     previousLocation.location.longitude !== currentLocation.longitude)

  if (isNewLocation) {
    riskFactors.push("New login location detected")
    riskScore += 15
  }

  // Check for impossible travel (velocity check)
  const velocityCheck = previousLocation 
    ? await checkImpossibleTravel(userId, previousLocation, currentLocation)
    : null

  if (velocityCheck && velocityCheck.isImpossible) {
    riskFactors.push(
      `Impossible travel detected: ${velocityCheck.requiredMph.toFixed(0)} mph required`,
    )
    riskScore += 30
  }

  // Check for unusual time of access
  const isUnusualTime = checkUnusualAccessTime(userId)
  if (isUnusualTime) {
    riskFactors.push("Unusual access time detected")
    riskScore += 10
  }

  // Check for new device
  const deviceHash = generateDeviceFingerprint(userAgent)
  const isNewDevice = !(await isKnownDevice(userId, deviceHash))

  if (isNewDevice) {
    riskFactors.push("Access from new device")
    riskScore += 15
  }

  // Store the session location for future analysis
  await recordSessionLocation({
    sessionId: crypto.randomUUID(),
    userId,
    ipAddress,
    location: currentLocation,
    userAgent,
    timestamp: new Date(),
  })

  // Determine recommended action
  let recommendedAction: "allow" | "challenge" | "block" = "allow"
  if (riskScore >= 50) {
    recommendedAction = "block"
  } else if (riskScore >= 25) {
    recommendedAction = "challenge"
  }

  return {
    isSuspicious: riskScore >= 25,
    riskScore,
    reasons: riskFactors,
    recommendedAction,
    metadata: {
      newLocation: isNewLocation,
      unusualTime: isUnusualTime,
      impossibleTravel: velocityCheck?.isImpossible ?? false,
      newDevice: isNewDevice,
      velocityCheck: velocityCheck?.isImpossible ?? false,
      geoVelocityMphActual: velocityCheck?.requiredMph ?? 0,
    },
  }
}

/**
 * Get the last recorded location for a user
 */
async function getLastUserLocation(userId: number): Promise<SessionLocationData | null> {
  try {
    const result = await db.query<SessionLocationData>(
      `SELECT * FROM session_locations 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [userId],
    )

    return result.rows[0] || null
  } catch (error) {
    console.error("[v0] Error fetching user location:", error)
    return null
  }
}

/**
 * Check if travel between two locations is physically impossible
 */
async function checkImpossibleTravel(
  userId: number,
  previousSession: SessionLocationData,
  currentLocation: LocationData,
): Promise<{ isImpossible: boolean; requiredMph: number } | null> {
  try {
    const distance = calculateGeolocationDistance(
      previousSession.location.latitude,
      previousSession.location.longitude,
      currentLocation.latitude,
      currentLocation.longitude,
    )

    // Get time since last login
    const timeDiffMinutes = (new Date().getTime() - previousSession.timestamp.getTime()) / 60000

    // Maximum commercial aircraft speed: ~490 mph
    // Add buffer for taxi, takeoff, landing
    const maxPossibleMph = 500
    const requiredMph = distance / (timeDiffMinutes / 60)

    return {
      isImpossible: requiredMph > maxPossibleMph,
      requiredMph,
    }
  } catch (error) {
    console.error("[v0] Error checking impossible travel:", error)
    return null
  }
}

/**
 * Check if login time is unusual for this user
 */
function checkUnusualAccessTime(userId: number): boolean {
  const currentHour = new Date().getHours()
  
  // This is a simplified check - in production, you'd analyze user's typical login patterns
  // For now, flag very unusual hours (e.g., 2-5 AM for most users)
  const unusualHours = [2, 3, 4]
  
  return unusualHours.includes(currentHour)
}

/**
 * Generate a device fingerprint from user agent
 */
export function generateDeviceFingerprint(userAgent: string): string {
  // Simple hash of user agent - in production, combine with other factors
  // (screen resolution, timezone, plugins, etc.)
  const crypto = require("crypto")
  return crypto.createHash("sha256").update(userAgent).digest("hex")
}

/**
 * Check if a device is known to the user
 */
async function isKnownDevice(userId: number, deviceHash: string): Promise<boolean> {
  try {
    const result = await db.query<DeviceFingerprint>(
      `SELECT * FROM device_fingerprints 
       WHERE user_id = $1 AND device_hash = $2 AND is_verified = true`,
      [userId, deviceHash],
    )

    return result.rows.length > 0
  } catch (error) {
    console.error("[v0] Error checking known device:", error)
    return false
  }
}

/**
 * Record a session location for future analysis
 */
async function recordSessionLocation(location: SessionLocationData): Promise<void> {
  try {
    const { latitude, longitude, city, country } = location.location

    await db.query(
      `INSERT INTO session_locations (session_id, user_id, ip_address, latitude, longitude, city, country, user_agent, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        location.sessionId,
        location.userId,
        location.ipAddress,
        latitude,
        longitude,
        city,
        country,
        location.userAgent,
        location.timestamp,
      ],
    )
  } catch (error) {
    console.error("[v0] Error recording session location:", error)
  }
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: number): Promise<DeviceFingerprint[]> {
  try {
    const result = await db.query<DeviceFingerprint>(
      `SELECT * FROM device_fingerprints 
       WHERE user_id = $1 
       ORDER BY last_seen DESC`,
      [userId],
    )

    return result.rows
  } catch (error) {
    console.error("[v0] Error fetching user devices:", error)
    return []
  }
}

/**
 * Mark a suspicious login for review
 */
export async function recordSuspiciousLogin(
  userId: number,
  ipAddress: string,
  reason: string,
  riskScore: number,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO suspicious_logins (user_id, ip_address, reason, risk_score, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, ipAddress, reason, riskScore],
    )
  } catch (error) {
    console.error("[v0] Error recording suspicious login:", error)
  }
}
