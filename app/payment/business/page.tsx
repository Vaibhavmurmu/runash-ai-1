import Link from "next/link"
import { ArrowRight, Building2, Link2, Receipt, ShieldCheck, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BusinessPaymentPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl inline-flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Business Payment Surface
          </CardTitle>
          <CardDescription>
            Enterprise-oriented control plane for advanced analytics, recurring payments, compliance workflows, and
            multi-user operations.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Configure org profile and billing ownership</p>
            <p>• Enable recurring payments and subscription controls</p>
            <p>• Review transaction reporting and reconciliation</p>
            <p>• Invite team users with role-based access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational actions</CardTitle>
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
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/payment/subscription">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Manage subscription</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/contact-team">
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Business onboarding support</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
