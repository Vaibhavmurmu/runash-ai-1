import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

export function TeamInvite() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Invite Team Members
        </CardTitle>
        <CardDescription>
          Accelerate your streaming business with team collaboration, advanced analytics, and enterprise-grade security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Invite Your Team</Button>
      </CardContent>
    </Card>
  )
}
