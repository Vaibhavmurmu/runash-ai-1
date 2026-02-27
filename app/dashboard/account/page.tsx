import type { Metadata } from "next"
import Link from "next/link"
import { UserRound } from "lucide-react"
import { getServerAuthSession } from "@/lib/auth/session"
import { createDashboardMetadata } from "../metadata"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = createDashboardMetadata({
  title: "Account",
  description: "Review your profile identity and access account settings from your RunAsh dashboard workspace.",
  path: "/dashboard/account",
})

export default async function DashboardAccountPage() {
  const session = await getServerAuthSession()
  const user = session?.user

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile & account settings</h1>
        <p className="text-sm text-muted-foreground">Review your real account identity and open settings sections quickly.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            Account overview
          </CardTitle>
          <CardDescription>Identity from current authenticated server session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() ?? "RA"}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{user?.name ?? "Unknown user"}</p>
              <p className="text-muted-foreground">{user?.email ?? "No email on session"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/settings/profile">Open profile settings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings/sessions">Open sessions</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/settings">Open settings overview</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
