"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BadgeCheck, Building2, CreditCard, Landmark, Leaf, Lock, QrCode, ShieldCheck, ShoppingCart, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CartSummary from "@/components/cart/cart-summary"
import SustainabilityMetrics from "@/components/cart/sustainability-metrics"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, Leaf, Lock, QrCode, ShoppingCart, Smartphone } from "lucide-react"
import { useCart } from "@/contexts/cart-context"

type PaymentMethod = "card" | "upi" | "bank"

export default function CheckoutPage() {
  const router = useRouter()
  const { state } = useCart()
  const { cart, totals } = state

  const [mounted, setMounted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showViewDetails, setShowViewDetails] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [couponCode, setCouponCode] = useState("")
  const [saveInfo, setSaveInfo] = useState(true)
  const [isBusinessPurchase, setIsBusinessPurchase] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    nameOnCard: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    upiId: "",
    bankAccountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    phone: "",
    companyName: "",
    gstin: "",
    businessAddress: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card")
  const [buyAsBusiness, setBuyAsBusiness] = useState(false)
  const [saveForFastCheckout, setSaveForFastCheckout] = useState(true)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showUpiAppsDialog, setShowUpiAppsDialog] = useState(false)
  const [showActionSuccessDialog, setShowActionSuccessDialog] = useState(false)

  // Ensure component is mounted before accessing cart
  useEffect(() => {
    setMounted(true)
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("userProfile") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const discount = couponCode.trim().toUpperCase() === "RUNASH10" ? totals.subtotal * 0.1 : 0
  const finalTotal = Math.max(totals.total - discount, 0)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = "Email is required"
    if (!formData.firstName) newErrors.firstName = "First name is required"
    if (!formData.lastName) newErrors.lastName = "Last name is required"
    if (!formData.address) newErrors.address = "Address is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.zipCode) newErrors.zipCode = "ZIP code is required"
    if (paymentMethod === "card") {
      if (!formData.cardNumber) newErrors.cardNumber = "Card number is required"
      if (!formData.expiryDate) newErrors.expiryDate = "Expiry date is required"
      if (!formData.cvv) newErrors.cvv = "CVV is required"
    }
    if (!acceptTerms) newErrors.acceptTerms = "Please accept terms to continue"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    const order = {
      id: `order_${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        phone: formData.phone,
      },
      payment: {
        method: paymentMethod,
        cardNumber: paymentMethod === "card" && formData.cardNumber ? `**** **** **** ${formData.cardNumber.slice(-4)}` : "",
        nameOnCard: formData.nameOnCard,
        saveForFastCheckout,
        buyAsBusiness,
      },
      items: cart.items,
      totals: {
        ...totals,
        discount,
        total: finalTotal,
      },
    }

    try {
      sessionStorage.setItem("pendingOrder", JSON.stringify(order))
    } catch {
      // ignore
    }

    setShowConfirmDialog(true)
  }

  const proceedToPayment = () => {
    setProcessing(true)
    router.push("/payment/runash-pay")
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>

          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="rounded-full bg-gray-100 p-6 mb-6">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add products to continue with checkout.</p>
            <Link href="/chat">
              <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const paymentOptions: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode; hint: string }> = [
    { id: "card", label: "Card", icon: <WalletCards className="h-4 w-4" />, hint: "Credit / debit card" },
    { id: "upi", label: "UPI", icon: <QrCode className="h-4 w-4" />, hint: "UPI ID + app handoff" },
    { id: "bank", label: "Bank", icon: <Landmark className="h-4 w-4" />, hint: "Bank transfer details" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/chat">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </Link>

        <div className="mb-6 flex flex-col gap-3">
          <h1 className="text-3xl font-bold">RunAsh Checkout</h1>
          <p className="text-gray-600">Simple, professional checkout for B2B subscription and B2C live commerce.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" /> PCI-safe checkout
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
              <Lock className="h-3.5 w-3.5" /> Encrypted end-to-end
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Secure Payment
            </span>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Card className="border-orange-100">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-orange-600">Version 1</p>
              <p className="text-sm font-medium mt-1">Subscription Checkout</p>
              <p className="text-xs text-gray-600 mt-1">Consent + saved information blocks for recurring billing.</p>
            </CardContent>
          </Card>
          <Card className="border-blue-100">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-blue-600">Version 3</p>
              <p className="text-sm font-medium mt-1">Live Commerce Checkout</p>
              <p className="text-xs text-gray-600 mt-1">Fast UPI/QR/app handoff for instant B2C conversion.</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-emerald-600">Version 4</p>
              <p className="text-sm font-medium mt-1">B2B Invoice Checkout</p>
              <p className="text-xs text-gray-600 mt-1">Business details + GST fields for compliant invoicing.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={formData.state} onChange={(e) => handleInputChange("state", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP</Label>
                    <Input id="zipCode" value={formData.zipCode} onChange={(e) => handleInputChange("zipCode", e.target.value)} />
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Method</span>
                  <Lock className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-lg border p-3 text-left transition ${paymentMethod === "card" ? "border-orange-500 bg-orange-50" : "border-gray-200"}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4" /> Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`rounded-lg border p-3 text-left transition ${paymentMethod === "upi" ? "border-orange-500 bg-orange-50" : "border-gray-200"}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium"><Smartphone className="h-4 w-4" /> UPI</span>
                  </button>
                </div>

                {paymentMethod === "card" ? (
                  <>
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                      {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={formData.expiryDate}
                          onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                          placeholder="MM/YY"
                          required
                        />
                        {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange("cvv", e.target.value)}
                          placeholder="123"
                          required
                        />
                        {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input
                        id="nameOnCard"
                        value={formData.nameOnCard}
                        onChange={(e) => handleInputChange("nameOnCard", e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                    <p className="text-sm text-gray-700">Pay instantly with any UPI app. We will open your preferred app after confirmation.</p>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowUpiAppsDialog(true)}>
                      <QrCode className="mr-2 h-4 w-4" /> Choose UPI App
                    </Button>
                  </div>
                )}

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="saveInfo" checked={saveForFastCheckout} onCheckedChange={(checked) => setSaveForFastCheckout(Boolean(checked))} />
                    <Label htmlFor="saveInfo" className="text-sm">Save my information for faster checkout</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="businessBuy" checked={buyAsBusiness} onCheckedChange={(checked) => setBuyAsBusiness(Boolean(checked))} />
                    <Label htmlFor="businessBuy" className="text-sm">I&apos;m purchasing as a business</Label>
                  </div>
                  {buyAsBusiness && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <Input placeholder="Business name" />
                      <Input placeholder="GSTIN" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-lg bg-orange-50 p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox id="acceptTerms" checked={acceptTerms} onCheckedChange={(checked) => {
                      setAcceptTerms(Boolean(checked))
                      setErrors((prev) => ({ ...prev, acceptTerms: "" }))
                    }} />
                    <Label htmlFor="acceptTerms" className="text-sm font-normal leading-5">
                      You&apos;ll be charged the amount shown and agree to RunAsh Terms and Privacy Policy.
                    </Label>
                  </div>
                  {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <SustainabilityMetrics metrics={cart.sustainabilityMetrics} />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Order Summary</CardTitle>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowViewDetails((prev) => !prev)}>
                    {showViewDetails ? "Hide details" : "View details"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showViewDetails && (
                  <div className="max-h-64 overflow-y-auto space-y-3 rounded-md border border-gray-200 p-3">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product.image || "/placeholder.svg?height=48&width=48"}
                            alt={item.product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium">{item.product.name}</p>
                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">
                          ${((item.selectedVariant?.price || item.product.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                  <Label htmlFor="couponCode">Coupon</Label>
                  <Input
                    id="couponCode"
                    placeholder="RUNASH10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="bg-white"
                  />
                  {discount > 0 && <p className="text-xs text-emerald-700">Coupon highlight: RUNASH10 applied.</p>}
                </div>

                <CartSummary totals={totals} />

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>Discount</span>
                    <span>- ${discount.toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-base font-semibold">
                  <span>Payable now</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>

                <div className="rounded-md border border-gray-200 p-3 text-xs text-gray-600 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      id="acceptTerms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked)
                        if (e.target.checked) setErrors((prev) => ({ ...prev, terms: "" }))
                      }}
                      className="mt-0.5 h-4 w-4"
                    />
                    <Label htmlFor="acceptTerms" className="font-normal leading-5">
                      By placing your order, you agree to RunAsh's Terms of Service and Privacy Policy. Your order will be processed immediately.
                    </Label>
                  </div>
                  {errors.terms && <p className="text-red-500">{errors.terms}</p>}
                </div>

                <form onSubmit={handleSubmit}>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white"
                  >
                    {processing ? "Processing..." : paymentMethod === "upi" ? `Pay with UPI - $${totals.total.toFixed(2)}` : `Complete Order - $${totals.total.toFixed(2)}`}
                  </Button>
                </form>

                <div className="grid gap-2 text-xs text-gray-600">
                  <p className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Your payment information is encrypted and secure.</p>
                  <p>We never store your full card details. RunAsh uses industry-standard security to protect your information.</p>
                  <p className="inline-flex items-center gap-1"><Leaf className="h-3 w-3 text-green-600" /> Carbon-neutral delivery where available.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/45" onClick={() => setShowConfirmDialog(false)} />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold">Review your order</h3>
              <p className="mt-1 text-sm text-gray-600">Please review before secure payment handoff.</p>

              <div className="mt-4 rounded-md border border-gray-200 p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Flow</span><span>{paymentMethod.toUpperCase()}</span></div>
                <div className="flex justify-between"><span>Mode</span><span>{isBusinessPurchase ? "B2B" : "B2C"}</span></div>
                <div className="flex justify-between"><span>Items</span><span>{cart.items.length}</span></div>
                <div className="flex justify-between"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div>
              </div>

              <p className="mt-4 text-xs text-gray-600">
                Secure Payment: encrypted end-to-end, PCI-safe checkout, and consent captured for subscription billing.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Edit</Button>
                <Button onClick={proceedToPayment}>{processing ? "Please wait..." : "Proceed to Payment"}</Button>
              </div>
            </div>
          </div>
        )}

        {showUpiAppsDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowUpiAppsDialog(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full p-6 z-10">
              <h3 className="text-2xl font-semibold text-center mb-2">Authorize payment with your app</h3>
              <p className="text-sm text-gray-600 text-center mb-5">Please select an app to complete the payment.</p>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {["GPay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "MobiKwik", "CRED", "Kiwi"].map((appName) => (
                  <Button key={appName} type="button" variant="outline" className="h-16 text-xs" onClick={() => {
                    setShowUpiAppsDialog(false)
                    setShowActionSuccessDialog(true)
                  }}>
                    {appName}
                  </Button>
                ))}
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={() => {
                setShowUpiAppsDialog(false)
                setShowActionSuccessDialog(true)
              }}>
                <Landmark className="mr-2 h-4 w-4" /> Pay with QR code instead
              </Button>
            </div>
          </div>
        )}

        {showActionSuccessDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowActionSuccessDialog(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-sm w-full p-8 z-10 text-center space-y-3">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
              <h3 className="text-2xl font-semibold">Action Successful</h3>
              <p className="text-sm text-gray-600">Your UPI app is ready. Continue to complete this checkout securely.</p>
              <Button onClick={() => setShowActionSuccessDialog(false)}>Continue</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
