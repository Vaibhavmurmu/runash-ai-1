import { neon } from "@neondatabase/serverless"
import { randomBytes } from "crypto"
import { normalizePagination, SafeWhereBuilder, validateDateRange } from "@/lib/email-filter-utils"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailDelivery {
  id: number
  campaign_id?: number
  template_id?: number
  recipient_email: string
  recipient_name?: string
  user_id?: number
  message_id: string
  subject: string
  status: "pending" | "sent" | "delivered" | "bounced" | "failed" | "opened" | "clicked"
  sent_at?: Date
  delivered_at?: Date
  opened_at?: Date
  clicked_at?: Date
  bounced_at?: Date
  bounce_reason?: string
  error_message?: string
  tracking_data: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface DeliveryStats {
  total_sent: number
  delivered: number
  bounced: number
  opened: number
  clicked: number
  failed: number
  delivery_rate: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}

export class EmailDeliveryTracker {
  // Create delivery record when email is sent
  static async createDelivery(data: {
    recipient_email: string
    recipient_name?: string
    user_id?: number
    subject: string
    template_id?: number
    campaign_id?: number
    tracking_data?: Record<string, any>
  }): Promise<{ delivery_id: number; message_id: string }> {
    try {
      const message_id = `msg_${randomBytes(16).toString("hex")}`

      const result = await sql`
        INSERT INTO email_deliveries (
          campaign_id, template_id, recipient_email, recipient_name, 
          user_id, message_id, subject, status, tracking_data
        ) VALUES (
          ${data.campaign_id || null}, ${data.template_id || null}, 
          ${data.recipient_email}, ${data.recipient_name || null},
          ${data.user_id || null}, ${message_id}, ${data.subject}, 
          'pending', ${JSON.stringify(data.tracking_data || {})}
        ) RETURNING id
      `

      return {
        delivery_id: result[0].id,
        message_id,
      }
    } catch (error) {
      console.error("Error creating delivery record:", error)
      throw error
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(
    message_id: string,
    status: EmailDelivery["status"],
    data?: {
      bounce_reason?: string
      error_message?: string
      tracking_data?: Record<string, any>
    },
  ): Promise<boolean> {
    try {
      const statusField = `${status}_at`
      const updateFields: Record<string, any> = {
        status,
        updated_at: new Date(),
      }

      // Set timestamp for status
      if (["sent", "delivered", "opened", "clicked", "bounced"].includes(status)) {
        updateFields[statusField] = new Date()
      }

      // Add additional data
      if (data?.bounce_reason) updateFields.bounce_reason = data.bounce_reason
      if (data?.error_message) updateFields.error_message = data.error_message
      if (data?.tracking_data) updateFields.tracking_data = JSON.stringify(data.tracking_data)

      const result = await sql`
        UPDATE email_deliveries 
        SET ${sql(updateFields)}
        WHERE message_id = ${message_id}
      `

      return result.length > 0
    } catch (error) {
      console.error("Error updating delivery status:", error)
      return false
    }
  }

  // Track email engagement (opens, clicks)
  static async trackEngagement(
    message_id: string,
    event_type: "open" | "click" | "unsubscribe" | "complaint",
    data?: {
      ip_address?: string
      user_agent?: string
      event_data?: Record<string, any>
    },
  ): Promise<boolean> {
    try {
      // Get delivery record
      const deliveries = await sql`
        SELECT id FROM email_deliveries WHERE message_id = ${message_id}
      `

      if (deliveries.length === 0) return false

      const delivery_id = deliveries[0].id

      // Record engagement event
      await sql`
        INSERT INTO email_engagement (
          delivery_id, event_type, event_data, ip_address, user_agent
        ) VALUES (
          ${delivery_id}, ${event_type}, 
          ${JSON.stringify(data?.event_data || {})},
          ${data?.ip_address || null}, ${data?.user_agent || null}
        )
      `

      // Update delivery status if it's the first time
      if (event_type === "open") {
        await sql`
          UPDATE email_deliveries 
          SET status = 'opened', opened_at = NOW(), updated_at = NOW()
          WHERE message_id = ${message_id} AND opened_at IS NULL
        `
      } else if (event_type === "click") {
        await sql`
          UPDATE email_deliveries 
          SET status = 'clicked', clicked_at = NOW(), updated_at = NOW()
          WHERE message_id = ${message_id} AND clicked_at IS NULL
        `
      }

      return true
    } catch (error) {
      console.error("Error tracking engagement:", error)
      return false
    }
  }

  // Get delivery by message ID
  static async getDelivery(message_id: string): Promise<EmailDelivery | null> {
    try {
      const result = await sql`
        SELECT * FROM email_deliveries WHERE message_id = ${message_id}
      `
      return result.length > 0 ? (result[0] as EmailDelivery) : null
    } catch (error) {
      console.error("Error fetching delivery:", error)
      return null
    }
  }

  // Get deliveries with filtering
  static async getDeliveries(filters: {
    campaign_id?: number
    template_id?: number
    status?: string
    recipient_email?: string
    date_from?: Date
    date_to?: Date
    limit?: number
    offset?: number
  }): Promise<{ deliveries: EmailDelivery[]; total: number }> {
    try {
      validateDateRange(filters.date_from, filters.date_to)
      const { limit, offset } = normalizePagination(filters.limit, filters.offset, {
        defaultLimit: 50,
        maxLimit: 200,
      })

      const { whereClause, params } = new SafeWhereBuilder()
        .addEquals("campaign_id", filters.campaign_id)
        .addEquals("template_id", filters.template_id)
        .addEquals("status", filters.status)
        .addIlikeContains("recipient_email", filters.recipient_email)
        .addGte("created_at", filters.date_from)
        .addLte("created_at", filters.date_to)
        .build()

      // Get total count
      const countResult = await sql.query(`SELECT COUNT(*) as total FROM email_deliveries ${whereClause}`, params)
      const total = Number.parseInt(countResult[0].total)

      // Get deliveries with pagination
      const deliveries = await sql.query(
        `SELECT * FROM email_deliveries ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      )

      return { deliveries: deliveries as EmailDelivery[], total }
    } catch (error) {
      console.error("Error fetching deliveries:", error)
      return { deliveries: [], total: 0 }
    }
  }

  // Get delivery statistics
  static async getDeliveryStats(filters: {
    campaign_id?: number
    template_id?: number
    date_from?: Date
    date_to?: Date
  }): Promise<DeliveryStats> {
    try {
      validateDateRange(filters.date_from, filters.date_to)
      const { whereClause, params } = new SafeWhereBuilder()
        .addEquals("campaign_id", filters.campaign_id)
        .addEquals("template_id", filters.template_id)
        .addGte("created_at", filters.date_from)
        .addLte("created_at", filters.date_to)
        .build()

      const result = await sql.query(
        `
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN status = 'delivered' OR status = 'opened' OR status = 'clicked' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
          COUNT(CASE WHEN status = 'opened' OR status = 'clicked' THEN 1 END) as opened,
          COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM email_deliveries 
        ${whereClause}
      `,
        params,
      )

      const stats = result[0]
      const total_sent = Number.parseInt(stats.total_sent)
      const delivered = Number.parseInt(stats.delivered)
      const bounced = Number.parseInt(stats.bounced)
      const opened = Number.parseInt(stats.opened)
      const clicked = Number.parseInt(stats.clicked)
      const failed = Number.parseInt(stats.failed)

      return {
        total_sent,
        delivered,
        bounced,
        opened,
        clicked,
        failed,
        delivery_rate: total_sent > 0 ? (delivered / total_sent) * 100 : 0,
        open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
        click_rate: opened > 0 ? (clicked / opened) * 100 : 0,
        bounce_rate: total_sent > 0 ? (bounced / total_sent) * 100 : 0,
      }
    } catch (error) {
      console.error("Error fetching delivery stats:", error)
      return {
        total_sent: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        delivery_rate: 0,
        open_rate: 0,
        click_rate: 0,
        bounce_rate: 0,
      }
    }
  }

  // Generate tracking pixel URL for email opens
  static generateTrackingPixel(message_id: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/open/${message_id}`
  }

  // Generate tracked link URL for email clicks
  static generateTrackedLink(message_id: string, original_url: string): string {
    const encodedUrl = encodeURIComponent(original_url)
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/email/track/click/${message_id}?url=${encodedUrl}`
  }

  // Add tracking to email HTML
  static addTrackingToEmail(html: string, message_id: string): string {
    try {
      // Add tracking pixel
      const trackingPixel = `<img src="${this.generateTrackingPixel(message_id)}" width="1" height="1" style="display:none;" alt="" />`

      // Add tracking pixel before closing body tag
      let trackedHtml = html.replace(/<\/body>/i, `${trackingPixel}</body>`)

      // If no body tag, add at the end
      if (!trackedHtml.includes(trackingPixel)) {
        trackedHtml += trackingPixel
      }

      // Track all links
      trackedHtml = trackedHtml.replace(/<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi, (match, attributes, url) => {
        // Skip if already tracked or is a tracking URL
        if (url.includes("/api/email/track/") || url.includes("mailto:") || url.startsWith("#")) {
          return match
        }

        const trackedUrl = this.generateTrackedLink(message_id, url)
        return match.replace(url, trackedUrl)
      })

      return trackedHtml
    } catch (error) {
      console.error("Error adding tracking to email:", error)
      return html
    }
  }

  // Clean up old delivery records
  static async cleanupOldDeliveries(daysToKeep = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await sql`
        DELETE FROM email_deliveries 
        WHERE created_at < ${cutoffDate.toISOString()}
        AND status IN ('delivered', 'bounced', 'failed')
      `

      return result.length
    } catch (error) {
      console.error("Error cleaning up old deliveries:", error)
      return 0
    }
  }
}
