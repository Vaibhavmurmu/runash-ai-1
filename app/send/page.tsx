import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function RoutePage() {
  return (
    <main className="container mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">RunAsh Pay action route</h1>
      <p className="text-muted-foreground">This route is wired from the RunAsh Pay dashboard for production navigation flows.</p>
      <Button asChild variant="outline">
        <Link href="/payment/runash-pay">Back to RunAsh Pay</Link>
      </Button>
    </main>
  )
}
