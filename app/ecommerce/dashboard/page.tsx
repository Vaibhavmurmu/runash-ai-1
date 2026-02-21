import { redirect } from "next/navigation"

export default function EcommerceDashboardDeprecatedRoute() {
  redirect("/dashboard?module=store")
}
