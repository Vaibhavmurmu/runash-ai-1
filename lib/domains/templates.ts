import { z } from "zod"
import type { CreateTemplateInput, TemplateScope, TemplateVariable } from "@/lib/repositories/templates"

const templateVariableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "number", "image", "color", "boolean"]),
  defaultValue: z.unknown(),
  description: z.string().min(1).optional(),
  required: z.boolean().optional(),
})

const scopeSchema = z.enum(["public", "workspace", "private", "premium"])

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).max(400).optional().nullable(),
  category: z.string().trim().min(1),
  thumbnailUrl: z.string().url().optional().nullable(),
  variables: z.array(templateVariableSchema).optional(),
  html: z.string().min(1),
  css: z.string().min(1),
  javascript: z.string().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional(),
  isPremium: z.boolean().optional(),
  scope: scopeSchema.optional(),
})

export function parseCreateTemplateInput(payload: unknown): CreateTemplateInput {
  const parsed = createTemplateSchema.parse(payload)

  return {
    ...parsed,
    variables: (parsed.variables ?? []) as TemplateVariable[],
    tags: parsed.tags ?? [],
    scope: parsed.scope as TemplateScope | undefined,
  }
}
