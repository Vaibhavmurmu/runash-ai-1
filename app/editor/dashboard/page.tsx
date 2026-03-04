import { redirect } from "next/navigation"

export default function EditorDashboardDeprecatedRoute() {
  redirect("/dashboard?module=editor")
}
