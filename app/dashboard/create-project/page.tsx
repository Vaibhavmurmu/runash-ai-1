import type { Metadata } from "next"
import { createDashboardMetadata } from "../metadata"
import { CreateProjectWizard } from "@/components/dashboard/projects/create-project-wizard"

export const metadata: Metadata = createDashboardMetadata({
  title: "Create Project",
  description: "Create a canonical project with shared editor, streaming, and chat context.",
  path: "/dashboard/create-project",
})

export default function CreateProjectPage() {
  return <CreateProjectWizard />
}
