"use client"

import Link from "next/link"
import { UserRound } from "lucide-react"
import { useAuthSession } from "@/lib/auth/access-client"
import { DashboardStatePattern, type DashboardViewState } from "@/components/dashboard/dashboard-state-pattern"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardAccountPage() {
  const { data: session, isPending, refetch } = useAuthSession()
  const user = session?.user

  const state: DashboardViewState = isPending ? "loading" : user ? "ready" : "error"

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile & account settings</h1>
        <p className="text-sm text-muted-foreground">Review your real account identity and open settings sections quickly.</p>
      </div>

      <DashboardStatePattern
        state={state}
        title="Profile unavailable"
        description="We couldn't load your account profile from the current session."
        onRetry={() => void refetch()}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Account overview
            </CardTitle>
            <CardDescription>Live identity from current authenticated session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar>
                {user?.image ? <AvatarImage src={user.image} alt={user.name ?? "User"} /> : null}
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
      </DashboardStatePattern>
    </div>
  )
}
