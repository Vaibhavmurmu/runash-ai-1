'use client';

import React from "react"

import { useState } from 'react';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StripeLinkPaymentProps {
  amount: number;
  description?: string;
  onSuccess?: () => void;
}

export default function StripeLinkPayment({
  amount,
  description,
  onSuccess,
}: StripeLinkPaymentProps) {
  const [step, setStep] = useState<'payment' | 'shipping' | 'review' | 'success'>('payment');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'link' | 'paypal'>('card');
  const [formData, setFormData] = useState({
    email: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === 'link') {
      setStep('shipping');
    } else {
      setStep('review');
    }
  };

  const paymentMethods = [
    {
      id: 'link',
      name: 'Stripe Link',
      description: 'One-click checkout with Stripe Link',
      icon: '⚡',
      recommended: true,
    },
    {
      id: 'card',
      name: 'Card',
      description: 'Credit or debit card',
      icon: '💳',
      recommended: false,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Fast and secure',
      icon: '🅿️',
      recommended: false,
    },
  ];

  const shippingOptions = [
    { id: 'standard', name: 'Standard Shipping', time: '5-7 days', price: 0 },
    { id: 'express', name: 'Express Shipping', time: '2-3 days', price: 19.99 },
    { id: 'overnight', name: 'Overnight', time: '1 day', price: 49.99 },
  ];

  const [selectedShipping, setSelectedShipping] = useState<string>('standard');

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {['payment', 'shipping', 'review', 'success'].map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === s
                  ? 'bg-orange-600 text-white'
                  : ['payment', 'shipping', 'review'].indexOf(step) >= idx
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {['payment', 'shipping', 'review'].indexOf(step) >= idx ? (
                <Check className="w-5 h-5" />
              ) : (
                idx + 1
              )}
            </div>
            {idx < 3 && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  ['payment', 'shipping', 'review'].indexOf(step) > idx
                    ? 'bg-green-600'
                    : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Payment Step */}
      {step === 'payment' && (
        <Card className="bg-slate-900 border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>

          {/* Payment Method Selection */}
          <div className="grid gap-3 mb-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setPaymentMethod(method.id as 'card' | 'link' | 'paypal')}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                  paymentMethod === method.id
                    ? 'border-orange-600 bg-orange-600/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{method.name}</p>
                      <p className="text-sm text-slate-400">{method.description}</p>
                    </div>
                  </div>
                  {method.recommended && (
                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                      RECOMMENDED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Payment Form */}
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {paymentMethod === 'link' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  required
                />
                <p className="text-xs text-slate-400 mt-2">
                  Save your payment details with Stripe Link for faster checkouts
                </p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Card Number
                  </label>
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Expiry
                    </label>
                    <Input
                      placeholder="MM/YY"
                      value={formData.expiry}
                      onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">CVC</label>
                    <Input
                      placeholder="123"
                      value={formData.cvc}
                      onChange={(e) => setFormData({ ...formData, cvc: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-4">
              <Lock className="w-3 h-3" />
              <span>Your payment information is encrypted and secure</span>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-10 flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      )}

      {/* Shipping Step */}
      {step === 'shipping' && (
        <Card className="bg-slate-900 border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Shipping Method</h2>
          <div className="space-y-3 mb-6">
            {shippingOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedShipping(option.id)}
                className={`p-4 rounded-lg cursor-pointer border-2 transition-all flex justify-between ${
                  selectedShipping === option.id
                    ? 'border-orange-600 bg-orange-600/10'
                    : 'border-slate-700 bg-slate-800'
                }`}
              >
                <div>
                  <p className="font-semibold text-white">{option.name}</p>
                  <p className="text-sm text-slate-400">{option.time}</p>
                </div>
                <span className="text-lg font-bold text-orange-400">
                  {option.price === 0 ? 'Free' : `+$${option.price}`}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep('payment')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('review')}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <Card className="bg-slate-900 border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Order Review</h2>

          <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700 space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-300">Subtotal</span>
              <span className="text-white font-semibold">${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Shipping</span>
              <span className="text-white font-semibold">
                {shippingOptions.find((s) => s.id === selectedShipping)?.price === 0
                  ? 'Free'
                  : `+$${shippingOptions.find((s) => s.id === selectedShipping)?.price}`}
              </span>
            </div>
            <div className="border-t border-slate-700 pt-3 flex justify-between">
              <span className="text-white font-semibold">Total</span>
              <span className="text-2xl font-bold text-orange-400">
                ${(
                  amount +
                  (shippingOptions.find((s) => s.id === selectedShipping)?.price || 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setStep('shipping')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep('success')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Complete Purchase
            </Button>
          </div>
        </Card>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <Card className="bg-gradient-to-b from-green-900/20 to-slate-900 border-green-600 p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-slate-400 mb-6">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-400 mb-1">Order Number</p>
            <p className="text-lg font-bold text-white">#ORD-2024-28759</p>
          </div>
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold">
            Continue Shopping
          </Button>
        </Card>
      )}
    </div>
  );
}
