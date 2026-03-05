/**
 * Geolocation utilities for IP address lookup and distance calculations
 */

export interface LocationData {
  latitude: number
  longitude: number
  city: string
  region: string
  country: string
  timezone: string
  isp: string
}

/**
 * Get geolocation data for an IP address
 * Uses IP geolocation API (MaxMind, IP2Location, or similar)
 */
export async function getIpGeolocation(ipAddress: string): Promise<LocationData | null> {
  try {
    // Use environment variable to determine which service to use
    const geolocationService = process.env.GEOLOCATION_SERVICE || "maxmind"

    if (geolocationService === "maxmind") {
      return await getMaxMindGeolocation(ipAddress)
    } else if (geolocationService === "ip2location") {
      return await getIp2LocationGeolocation(ipAddress)
    } else {
      return await getFallbackGeolocation(ipAddress)
    }
  } catch (error) {
    console.error("[v0] Error getting geolocation:", error)
    return null
  }
}

/**
 * Get geolocation using MaxMind GeoIP2
 */
async function getMaxMindGeolocation(ipAddress: string): Promise<LocationData | null> {
  try {
    const accountId = process.env.MAXMIND_ACCOUNT_ID
    const licenseKey = process.env.MAXMIND_LICENSE_KEY

    if (!accountId || !licenseKey) {
      console.warn("[v0] MaxMind credentials not configured")
      return null
    }

    const auth = Buffer.from(`${accountId}:${licenseKey}`).toString("base64")
    const response = await fetch(`https://geoip.maxmind.com/geoip/v2.1/city/${ipAddress}`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      city: data.city?.names?.en || "Unknown",
      region: data.subdivisions?.[0]?.names?.en || "",
      country: data.country?.iso_code || "Unknown",
      timezone: data.location?.time_zone || "",
      isp: data.traits?.isp || "Unknown",
    }
  } catch (error) {
    console.error("[v0] MaxMind geolocation error:", error)
    return null
  }
}

/**
 * Get geolocation using IP2Location
 */
async function getIp2LocationGeolocation(ipAddress: string): Promise<LocationData | null> {
  try {
    const apiKey = process.env.IP2LOCATION_API_KEY

    if (!apiKey) {
      console.warn("[v0] IP2Location API key not configured")
      return null
    }

    const response = await fetch(
      `https://api.ip2location.io/?ip=${ipAddress}&key=${apiKey}&format=json`,
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      city: data.city_name || "Unknown",
      region: data.region_name || "",
      country: data.country_code || "Unknown",
      timezone: data.time_zone || "",
      isp: data.isp || "Unknown",
    }
  } catch (error) {
    console.error("[v0] IP2Location geolocation error:", error)
    return null
  }
}

/**
 * Fallback geolocation using a free API
 */
async function getFallbackGeolocation(ipAddress: string): Promise<LocationData | null> {
  try {
    // Using ip-api.com free tier (limited requests)
    const response = await fetch(`http://ip-api.com/json/${ipAddress}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.status !== "success") {
      return null
    }

    return {
      latitude: data.lat,
      longitude: data.lon,
      city: data.city || "Unknown",
      region: data.regionName || "",
      country: data.country || "Unknown",
      timezone: data.timezone || "",
      isp: data.isp || "Unknown",
    }
  } catch (error) {
    console.error("[v0] Fallback geolocation error:", error)
    return null
  }
}

/**
 * Calculate distance between two geographic coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateGeolocationDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Check if two locations are within a reasonable distance
 */
export function areLocationsNear(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxDistanceMiles = 10,
): boolean {
  const distance = calculateGeolocationDistance(lat1, lon1, lat2, lon2)
  return distance <= maxDistanceMiles
}

/**
 * Get timezone offset difference between two locations
 */
export function getTimezoneDifference(tz1: string, tz2: string): number {
  try {
    const formatter1 = new Intl.DateTimeFormat("en-US", {
      timeZone: tz1,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    const formatter2 = new Intl.DateTimeFormat("en-US", {
      timeZone: tz2,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    const now = new Date()
    const time1 = new Date(formatter1.format(now))
    const time2 = new Date(formatter2.format(now))

    return (time2.getTime() - time1.getTime()) / (1000 * 60 * 60) // difference in hours
  } catch (error) {
    console.error("[v0] Error calculating timezone difference:", error)
    return 0
  }
}
