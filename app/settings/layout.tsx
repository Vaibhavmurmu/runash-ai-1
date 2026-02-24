import type React from "react"
import Link from "next/link"
import { DashboardLayoutFrame } from "@/components/dashboard/dashboard-layout-frame"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getServerAuthSession } from "@/lib/auth/session"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return (
      <DashboardLayoutFrame>
        <div className="flex w-full items-center justify-center py-14">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>Sign in to access account settings</CardTitle>
              <CardDescription>
                Your account pages are protected. Sign in to manage your profile, preferences, and billing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/login?callbackUrl=/settings">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayoutFrame>
    )
  }

  return <DashboardLayoutFrame>{children}</DashboardLayoutFrame>
}
