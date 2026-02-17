import { type NextRequest, NextResponse } from "next/server"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templateId = params.id

    // In production, fetch from database
    // For now, return mock data based on ID
    const mockTemplate = {
      id: templateId,
      name: "Sample Template",
      description: "A sample template for demonstration",
      category: "overlay",
      thumbnailUrl: "/templates/sample-thumb.jpg",
      variables: [
        { name: "title", type: "text", defaultValue: "Sample Title", description: "Main title" },
        { name: "color", type: "color", defaultValue: "#f97316", description: "Primary color" },
      ],
      html: `<div class="sample-template"><h1>{{title}}</h1></div>`,
      css: `.sample-template { color: {{color}}; }`,
      isPremium: false,
      tags: ["sample"],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      downloadCount: 0,
      rating: 0,
      author: "System",
    }

    return NextResponse.json(mockTemplate)
  } catch (error) {
    console.error("Get template error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
