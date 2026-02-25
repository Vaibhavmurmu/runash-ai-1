import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardLiveSessionResumePage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Resume live session flow</CardTitle>
          <CardDescription>Continue from your most recent stream setup context.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/stream?resume=last-live">Resume in Streaming Studio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
