"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CreditCard, Lock, Leaf, ShoppingCart, BadgeCheck, WalletCards, QrCode, ShieldCheck } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import CartSummary from "@/components/cart/cart-summary"
import SustainabilityMetrics from "@/components/cart/sustainability-metrics"
import Link from "next/link"

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
    phone: "",
    gstin: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card")
  const [couponCode, setCouponCode] = useState("")
  const [saveInfo, setSaveInfo] = useState(true)
  const [isBusinessPurchase, setIsBusinessPurchase] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Ensure component is mounted before accessing cart
  useEffect(() => {
    setMounted(true)

    // Try to prefill with saved profile data (if any)
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("userProfile") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }

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
    if (isBusinessPurchase && !formData.gstin) newErrors.gstin = "GSTIN is required for business invoices"
    if (!acceptTerms) newErrors.terms = "Please accept the terms to continue"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const discount = couponCode.trim().toUpperCase() === "RUNASH10" ? totals.subtotal * 0.1 : 0
  const finalTotal = Math.max(totals.total - discount, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate form
    if (!validate()) return

    // Build order payload from real data (cart + form)
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
        saveInfo,
      },
      compliance: {
        isBusinessPurchase,
        gstin: formData.gstin,
      },
      items: cart.items,
      totals: {
        ...totals,
        discount,
        total: finalTotal,
      },
    }

    // Persist pending order so the payment page can pick it up
    try {
      sessionStorage.setItem("pendingOrder", JSON.stringify(order))
    } catch (err) {
      console.error("Failed to save pending order:", err)
    }

    // Show confirmation dialog (add dialog UI design)
    setShowConfirmDialog(true)
  }

  const proceedToPayment = () => {
    setProcessing(true)
    // Here you could call an API to create an order on the backend and get a payment session.
    // For now we navigate to the payment page and the payment page should read `pendingOrder` from sessionStorage.
    router.push("/payment/runash-pay")
  }

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  // Show empty cart state
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
            <p className="text-gray-600 mb-6">
              Add some organic products to get started with your sustainable shopping journey.
            </p>
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
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your sustainable shopping experience</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Encrypted checkout
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
              <BadgeCheck className="h-3.5 w-3.5" /> PCI-ready payment flow
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
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
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      required
                    />
                    {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                    />
                    {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      required
                    />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="CA"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      placeholder="12345"
                      required
                    />
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Information</span>
                  <Lock className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-1 grid grid-cols-2 gap-1 bg-muted/40">
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => setPaymentMethod("card")}
                  >
                    <WalletCards className="h-4 w-4 mr-1" /> Card
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "upi" ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => setPaymentMethod("upi")}
                  >
                    <QrCode className="h-4 w-4 mr-1" /> UPI / QR
                  </Button>
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
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 bg-muted/20">
                    <p className="font-medium">Pay with your UPI app</p>
                    <p className="text-sm text-gray-600 mt-1">
                      After placing the order, we will open a secure app chooser for UPI authorization.
                    </p>
                  </div>
                )}
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

                <div className="flex items-center gap-2">
                  <input
                    id="saveInfo"
                    type="checkbox"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="saveInfo" className="text-sm font-normal">
                    Save my information for faster checkout
                  </Label>
                </div>

                {saveInfo && (
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="businessPurchase"
                    type="checkbox"
                    checked={isBusinessPurchase}
                    onChange={(e) => setIsBusinessPurchase(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="businessPurchase" className="text-sm font-normal">
                    I'm purchasing as a business
                  </Label>
                </div>

                {isBusinessPurchase && (
                  <div>
                    <Label htmlFor="gstin">GSTIN</Label>
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange("gstin", e.target.value)}
                      placeholder="22AAAAA0000A1Z5"
                    />
                    {errors.gstin && <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <SustainabilityMetrics metrics={cart.sustainabilityMetrics} />

            <Card>
              <CardHeader>
                <CardTitle>
                  Order Summary ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.product.image || "/placeholder.svg?height=48&width=48"}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                          {item.product.isOrganic && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                              <Leaf className="h-3 w-3 mr-1" />
                              Organic
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">
                        ${((item.selectedVariant?.price || item.product.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="couponCode">Coupon code</Label>
                  <Input
                    id="couponCode"
                    placeholder="Enter code (try RUNASH10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  {discount > 0 && <p className="text-xs text-green-700">Coupon applied: -${discount.toFixed(2)}</p>}
                </div>

                <CartSummary totals={totals} />

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount</span>
                    <span>- ${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <span>Payable now</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-600">
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
                    I authorize recurring billing based on my selected plan and agree to the Terms & Privacy Policy.
                  </Label>
                </div>
                {errors.terms && <p className="text-xs text-red-500 -mt-2">{errors.terms}</p>}

                <form onSubmit={handleSubmit}>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white"
                  >
                    {processing ? "Processing..." : `Complete Order - $${finalTotal.toFixed(2)}`}
                  </Button>
                </form>

                <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Lock className="h-3 w-3" />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Leaf className="h-3 w-3 text-green-600" />
                    <span>Carbon Neutral Shipping</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Confirmation Dialog (simple UI) */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmDialog(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-semibold mb-2">Confirm Your Order</h3>
              <p className="text-sm text-gray-600 mb-4">You're about to complete your order. Proceed to secure payment?</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Items</span>
                  <span>{cart.items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>${totals.shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>
                  Edit
                </Button>
                <Button onClick={proceedToPayment}>
                  {processing ? "Please wait..." : "Proceed to Payment"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
