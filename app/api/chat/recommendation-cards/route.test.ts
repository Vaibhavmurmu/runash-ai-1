import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/chat/recommendation-cards/route"

const payload = {
  intent: "recipe",
  userInput: "easy meal recipe",
  userPreferences: {
    dietaryRestrictions: [],
    sustainabilityPriority: "medium",
    budgetRange: [0, 200],
    preferredCategories: [],
    cookingSkillLevel: "intermediate",
  },
}

test("recommendation cards API returns recipe metadata", async () => {
  const request = new NextRequest("http://localhost/api/chat/recommendation-cards", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  })

  const response = await POST(request)
  assert.equal(response.status, 200)
  const json = (await response.json()) as { metadata?: { recipes?: Array<{ image: string | null }> } }
  assert.ok((json.metadata?.recipes?.length ?? 0) > 0)
  assert.equal(json.metadata?.recipes?.[0]?.image, null)
})

test("recommendation cards API validates request body", async () => {
  const request = new NextRequest("http://localhost/api/chat/recommendation-cards", {
    method: "POST",
    body: JSON.stringify({ intent: "recipe" }),
    headers: { "content-type": "application/json" },
  })

  const response = await POST(request)
  assert.equal(response.status, 400)
})
