"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, Leaf, Lock, QrCode, ShoppingCart, Smartphone } from "lucide-react"
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
    if (!acceptTerms) newErrors.acceptTerms = "Please accept terms to continue"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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
        cardNumber: paymentMethod === "card" && formData.cardNumber ? `**** **** **** ${formData.cardNumber.slice(-4)}` : "",
        nameOnCard: formData.nameOnCard,
        saveForFastCheckout,
        buyAsBusiness,
      },
      items: cart.items,
      totals,
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

                <CartSummary totals={totals} />

                <form onSubmit={handleSubmit}>
                  <Button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white"
                  >
                    {processing ? "Processing..." : paymentMethod === "upi" ? `Pay with UPI - $${totals.total.toFixed(2)}` : `Complete Order - $${totals.total.toFixed(2)}`}
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
                  <span>${totals.total.toFixed(2)}</span>
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
