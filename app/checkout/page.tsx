"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Lock, Leaf, ShoppingCart } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import CartSummary from "@/components/cart/cart-summary"
import SustainabilityMetrics from "@/components/cart/sustainability-metrics"
import Link from "next/link"
import { CheckoutPaymentMethods } from "@/components/payment/checkout-payment-methods"

export default function CheckoutPage() {
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
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)
  const [checkoutRedirectUrl, setCheckoutRedirectUrl] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Ensure component is mounted before accessing cart
  useEffect(() => {
    setMounted(true)

    // Try to prefill with saved profile data (if any)
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("userProfile") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({
          ...prev,
          email: typeof parsed.email === "string" ? parsed.email : prev.email,
          firstName: typeof parsed.firstName === "string" ? parsed.firstName : prev.firstName,
          lastName: typeof parsed.lastName === "string" ? parsed.lastName : prev.lastName,
          address: typeof parsed.address === "string" ? parsed.address : prev.address,
          city: typeof parsed.city === "string" ? parsed.city : prev.city,
          state: typeof parsed.state === "string" ? parsed.state : prev.state,
          zipCode: typeof parsed.zipCode === "string" ? parsed.zipCode : prev.zipCode,
        }))
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

  const proceedToPayment = async () => {
    setProcessing(true)
    setCheckoutError("")

    try {
      if (!process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_PRICE_ID) {
        throw new Error("Checkout price is not configured")
      }

      const fallbackSuccess = `${window.location.origin}/payment-redirect/return?status=success`
      const fallbackCancel = `${window.location.origin}/payment-redirect/return?status=failed`
      const response = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_PRICE_ID,
          mode: "payment",
          success_url: fallbackSuccess,
          cancel_url: fallbackCancel,
          returnUrlSuccess: fallbackSuccess,
          returnUrlFailed: fallbackCancel,
          returnUrlPending: `${window.location.origin}/payment-redirect/return?status=pending`,
          requestClientSecret: true,
          billing_address: {
            country: "US",
            state: formData.state,
            city: formData.city,
            postal_code: formData.zipCode,
          },
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || "Unable to initialize checkout")
      }

      const data = payload.data || {}
      setCheckoutClientSecret(data.clientSecret || null)
      setCheckoutRedirectUrl(data.redirectUrl || data.url || null)

      if (!data.clientSecret && (data.redirectUrl || data.url)) {
        window.location.href = data.redirectUrl || data.url
        return
      }

      if (!data.clientSecret && !data.redirectUrl && !data.url) {
        throw new Error("Checkout session did not return a usable handoff target")
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to initialize checkout")
    } finally {
      setProcessing(false)
    }
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

            <CheckoutPaymentMethods
              clientSecret={checkoutClientSecret}
              checkoutUrl={checkoutRedirectUrl}
              loading={processing}
              disabled={showConfirmDialog}
              errorMessage={checkoutError}
              onInitializeCheckout={proceedToPayment}
            />
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
                    {processing ? "Processing..." : `Complete Order - $${totals.total.toFixed(2)}`}
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
                <Button onClick={() => void proceedToPayment()}>
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
