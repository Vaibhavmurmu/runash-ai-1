'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Plus, Link2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PaymentsPage() {
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [paymentLinks] = useState([
    {
      id: '1',
      name: 'Summer Collection Link',
      amount: 99.99,
      description: 'Premium fashion items bundle',
      link: 'https://shop.example.com/pay/link_summer_2024',
      created: '2024-02-01',
      clicks: 234,
      conversions: 18,
      status: 'active',
    },
    {
      id: '2',
      name: 'Flash Sale - Electronics',
      amount: 149.99,
      description: 'Limited time tech bundle',
      link: 'https://shop.example.com/pay/link_flash_2024',
      created: '2024-01-28',
      clicks: 567,
      conversions: 52,
      status: 'active',
    },
  ]);

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      provider: 'Visa, Mastercard, Amex',
      icon: '💳',
      connected: true,
    },
    {
      id: 'stripe',
      name: 'Stripe Payment',
      provider: 'Stripe Connect',
      icon: '🔗',
      connected: true,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      provider: 'PayPal Commerce',
      icon: '🅿️',
      connected: true,
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      provider: 'Bitcoin, Ethereum',
      icon: '₿',
      connected: false,
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Payment Integration</h1>
          <p className="text-slate-400">Manage payment methods and create custom payment links</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/payment/runash-pay">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">Open RunAsh Pay hub</Button>
            </Link>
            <Link href="/payment/startup">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">Startup journey</Button>
            </Link>
            <Link href="/payment/business">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">Business journey</Button>
            </Link>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Connected Payment Methods</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {paymentMethods.map((method) => (
              <Card
                key={method.id}
                className={`bg-slate-900 border-slate-800 p-6 cursor-pointer transition-all ${
                  method.connected
                    ? 'hover:border-orange-500'
                    : 'opacity-50 hover:border-slate-700'
                }`}
              >
                <div className="text-4xl mb-3">{method.icon}</div>
                <h3 className="font-bold text-white mb-1">{method.name}</h3>
                <p className="text-sm text-slate-400 mb-4">{method.provider}</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      method.connected ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-sm font-medium">
                    {method.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Custom Payment Links */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Custom Payment Links</h2>
            <Button
              onClick={() => setShowNewLinkForm(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Link
            </Button>
          </div>

          {showNewLinkForm && (
            <Card className="bg-slate-900 border-slate-800 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Create New Payment Link</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Link Name</label>
                  <Input
                    placeholder="e.g., Easter Sale Bundle"
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">$</span>
                      <Input
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded">
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>JPY</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="What is this payment for?"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                    Create Link
                  </Button>
                  <Button
                    onClick={() => setShowNewLinkForm(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Payment Links List */}
          <div className="space-y-4">
            {paymentLinks.map((link) => (
              <Card key={link.id} className="bg-slate-900 border-slate-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{link.name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{link.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-400 mb-1">${link.amount}</div>
                    <span className="inline-block bg-green-900 text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                      {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Payment Link */}
                <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase">Payment Link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-slate-300 break-all">{link.link}</code>
                    <Button
                      onClick={() => copyToClipboard(link.link)}
                      className="bg-slate-700 hover:bg-slate-600 text-white p-2 h-8 w-8"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Clicks</p>
                    <p className="text-2xl font-bold text-white">{link.clicks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Conversions</p>
                    <p className="text-2xl font-bold text-green-400">{link.conversions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Conversion Rate</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {((link.conversions / link.clicks) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Revenue</span>
                    <span className="text-xl font-bold text-green-400">
                      ${(link.amount * link.conversions).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
