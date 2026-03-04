import { type NextRequest, NextResponse } from "next/server"
import { requireAdminAuthorization } from "@/lib/auth-middleware"
import { EmailContactManager } from "@/lib/email-contacts"
import { importEmailContacts } from "@/lib/email-contact-import"

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuthorization(request, {
    requiredPermissions: ["admin:settings"],
    auditEvent: "admin.email.contacts.import",
  })
  if (!auth.success) return auth.response

  let importJobId: number | null = null

  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const csvText = await file.text()
    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 })
    }

    const defaultStatus = formData.get("defaultStatus")?.toString() || "subscribed"
    const source = formData.get("source")?.toString() || "csv_import"
    const updateExisting = formData.get("updateExisting")?.toString() === "true"

    const parsedUserId = Number(auth.session.user.id)
    const job = await EmailContactManager.createImportJob({
      file_name: file.name,
      created_by: Number.isFinite(parsedUserId) ? parsedUserId : undefined,
    })
    importJobId = job.id

    const summary = await importEmailContacts({
      csvText,
      defaultStatus: EmailContactManager.isValidStatus(defaultStatus) ? defaultStatus : "subscribed",
      source,
      updateExisting,
    })

    const finalized = await EmailContactManager.finalizeImportJob(job.id, {
      status: "completed",
      ...summary,
      summary: {
        fileName: file.name,
        updateExisting,
        source,
        errors: summary.errors.slice(0, 50),
      },
    })

    return NextResponse.json({ success: true, data: { job: finalized, summary } })
  } catch (error) {
    if (importJobId) {
      await EmailContactManager.finalizeImportJob(importJobId, {
        status: "failed",
        total_rows: 0,
        created_count: 0,
        updated_count: 0,
        duplicate_count: 0,
        invalid_count: 0,
        summary: { error: (error as Error).message },
      })
    }

    console.error("Error importing email contacts:", error)
    return NextResponse.json({ error: "Failed to import email contacts" }, { status: 500 })
  }
}
