export interface TemplateVariable {
  name: string
  type: "text" | "number" | "image" | "color" | "boolean"
  defaultValue: any
  description?: string
  required?: boolean
}

export interface TemplateLayout {
  id: string
  name: string
  description: string
  category: "overlay" | "background" | "alert" | "transition" | "frame"
  thumbnailUrl: string
  previewUrl?: string
  variables: TemplateVariable[]
  html: string
  css: string
  javascript?: string
  animations?: string[]
  isPremium: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  downloadCount: number
  rating: number
  author: string
}

export interface RenderedTemplate {
  id: string
  templateId: string
  html: string
  css: string
  javascript?: string
  variables: Record<string, any>
  createdAt: string
}

export class TemplateEngine {
  private static instance: TemplateEngine
  private templates: Map<string, TemplateLayout> = new Map()
  private renderedTemplates: Map<string, RenderedTemplate> = new Map()

  private constructor() {}

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine()
    }
    return TemplateEngine.instance
  }

  // Template management
  public async loadTemplate(templateId: string): Promise<TemplateLayout | null> {
    if (this.templates.has(templateId)) {
      return this.templates.get(templateId)!
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`)
      if (!response.ok) return null

      const template = await response.json()
      this.templates.set(templateId, template)
      return template
    } catch (error) {
      console.error("Failed to load template:", error)
      return null
    }
  }

  public async getTemplates(category?: string, tags?: string[]): Promise<TemplateLayout[]> {
    try {
      const params = new URLSearchParams()
      if (category) params.append("category", category)
      if (tags) tags.forEach((tag) => params.append("tags", tag))

      const response = await fetch(`/api/templates?${params}`)
      if (!response.ok) throw new Error("Failed to fetch templates")

      const { templates } = await response.json()

      // Cache templates
      templates.forEach((template: TemplateLayout) => {
        this.templates.set(template.id, template)
      })

      return templates
    } catch (error) {
      console.error("Failed to get templates:", error)
      return []
    }
  }

  // Template rendering
  public renderTemplate(template: TemplateLayout, variables: Record<string, any> = {}): RenderedTemplate {
    const renderedId = `${template.id}-${Date.now()}`

    // Merge default values with provided variables
    const mergedVariables = { ...this.getDefaultVariables(template), ...variables }

    // Process template HTML with variables
    const processedHtml = this.processTemplateString(template.html, mergedVariables)
    const processedCss = this.processTemplateString(template.css, mergedVariables)
    const processedJs = template.javascript
      ? this.processTemplateString(template.javascript, mergedVariables)
      : undefined

    const rendered: RenderedTemplate = {
      id: renderedId,
      templateId: template.id,
      html: processedHtml,
      css: processedCss,
      javascript: processedJs,
      variables: mergedVariables,
      createdAt: new Date().toISOString(),
    }

    this.renderedTemplates.set(renderedId, rendered)
    return rendered
  }

  // Variable processing
  private getDefaultVariables(template: TemplateLayout): Record<string, any> {
    const defaults: Record<string, any> = {}
    template.variables.forEach((variable) => {
      defaults[variable.name] = variable.defaultValue
    })
    return defaults
  }

  private processTemplateString(template: string, variables: Record<string, any>): string {
    let processed = template

    // Replace {{variable}} syntax
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
      processed = processed.replace(regex, String(value))
    })

    // Handle conditional blocks {{#if variable}}...{{/if}}
    processed = this.processConditionals(processed, variables)

    // Handle loops {{#each array}}...{{/each}}
    processed = this.processLoops(processed, variables)

    return processed
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g

    return template.replace(conditionalRegex, (match, variable, content) => {
      const value = variables[variable]
      return value ? content : ""
    })
  }

  private processLoops(template: string, variables: Record<string, any>): string {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g

    return template.replace(loopRegex, (match, variable, content) => {
      const array = variables[variable]
      if (!Array.isArray(array)) return ""

      return array
        .map((item, index) => {
          let itemContent = content
          // Replace {{this}} with current item
          itemContent = itemContent.replace(/{{this}}/g, String(item))
          // Replace {{@index}} with current index
          itemContent = itemContent.replace(/{{@index}}/g, String(index))

          // If item is object, replace {{property}} with item.property
          if (typeof item === "object" && item !== null) {
            Object.entries(item).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, "g")
              itemContent = itemContent.replace(regex, String(value))
            })
          }

          return itemContent
        })
        .join("")
    })
  }

  // Template validation
  public validateTemplate(template: Partial<TemplateLayout>): string[] {
    const errors: string[] = []

    if (!template.name?.trim()) {
      errors.push("Template name is required")
    }

    if (!template.html?.trim()) {
      errors.push("Template HTML is required")
    }

    if (!template.css?.trim()) {
      errors.push("Template CSS is required")
    }

    if (!template.category) {
      errors.push("Template category is required")
    }

    // Validate HTML syntax
    if (template.html) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(template.html, "text/html")
        const parserErrors = doc.querySelectorAll("parsererror")
        if (parserErrors.length > 0) {
          errors.push("Invalid HTML syntax")
        }
      } catch (error) {
        errors.push("Invalid HTML syntax")
      }
    }

    return errors
  }

  // Template preview
  public generatePreview(template: TemplateLayout, variables?: Record<string, any>): string {
    const rendered = this.renderTemplate(template, variables)

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
            .template-container { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 1px solid #e2e8f0; 
              border-radius: 8px; 
              overflow: hidden;
            }
            ${rendered.css}
          </style>
        </head>
        <body>
          <div class="template-container">
            ${rendered.html}
          </div>
          ${rendered.javascript ? `<script>${rendered.javascript}</script>` : ""}
        </body>
      </html>
    `
  }

  // Cleanup
  public clearRenderedTemplate(id: string): void {
    this.renderedTemplates.delete(id)
  }

  public getRenderedTemplate(id: string): RenderedTemplate | null {
    return this.renderedTemplates.get(id) || null
  }
}
