import { redirect } from "next/navigation"

export default function SellerDashboardDeprecatedRoute() {
  redirect("/dashboard?module=seller")
}
