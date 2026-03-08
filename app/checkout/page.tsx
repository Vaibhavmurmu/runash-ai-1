"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft as ArrowLeftIcon,
  BadgeCheck,
  Building2,
  CreditCard,
  Leaf,
  Lock,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
} from "lucide-react"

import CartSummary from "@/components/cart/cart-summary"
import SustainabilityMetrics from "@/components/cart/sustainability-metrics"
import { CheckoutModelDialogSection } from "@/components/checkout/model-dialog-checkout-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/cart-context"
import type { CheckoutOrderDTO } from "@/lib/types/checkout-order"
import { submitCheckout } from "@/lib/checkout/submit-checkout"

type PaymentMethod = "card" | "upi" | "bank"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state } = useCart()
  const { cart, totals } = state

  const [mounted, setMounted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [couponCode, setCouponCode] = useState("")
  const [saveInfo, setSaveInfo] = useState(true)
  const [isBusinessPurchase, setIsBusinessPurchase] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkoutSubmitError, setCheckoutSubmitError] = useState<string | null>(null)

  const selectedPlan = searchParams.get("plan") ?? undefined
  const selectedModel = searchParams.get("model") ?? undefined

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
    phone: "",
    gstin: "",
    businessName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfsc: "",
  })

  useEffect(() => {
    setMounted(true)
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("userProfile") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore saved profile parse errors
    }
  }, [])

  const discount = useMemo(() => {
    if (couponCode.trim().toUpperCase() === "RUNASH10") return totals.subtotal * 0.1
    return 0
  }, [couponCode, totals.subtotal])

  const finalTotal = useMemo(() => Math.max(totals.total - discount, 0), [totals.total, discount])

  const handleInputChange = (field: keyof typeof formData, value: string) => {
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
      if (!formData.nameOnCard) newErrors.nameOnCard = "Name on card is required"
    }

    if (paymentMethod === "upi" && !formData.upiId) {
      newErrors.upiId = "UPI ID is required"
    }

    if (paymentMethod === "bank") {
      if (!formData.bankAccountName) newErrors.bankAccountName = "Account holder name is required"
      if (!formData.bankAccountNumber) newErrors.bankAccountNumber = "Bank account number is required"
      if (!formData.bankIfsc) newErrors.bankIfsc = "IFSC code is required"
    }

    if (isBusinessPurchase) {
      if (!formData.businessName) newErrors.businessName = "Business name is required"
      if (!formData.gstin) newErrors.gstin = "GSTIN is required for business invoice"
    }

    if (!acceptTerms) newErrors.terms = "Please accept terms to continue"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const persistPendingOrder = () => {
    const order: CheckoutOrderDTO = {
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
        cardNumber: formData.cardNumber ? `**** **** **** ${formData.cardNumber.slice(-4)}` : "",
        nameOnCard: formData.nameOnCard,
        upiId: formData.upiId,
        bankAccountName: formData.bankAccountName,
        bankAccountNumber: formData.bankAccountNumber ? `****${formData.bankAccountNumber.slice(-4)}` : "",
        bankIfsc: formData.bankIfsc,
        saveForFastCheckout: saveInfo,
        buyAsBusiness: isBusinessPurchase,
      },
      compliance: {
        isBusinessPurchase,
        businessName: formData.businessName,
        gstin: formData.gstin,
        consentAccepted: acceptTerms,
      },
      items: cart.items.map((item) => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.selectedVariant?.price ?? item.product.price,
        selectedVariant: item.selectedVariant,
        product: {
          id: item.product.id,
          stripePriceId: (item.product as { stripePriceId?: string }).stripePriceId,
        },
      })),
      totals: {
        ...totals,
        discount,
        total: finalTotal,
      },
      metadata: {
        ...(selectedPlan ? { selectedPlan } : {}),
        ...(selectedModel ? { selectedModel } : {}),
      },
    }

    sessionStorage.setItem("pendingOrder", JSON.stringify(order))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      setCheckoutSubmitError("Please complete required checkout fields before proceeding.")
      return
    }

    setCheckoutSubmitError(null)
    try {
      persistPendingOrder()
    } catch {
      // keep UX resilient; next step still available
    }
    if (!acceptTerms) newErrors.acceptTerms = "Please accept terms to continue"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setShowConfirmDialog(true)
  }

  const submitFromModelReview = () => {
    if (processing) return
    if (!validate()) {
      setCheckoutSubmitError("Please complete required checkout fields before proceeding.")
      return
    }

    setCheckoutSubmitError(null)
    try {
      persistPendingOrder()
    } catch {
      // no-op; confirmation can still proceed
    }
    setShowConfirmDialog(true)
  }

  const proceedToPayment = async () => {
    setProcessing(true)
    router.push("/payment-redirect")
  }

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

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-gray-950 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <Link href="/chat">
            <Button variant="ghost" className="mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>

          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-6">
              <ShoppingCart className="h-12 w-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add products before starting checkout.</p>
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
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">RunAsh Secure Checkout</h1>
          <p className="text-gray-600 mt-2">
            Professional B2B subscription + B2C live commerce checkout with secure multi-method flow.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-green-700">
              <ShieldCheck className="h-3.5 w-3.5" /> PCI-safe checkout
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
              <Lock className="h-3.5 w-3.5" /> Encrypted end-to-end
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-purple-700">
              <BadgeCheck className="h-3.5 w-3.5" /> Secure payment
            </span>
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
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input id="zipCode" value={formData.zipCode} onChange={(e) => handleInputChange("zipCode", e.target.value)} />
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-1">
                  <Button type="button" variant={paymentMethod === "card" ? "default" : "ghost"} onClick={() => setPaymentMethod("card")} className="justify-start">
                    <WalletCards className="h-4 w-4 mr-1" /> Card
                  </Button>
                  <Button type="button" variant={paymentMethod === "upi" ? "default" : "ghost"} onClick={() => setPaymentMethod("upi")} className="justify-start">
                    <QrCode className="h-4 w-4 mr-1" /> UPI
                  </Button>
                  <Button type="button" variant={paymentMethod === "bank" ? "default" : "ghost"} onClick={() => setPaymentMethod("bank")} className="justify-start">
                    <Building2 className="h-4 w-4 mr-1" /> Bank
                  </Button>
                </div>

                {paymentMethod === "card" && (
                  <>
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={(e) => handleInputChange("cardNumber", e.target.value)} />
                      {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input id="expiryDate" placeholder="MM/YY" value={formData.expiryDate} onChange={(e) => handleInputChange("expiryDate", e.target.value)} />
                        {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" value={formData.cvv} onChange={(e) => handleInputChange("cvv", e.target.value)} />
                        {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nameOnCard">Name on Card</Label>
                      <Input id="nameOnCard" value={formData.nameOnCard} onChange={(e) => handleInputChange("nameOnCard", e.target.value)} />
                      {errors.nameOnCard && <p className="text-xs text-red-500 mt-1">{errors.nameOnCard}</p>}
                    </div>
                  </>
                )}

                {paymentMethod === "upi" && (
                  <div className="space-y-3 rounded-lg border border-dashed p-4 bg-muted/20">
                    <div>
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input id="upiId" placeholder="name@upi" value={formData.upiId} onChange={(e) => handleInputChange("upiId", e.target.value)} />
                      {errors.upiId && <p className="text-xs text-red-500 mt-1">{errors.upiId}</p>}
                    </div>
                    <p className="font-medium flex items-center gap-2"><QrCode className="h-4 w-4" /> QR / App handoff</p>
                    <p className="text-sm text-gray-600">After placing the order, we will show a secure UPI app handoff or QR authorization prompt.</p>
                  </div>
                )}

                {paymentMethod === "bank" && (
                  <div className="space-y-3 rounded-lg border border-dashed p-4 bg-muted/20">
                    <div>
                      <Label htmlFor="bankAccountName">Account Holder Name</Label>
                      <Input id="bankAccountName" value={formData.bankAccountName} onChange={(e) => handleInputChange("bankAccountName", e.target.value)} />
                      {errors.bankAccountName && <p className="text-xs text-red-500 mt-1">{errors.bankAccountName}</p>}
                    </div>
                    <div>
                      <Label htmlFor="bankAccountNumber">Account Number</Label>
                      <Input id="bankAccountNumber" value={formData.bankAccountNumber} onChange={(e) => handleInputChange("bankAccountNumber", e.target.value)} />
                      {errors.bankAccountNumber && <p className="text-xs text-red-500 mt-1">{errors.bankAccountNumber}</p>}
                    </div>
                    <div>
                      <Label htmlFor="bankIfsc">IFSC</Label>
                      <Input id="bankIfsc" placeholder="SBIN0000123" value={formData.bankIfsc} onChange={(e) => handleInputChange("bankIfsc", e.target.value)} />
                      {errors.bankIfsc && <p className="text-xs text-red-500 mt-1">{errors.bankIfsc}</p>}
                    </div>
                  </div>
                )}

                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input id="saveInfo" type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} className="h-4 w-4" />
                    <Label htmlFor="saveInfo" className="font-normal">Save my information for faster checkout</Label>
                  </div>
                  {saveInfo && (
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="businessPurchase"
                      type="checkbox"
                      checked={isBusinessPurchase}
                      onChange={(e) => setIsBusinessPurchase(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="businessPurchase" className="font-normal">I&apos;m purchasing as a business (B2B)</Label>
                  </div>
                  {isBusinessPurchase && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input id="businessName" value={formData.businessName} onChange={(e) => handleInputChange("businessName", e.target.value)} />
                        {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="gstin">GSTIN</Label>
                        <Input id="gstin" placeholder="22AAAAA0000A1Z5" value={formData.gstin} onChange={(e) => handleInputChange("gstin", e.target.value)} />
                        {errors.gstin && <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>}
                      </div>
                    </div>
                  )}
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
                <details className="rounded-md border bg-muted/10 p-3" open>
                  <summary className="cursor-pointer text-sm font-medium">View details (v1 / v3 / v4)</summary>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-3">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                                <Leaf className="h-3 w-3 mr-1" /> Organic
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-medium">${((item.selectedVariant?.price || item.product.price) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                <Separator />

                <div className="space-y-2 rounded-md border border-orange-200 bg-orange-50 p-3">
                  <Label htmlFor="couponCode">Coupon code</Label>
                  <Input id="couponCode" placeholder="Enter code (try RUNASH10)" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                  {discount > 0 && <p className="text-xs font-medium text-green-700">Coupon applied successfully: -${discount.toFixed(2)}</p>}
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

                <div className="rounded-md border p-3 text-xs text-gray-600 space-y-2">
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
                      Review: By placing your order, you agree to RunAsh&apos;s Terms of Service and Privacy Policy. Your order will be processed immediately.
                    </Label>
                  </div>
                  {errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}
                </div>

                <form onSubmit={handleSubmit}>
                  <Button type="submit" disabled={processing} className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white">
                    {processing ? "Processing..." : `Complete Order - $${finalTotal.toFixed(2)}`}
                  </Button>
                </form>

                <CheckoutModelDialogSection
                  selectedPlan={selectedPlan}
                  selectedModelId={selectedModel}
                  selectedModelLabel={selectedModel}
                  isSubmitting={processing}
                  submitError={checkoutSubmitError}
                  onCheckoutSubmitFromReview={submitFromModelReview}
                />

                <div className="text-xs text-gray-600 leading-5 border rounded-md p-3 bg-muted/20">
                  <p className="font-medium mb-1">All transactions are secure and encrypted.</p>
                  <p>RunAsh uses industry-standard security to protect your information. We never store your full card details.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmDialog(false)} />
            <div className="relative z-10 w-full max-w-xl rounded-xl bg-white dark:bg-gray-900 shadow-2xl p-6">
              <h3 className="text-xl font-semibold">Review and confirm payment</h3>
              <p className="text-sm text-gray-600 mt-1">
                Professional, clean checkout confirmation card for subscription + live commerce orders.
              </p>

              <div className="mt-4 rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Payment method</span><span className="uppercase">{paymentMethod}</span></div>
                <div className="flex justify-between text-sm"><span>Items</span><span>{cart.items.length}</span></div>
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span>Discount</span><span>- ${discount.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total payable</span><span>${finalTotal.toFixed(2)}</span></div>
              </div>

              <p className="text-xs text-gray-600 mt-3">
                By placing your order, you agree to RunAsh&apos;s Terms of Service and Privacy Policy. Your order will be processed immediately.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)}>
                  Edit
                </Button>
                <Button onClick={proceedToPayment}>{processing ? "Please wait..." : "Proceed to secure payment"}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
