import Link from "next/link"
import { ArrowRight, Link2, Receipt, Rocket, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function StartupPaymentPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl inline-flex items-center gap-2">
            <Rocket className="h-6 w-6" /> Startup Payment Surface
          </CardTitle>
          <CardDescription>
            Built for fast onboarding with core payment features: links, standard reports, basic dashboard, and
            account setup.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Launch checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Complete account setup and team profile</p>
            <p>• Generate your first payment link</p>
            <p>• Create a test payment intent</p>
            <p>• Track daily transactions and conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-between">
              <Link href="/ecommerce/payments">
                <span className="inline-flex items-center gap-2"><Link2 className="h-4 w-4" />Create payment link</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-between">
              <Link href="/payment/runash-pay#create-intent">
                <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" />Create payment intent</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/payment/dashboard">
                <span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4" />View transactions</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
