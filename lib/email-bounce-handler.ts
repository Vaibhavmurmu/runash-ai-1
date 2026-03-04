import { neon } from "@neondatabase/serverless"
import { EmailDeliveryTracker } from "./email-delivery"
import { normalizePagination, SafeWhereBuilder, validateDateRange } from "@/lib/email-filter-utils"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailSuppression {
  id: number
  email: string
  type: "bounce" | "complaint" | "unsubscribe" | "manual"
  reason?: string
  bounce_type?: "hard" | "soft" | "complaint"
  created_at: Date
  expires_at?: Date
  is_permanent: boolean
}

export interface BounceEvent {
  message_id: string
  recipient_email: string
  bounce_type: "hard" | "soft" | "complaint"
  bounce_subtype?: string
  reason: string
  diagnostic_code?: string
  timestamp: Date
  raw_data?: Record<string, any>
}

export class EmailBounceHandler {
  // Process bounce notification
  static async processBounce(bounceData: BounceEvent): Promise<boolean> {
    try {
      // Update delivery status
      await EmailDeliveryTracker.updateDeliveryStatus(bounceData.message_id, "bounced", {
        bounce_reason: bounceData.reason,
        tracking_data: {
          bounce_type: bounceData.bounce_type,
          bounce_subtype: bounceData.bounce_subtype,
          diagnostic_code: bounceData.diagnostic_code,
          raw_data: bounceData.raw_data,
        },
      })

      // Handle suppression based on bounce type
      if (bounceData.bounce_type === "hard") {
        await this.addSuppression({
          email: bounceData.recipient_email,
          type: "bounce",
          bounce_type: "hard",
          reason: bounceData.reason,
          is_permanent: true,
        })
      } else if (bounceData.bounce_type === "soft") {
        // Check if this email has had multiple soft bounces
        const recentBounces = await this.getRecentBounces(bounceData.recipient_email, 7) // Last 7 days

        if (recentBounces >= 3) {
          // Convert to permanent suppression after 3 soft bounces
          await this.addSuppression({
            email: bounceData.recipient_email,
            type: "bounce",
            bounce_type: "soft",
            reason: `Multiple soft bounces: ${bounceData.reason}`,
            is_permanent: true,
          })
        } else {
          // Temporary suppression for soft bounces
          const expiresAt = new Date()
          expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour suppression

          await this.addSuppression({
            email: bounceData.recipient_email,
            type: "bounce",
            bounce_type: "soft",
            reason: bounceData.reason,
            is_permanent: false,
            expires_at: expiresAt,
          })
        }
      } else if (bounceData.bounce_type === "complaint") {
        await this.addSuppression({
          email: bounceData.recipient_email,
          type: "complaint",
          reason: bounceData.reason,
          is_permanent: true,
        })
      }

      return true
    } catch (error) {
      console.error("Error processing bounce:", error)
      return false
    }
  }

  // Add email to suppression list
  static async addSuppression(data: {
    email: string
    type: "bounce" | "complaint" | "unsubscribe" | "manual"
    bounce_type?: "hard" | "soft" | "complaint"
    reason?: string
    is_permanent?: boolean
    expires_at?: Date
  }): Promise<boolean> {
    try {
      await sql`
        INSERT INTO email_suppressions (
          email, type, reason, bounce_type, is_permanent, expires_at
        ) VALUES (
          ${data.email.toLowerCase()}, ${data.type}, ${data.reason || null},
          ${data.bounce_type || null}, ${data.is_permanent || false}, 
          ${data.expires_at || null}
        )
        ON CONFLICT (email) 
        DO UPDATE SET 
          type = ${data.type},
          reason = ${data.reason || null},
          bounce_type = ${data.bounce_type || null},
          is_permanent = ${data.is_permanent || false},
          expires_at = ${data.expires_at || null},
          created_at = NOW()
      `

      return true
    } catch (error) {
      console.error("Error adding suppression:", error)
      return false
    }
  }

  // Remove email from suppression list
  static async removeSuppression(email: string): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM email_suppressions 
        WHERE email = ${email.toLowerCase()}
      `
      return result.length > 0
    } catch (error) {
      console.error("Error removing suppression:", error)
      return false
    }
  }

  // Check if email is suppressed
  static async isEmailSuppressed(email: string): Promise<{
    suppressed: boolean
    reason?: string
    type?: string
    expires_at?: Date
  }> {
    try {
      const result = await sql`
        SELECT * FROM email_suppressions 
        WHERE email = ${email.toLowerCase()}
        AND (expires_at IS NULL OR expires_at > NOW())
      `

      if (result.length === 0) {
        return { suppressed: false }
      }

      const suppression = result[0]
      return {
        suppressed: true,
        reason: suppression.reason,
        type: suppression.type,
        expires_at: suppression.expires_at,
      }
    } catch (error) {
      console.error("Error checking suppression:", error)
      return { suppressed: false }
    }
  }

  // Get recent bounce count for an email
  static async getRecentBounces(email: string, days: number): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const result = await sql`
        SELECT COUNT(*) as bounce_count
        FROM email_deliveries 
        WHERE recipient_email = ${email.toLowerCase()}
        AND status = 'bounced'
        AND bounced_at >= ${cutoffDate.toISOString()}
      `

      return Number.parseInt(result[0].bounce_count)
    } catch (error) {
      console.error("Error getting recent bounces:", error)
      return 0
    }
  }

  // Get suppression list with filtering
  static async getSuppressions(filters: {
    type?: string
    search?: string
    is_permanent?: boolean
    limit?: number
    offset?: number
  }): Promise<{ suppressions: EmailSuppression[]; total: number }> {
    try {
      const { limit, offset } = normalizePagination(filters.limit, filters.offset, {
        defaultLimit: 50,
        maxLimit: 200,
      })

      const { whereClause, params } = new SafeWhereBuilder()
        .addEquals("type", filters.type)
        .addIlikeContains("email", filters.search)
        .addEquals("is_permanent", filters.is_permanent)
        .build()

      // Get total count
      const countResult = await sql.query(`SELECT COUNT(*) as total FROM email_suppressions ${whereClause}`, params)
      const total = Number.parseInt(countResult[0].total)

      // Get suppressions with pagination
      const suppressions = await sql.query(
        `SELECT * FROM email_suppressions ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      )

      return { suppressions: suppressions as EmailSuppression[], total }
    } catch (error) {
      console.error("Error fetching suppressions:", error)
      return { suppressions: [], total: 0 }
    }
  }

  // Process unsubscribe request
  static async processUnsubscribe(email: string, reason?: string): Promise<boolean> {
    try {
      await this.addSuppression({
        email,
        type: "unsubscribe",
        reason: reason || "User requested unsubscribe",
        is_permanent: true,
      })

      // Track unsubscribe engagement if we have a delivery record
      const deliveries = await sql`
        SELECT message_id FROM email_deliveries 
        WHERE recipient_email = ${email.toLowerCase()}
        ORDER BY created_at DESC 
        LIMIT 1
      `

      if (deliveries.length > 0) {
        await EmailDeliveryTracker.trackEngagement(deliveries[0].message_id, "unsubscribe", {
          event_data: { reason: reason || "User requested unsubscribe" },
        })
      }

      return true
    } catch (error) {
      console.error("Error processing unsubscribe:", error)
      return false
    }
  }

  // Clean up expired suppressions
  static async cleanupExpiredSuppressions(): Promise<number> {
    try {
      const result = await sql`
        DELETE FROM email_suppressions 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
        AND is_permanent = false
      `

      return result.length
    } catch (error) {
      console.error("Error cleaning up expired suppressions:", error)
      return 0
    }
  }

  // Get bounce statistics
  static async getBounceStats(filters: {
    date_from?: Date
    date_to?: Date
  }): Promise<{
    total_bounces: number
    hard_bounces: number
    soft_bounces: number
    complaints: number
    bounce_rate: number
    top_bounce_reasons: Array<{ reason: string; count: number }>
  }> {
    try {
      validateDateRange(filters.date_from, filters.date_to)

      const bounceWhere = new SafeWhereBuilder()
        .addRaw("status = 'bounced'")
        .addGte("bounced_at", filters.date_from)
        .addLte("bounced_at", filters.date_to)
        .build("TRUE")

      // Get bounce counts
      const bounceStats = await sql.query(
        `
        SELECT 
          COUNT(*) as total_bounces,
          COUNT(CASE WHEN tracking_data->>'bounce_type' = 'hard' THEN 1 END) as hard_bounces,
          COUNT(CASE WHEN tracking_data->>'bounce_type' = 'soft' THEN 1 END) as soft_bounces,
          COUNT(CASE WHEN tracking_data->>'bounce_type' = 'complaint' THEN 1 END) as complaints
        FROM email_deliveries 
        ${bounceWhere.whereClause}
      `,
        bounceWhere.params,
      )

      // Get total emails sent for bounce rate calculation
      const totalWhere = new SafeWhereBuilder()
        .addGte("created_at", filters.date_from)
        .addLte("created_at", filters.date_to)
        .build()

      const totalStats = await sql.query(
        `SELECT COUNT(*) as total_sent FROM email_deliveries ${totalWhere.whereClause}`,
        totalWhere.params,
      )

      // Get top bounce reasons
      const topReasons = await sql.query(
        `
        SELECT bounce_reason as reason, COUNT(*) as count
        FROM email_deliveries 
        ${bounceWhere.whereClause}
        AND bounce_reason IS NOT NULL
        GROUP BY bounce_reason
        ORDER BY count DESC
        LIMIT 10
      `,
        bounceWhere.params,
      )

      const stats = bounceStats[0]
      const total_bounces = Number.parseInt(stats.total_bounces)
      const total_sent = Number.parseInt(totalStats[0].total_sent)

      return {
        total_bounces,
        hard_bounces: Number.parseInt(stats.hard_bounces),
        soft_bounces: Number.parseInt(stats.soft_bounces),
        complaints: Number.parseInt(stats.complaints),
        bounce_rate: total_sent > 0 ? (total_bounces / total_sent) * 100 : 0,
        top_bounce_reasons: topReasons.map((r) => ({
          reason: r.reason,
          count: Number.parseInt(r.count),
        })),
      }
    } catch (error) {
      console.error("Error fetching bounce stats:", error)
      return {
        total_bounces: 0,
        hard_bounces: 0,
        soft_bounces: 0,
        complaints: 0,
        bounce_rate: 0,
        top_bounce_reasons: [],
      }
    }
  }

  // Validate email before sending (check suppressions)
  static async validateEmailForSending(email: string): Promise<{
    canSend: boolean
    reason?: string
    suppressionType?: string
  }> {
    try {
      const suppression = await this.isEmailSuppressed(email)

      if (suppression.suppressed) {
        return {
          canSend: false,
          reason: suppression.reason || "Email is suppressed",
          suppressionType: suppression.type,
        }
      }

      return { canSend: true }
    } catch (error) {
      console.error("Error validating email for sending:", error)
      return { canSend: false, reason: "Validation error" }
    }
  }

  // Bulk import suppressions
  static async bulkImportSuppressions(
    suppressions: Array<{
      email: string
      type: "bounce" | "complaint" | "unsubscribe" | "manual"
      reason?: string
    }>,
  ): Promise<{ imported: number; errors: number }> {
    let imported = 0
    let errors = 0

    for (const suppression of suppressions) {
      try {
        const success = await this.addSuppression({
          ...suppression,
          is_permanent: true,
        })

        if (success) {
          imported++
        } else {
          errors++
        }
      } catch (error) {
        console.error(`Error importing suppression for ${suppression.email}:`, error)
        errors++
      }
    }

    return { imported, errors }
  }

  // Export suppressions
  static async exportSuppressions(type?: string): Promise<EmailSuppression[]> {
    try {
      const { whereClause, params } = new SafeWhereBuilder().addEquals("type", type).build()

      const suppressions = await sql.query(
        `SELECT * FROM email_suppressions ${whereClause} ORDER BY created_at DESC`,
        params,
      )

      return suppressions as EmailSuppression[]
    } catch (error) {
      console.error("Error exporting suppressions:", error)
      return []
    }
  }
}
