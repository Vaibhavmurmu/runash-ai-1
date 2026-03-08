"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BadgeCheck, CreditCard, Leaf, Lock, QrCode, ShieldCheck, ShoppingCart, Smartphone } from "lucide-react"

import CartSummary from "@/components/cart/cart-summary"
import SustainabilityMetrics from "@/components/cart/sustainability-metrics"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart-context"

type PaymentMethod = "card" | "upi"

export default function CheckoutPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { state } = useCart()
  const { cart, totals } = state

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    upiId: "",
    gstNumber: "",
    businessName: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [saveInfo, setSaveInfo] = useState(true)
  const [isBusinessPurchase, setIsBusinessPurchase] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("userProfile") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // no-op
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  const discountAmount = useMemo(() => totals.subtotal * 0.1, [totals.subtotal])

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
      if (!formData.nameOnCard) newErrors.nameOnCard = "Cardholder name is required"
    }

    if (paymentMethod === "upi" && !formData.upiId) {
      newErrors.upiId = "UPI ID is required"
    }

    if (isBusinessPurchase && !formData.gstNumber) {
      newErrors.gstNumber = "GST number is required for business checkout"
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "Please accept terms to continue"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
      },
      payment: {
        method: paymentMethod,
        cardNumber: formData.cardNumber ? `**** **** **** ${formData.cardNumber.slice(-4)}` : "",
        nameOnCard: formData.nameOnCard,
        upiId: paymentMethod === "upi" ? formData.upiId : "",
        saveInfo,
        isBusinessPurchase,
        gstNumber: isBusinessPurchase ? formData.gstNumber : "",
      },
      items: cart.items,
      totals,
    }

    try {
      sessionStorage.setItem("pendingOrder", JSON.stringify(order))
    } catch {
      // no-op
    }

    setShowConfirmDialog(true)
  }

  const proceedToPayment = () => {
    setProcessing(true)
    router.push("/payment/runash-pay")
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>

          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-6">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add some organic products to get started with your sustainable shopping journey.</p>
            <Link href="/chat">
              <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/80 to-emerald-50/30 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Checkout</h1>
              <p className="text-gray-600 mt-2">Fast, secure and greener payments with card or UPI support</p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> PCI-safe checkout
            </div>
          </div>
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
                  <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="your@email.com" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} placeholder="123 Main Street" />
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
                    <Input id="state" value={formData.state} onChange={(e) => handleInputChange("state", e.target.value)} placeholder="CA" />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input id="zipCode" value={formData.zipCode} onChange={(e) => handleInputChange("zipCode", e.target.value)} placeholder="12345" />
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    Payment Method
                  </span>
                  <span className="text-xs font-medium text-gray-500">Encrypted end-to-end</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-lg border p-3 text-left transition ${
                      paymentMethod === "card" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <CreditCard className="h-4 w-4" /> Card
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Visa, Mastercard, RuPay</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`rounded-lg border p-3 text-left transition ${
                      paymentMethod === "upi" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Smartphone className="h-4 w-4" /> UPI
                    </div>
                    <p className="text-xs text-gray-500 mt-1">GPay, PhonePe, Paytm & more</p>
                  </button>
                </div>

                {paymentMethod === "card" ? (
                  <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" value={formData.cardNumber} onChange={(e) => handleInputChange("cardNumber", e.target.value)} placeholder="1234 5678 9012 3456" />
                      {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input id="expiryDate" value={formData.expiryDate} onChange={(e) => handleInputChange("expiryDate", e.target.value)} placeholder="MM/YY" />
                        {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" value={formData.cvv} onChange={(e) => handleInputChange("cvv", e.target.value)} placeholder="123" />
                        {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input id="nameOnCard" value={formData.nameOnCard} onChange={(e) => handleInputChange("nameOnCard", e.target.value)} placeholder="John Doe" />
                      {errors.nameOnCard && <p className="text-xs text-red-500 mt-1">{errors.nameOnCard}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <div>
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input id="upiId" value={formData.upiId} onChange={(e) => handleInputChange("upiId", e.target.value)} placeholder="name@bank" />
                      {errors.upiId && <p className="text-xs text-red-500 mt-1">{errors.upiId}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <QrCode className="h-3.5 w-3.5" /> You can also authorize via QR/app on next step.
                    </p>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox checked={isBusinessPurchase} onCheckedChange={(value) => setIsBusinessPurchase(Boolean(value))} className="mt-0.5" />
                    <span>I am purchasing as a business</span>
                  </label>

                  {isBusinessPurchase && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-4">
                      <div>
                        <Label htmlFor="businessName">Business name</Label>
                        <Input id="businessName" value={formData.businessName} onChange={(e) => handleInputChange("businessName", e.target.value)} placeholder="RunAsh Pvt Ltd" />
                      </div>
                      <div>
                        <Label htmlFor="gstNumber">GSTIN</Label>
                        <Input id="gstNumber" value={formData.gstNumber} onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
                        {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber}</p>}
                      </div>
                    </div>
                  )}

                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox checked={saveInfo} onCheckedChange={(value) => setSaveInfo(Boolean(value))} className="mt-0.5" />
                    <span>
                      Save my information for faster checkout
                      <span className="block text-xs text-muted-foreground">Securely tokenized and reusable across RunAsh purchases.</span>
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <SustainabilityMetrics metrics={cart.sustainabilityMetrics} />

            <Card>
              <CardHeader>
                <CardTitle>Order Summary ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center justify-between">
                  <span className="font-medium">Coupon Applied</span>
                  <span>- ${discountAmount.toFixed(2)}</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img src={item.product.image || "/placeholder.svg?height=48&width=48"} alt={item.product.name} className="w-12 h-12 object-cover rounded" />
                        <div>
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          {item.product.isOrganic && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                              <Leaf className="h-3 w-3 mr-1" /> Organic
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">${((item.selectedVariant?.price || item.product.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator />
                <CartSummary totals={totals} />

                <label className="flex items-start gap-3 text-sm">
                  <Checkbox checked={acceptTerms} onCheckedChange={(value) => setAcceptTerms(Boolean(value))} className="mt-0.5" />
                  <span>
                    I agree to recurring charges, billing terms and privacy policy.
                    <span className="block text-xs text-muted-foreground">Cancel anytime from account settings.</span>
                  </span>
                </label>
                {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms}</p>}

                <form onSubmit={handleSubmit}>
                  <Button type="submit" disabled={processing} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white">
                    {processing ? "Processing..." : `Subscribe Securely - $${totals.total.toFixed(2)}`}
                  </Button>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure Checkout</div>
                  <div className="flex items-center gap-1"><BadgeCheck className="h-3 w-3 text-emerald-600" /> Trusted payment partners</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmDialog(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-semibold mb-2">Confirm Your Order</h3>
              <p className="text-sm text-gray-600 mb-4">You&apos;re about to complete your order. Proceed to secure payment?</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm"><span>Items</span><span>{cart.items.length}</span></div>
                <div className="flex justify-between text-sm"><span>Payment Method</span><span className="uppercase">{paymentMethod}</span></div>
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Shipping</span><span>${totals.shipping.toFixed(2)}</span></div>
                <div className="flex justify-between font-medium"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>Edit</Button>
                <Button onClick={proceedToPayment}>{processing ? "Please wait..." : "Proceed to Payment"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
