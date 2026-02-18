import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface EmailTemplate {
  id: number
  name: string
  subject: string
  html_content: string
  text_content?: string
  category: string
  description?: string
  variables: Array<{ name: string; description: string }>
  is_active: boolean
  is_system: boolean
  created_by?: number
  created_at: Date
  updated_at: Date
  version: number
}

export interface EmailTemplateVersion {
  id: number
  template_id: number
  version_number: number
  subject: string
  html_content: string
  text_content?: string
  variables: Array<{ name: string; description: string }>
  created_by?: number
  created_at: Date
  change_notes?: string
}

export class EmailTemplateManager {
  // Get all templates with filtering
  static async getTemplates(
    filters: {
      category?: string
      is_active?: boolean
      search?: string
      limit?: number
      offset?: number
    } = {},
  ): Promise<{ templates: EmailTemplate[]; total: number }> {
    try {
      let whereClause = "WHERE 1=1"
      const params: any[] = []
      let paramIndex = 1

      if (filters.category) {
        whereClause += ` AND category = $${paramIndex}`
        params.push(filters.category)
        paramIndex++
      }

      if (filters.is_active !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`
        params.push(filters.is_active)
        paramIndex++
      }

      if (filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR subject ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      // Get total count
      const countResult = await sql`
        SELECT COUNT(*) as total FROM email_templates ${sql.unsafe(whereClause)}
      `
      const total = Number.parseInt(countResult[0].total)

      // Get templates with pagination
      const limit = filters.limit || 20
      const offset = filters.offset || 0

      const templates = await sql`
        SELECT * FROM email_templates 
        ${sql.unsafe(whereClause)}
        ORDER BY updated_at DESC 
        LIMIT ${limit} OFFSET ${offset}
      `

      return { templates: templates as EmailTemplate[], total }
    } catch (error) {
      console.error("Error fetching email templates:", error)
      throw error
    }
  }

  // Get template by ID or name
  static async getTemplate(identifier: string | number): Promise<EmailTemplate | null> {
    try {
      const templates =
        typeof identifier === "number"
          ? await sql`SELECT * FROM email_templates WHERE id = ${identifier}`
          : await sql`SELECT * FROM email_templates WHERE name = ${identifier}`

      return templates.length > 0 ? (templates[0] as EmailTemplate) : null
    } catch (error) {
      console.error("Error fetching email template:", error)
      return null
    }
  }

  // Create new template
  static async createTemplate(data: {
    name: string
    subject: string
    html_content: string
    text_content?: string
    category?: string
    description?: string
    variables?: Array<{ name: string; description: string }>
    created_by?: number
  }): Promise<EmailTemplate | null> {
    try {
      const result = await sql`
        INSERT INTO email_templates (
          name, subject, html_content, text_content, category, 
          description, variables, created_by
        ) VALUES (
          ${data.name}, ${data.subject}, ${data.html_content}, 
          ${data.text_content || null}, ${data.category || "general"},
          ${data.description || null}, ${JSON.stringify(data.variables || [])},
          ${data.created_by || null}
        ) RETURNING *
      `

      if (result.length > 0) {
        // Create initial version
        await this.createTemplateVersion(result[0].id, {
          subject: data.subject,
          html_content: data.html_content,
          text_content: data.text_content,
          variables: data.variables || [],
          created_by: data.created_by,
          change_notes: "Initial template creation",
        })

        return result[0] as EmailTemplate
      }
      return null
    } catch (error) {
      console.error("Error creating email template:", error)
      throw error
    }
  }

  // Update template
  static async updateTemplate(
    id: number,
    data: Partial<EmailTemplate>,
    updatedBy?: number,
    changeNotes?: string,
  ): Promise<EmailTemplate | null> {
    try {
      // Get current template for version history
      const currentTemplate = await this.getTemplate(id)
      if (!currentTemplate) return null

      const result = await sql`
        UPDATE email_templates 
        SET 
          name = ${data.name || currentTemplate.name},
          subject = ${data.subject || currentTemplate.subject},
          html_content = ${data.html_content || currentTemplate.html_content},
          text_content = ${data.text_content || currentTemplate.text_content},
          category = ${data.category || currentTemplate.category},
          description = ${data.description || currentTemplate.description},
          variables = ${JSON.stringify(data.variables || currentTemplate.variables)},
          is_active = ${data.is_active !== undefined ? data.is_active : currentTemplate.is_active},
          version = version + 1,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `

      if (result.length > 0) {
        // Create version history
        await this.createTemplateVersion(id, {
          subject: data.subject || currentTemplate.subject,
          html_content: data.html_content || currentTemplate.html_content,
          text_content: data.text_content || currentTemplate.text_content,
          variables: data.variables || currentTemplate.variables,
          created_by: updatedBy,
          change_notes: changeNotes || "Template updated",
        })

        return result[0] as EmailTemplate
      }
      return null
    } catch (error) {
      console.error("Error updating email template:", error)
      throw error
    }
  }

  // Delete template
  static async deleteTemplate(id: number): Promise<boolean> {
    try {
      // Don't allow deletion of system templates
      const template = await this.getTemplate(id)
      if (template?.is_system) {
        throw new Error("Cannot delete system templates")
      }

      const result = await sql`DELETE FROM email_templates WHERE id = ${id} AND is_system = false`
      return result.length > 0
    } catch (error) {
      console.error("Error deleting email template:", error)
      throw error
    }
  }

  // Create template version
  static async createTemplateVersion(
    templateId: number,
    data: {
      subject: string
      html_content: string
      text_content?: string
      variables: Array<{ name: string; description: string }>
      created_by?: number
      change_notes?: string
    },
  ): Promise<void> {
    try {
      // Get next version number
      const versionResult = await sql`
        SELECT COALESCE(MAX(version_number), 0) + 1 as next_version 
        FROM email_template_versions 
        WHERE template_id = ${templateId}
      `
      const nextVersion = versionResult[0].next_version

      await sql`
        INSERT INTO email_template_versions (
          template_id, version_number, subject, html_content, text_content,
          variables, created_by, change_notes
        ) VALUES (
          ${templateId}, ${nextVersion}, ${data.subject}, ${data.html_content},
          ${data.text_content || null}, ${JSON.stringify(data.variables)},
          ${data.created_by || null}, ${data.change_notes || null}
        )
      `
    } catch (error) {
      console.error("Error creating template version:", error)
      throw error
    }
  }

  // Get template versions
  static async getTemplateVersions(templateId: number): Promise<EmailTemplateVersion[]> {
    try {
      const versions = await sql`
        SELECT * FROM email_template_versions 
        WHERE template_id = ${templateId}
        ORDER BY version_number DESC
      `
      return versions as EmailTemplateVersion[]
    } catch (error) {
      console.error("Error fetching template versions:", error)
      return []
    }
  }

  // Render template with variables
  static renderTemplate(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): {
    subject: string
    html: string
    text?: string
  } {
    try {
      let subject = template.subject
      let html = template.html_content
      let text = template.text_content

      // Replace variables in subject, html, and text
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        const stringValue = String(value || "")

        subject = subject.replace(new RegExp(placeholder, "g"), stringValue)
        html = html.replace(new RegExp(placeholder, "g"), stringValue)
        if (text) {
          text = text.replace(new RegExp(placeholder, "g"), stringValue)
        }
      })

      return { subject, html, text }
    } catch (error) {
      console.error("Error rendering template:", error)
      throw error
    }
  }

  // Get template categories
  static async getCategories(): Promise<string[]> {
    try {
      const result = await sql`
        SELECT DISTINCT category FROM email_templates 
        WHERE category IS NOT NULL 
        ORDER BY category
      `
      return result.map((row) => row.category)
    } catch (error) {
      console.error("Error fetching template categories:", error)
      return []
    }
  }

  // Validate template variables
  static validateTemplate(
    htmlContent: string,
    textContent?: string,
  ): {
    variables: string[]
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const variableRegex = /\{\{([^}]+)\}\}/g
    const htmlVariables = new Set<string>()
    const textVariables = new Set<string>()

    // Extract variables from HTML
    let match
    while ((match = variableRegex.exec(htmlContent)) !== null) {
      htmlVariables.add(match[1].trim())
    }

    // Extract variables from text if provided
    if (textContent) {
      variableRegex.lastIndex = 0
      while ((match = variableRegex.exec(textContent)) !== null) {
        textVariables.add(match[1].trim())
      }

      // Check for variable consistency between HTML and text
      const htmlVarArray = Array.from(htmlVariables)
      const textVarArray = Array.from(textVariables)

      const missingInText = htmlVarArray.filter((v) => !textVariables.has(v))
      const missingInHtml = textVarArray.filter((v) => !htmlVariables.has(v))

      if (missingInText.length > 0) {
        errors.push(`Variables missing in text version: ${missingInText.join(", ")}`)
      }
      if (missingInHtml.length > 0) {
        errors.push(`Variables missing in HTML version: ${missingInHtml.join(", ")}`)
      }
    }

    const allVariables = Array.from(new Set([...htmlVariables, ...textVariables]))

    return {
      variables: allVariables,
      isValid: errors.length === 0,
      errors,
    }
  }
}
