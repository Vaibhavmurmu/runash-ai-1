import { NextResponse } from "next/server"
import { deleteCustomDashboard, getCustomDashboardById, updateCustomDashboard } from "@/lib/custom-dashboard-service"
import type { DashboardLayout, DashboardWidget } from "@/types/custom-dashboard"
import { getServerAuthSession } from "@/lib/auth/session"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const dashboard = await getCustomDashboardById(id, session.user.id)
    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    return NextResponse.json({ dashboard })
  } catch (error) {
    console.error("Custom dashboards [id] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = (await req.json()) as {
      name?: string
      description?: string
      widgets?: DashboardWidget[]
      layout?: DashboardLayout
      isShared?: boolean
      sharedWith?: string[]
    }

    const dashboard = await updateCustomDashboard(id, session.user.id, {
      name: body.name,
      description: body.description,
      widgets: body.widgets,
      layout: body.layout,
      isShared: body.isShared,
      sharedWith: body.sharedWith,
    })

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ dashboard })
  } catch (error) {
    console.error("Custom dashboards [id] PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const deleted = await deleteCustomDashboard(id, session.user.id)
    if (!deleted) {
      return NextResponse.json({ error: "Dashboard not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Custom dashboards [id] DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
