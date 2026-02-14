'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Copy, Link2, Loader2, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type PaymentLink = {
  id: string;
  name: string;
  amount: number;
  description: string | null;
  link: string;
  currency: string;
  clicks: number;
  conversions: number;
  status: 'active' | 'paused';
  createdAt: string;
  updatedAt: string;
};

type PaymentMethod = {
  id: string;
  name: string;
  provider: string;
  icon: string;
  connected: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error ?? 'Request failed');
  }

  return payload.data;
}

const paymentApi = {
  listLinks: () => apiRequest<PaymentLink[]>('/api/v1/payment-links'),
  createLink: (body: { name: string; amount: number; currency: string; description?: string }) =>
    apiRequest<PaymentLink>('/api/v1/payment-links', { method: 'POST', body: JSON.stringify(body) }),
  updateLink: (id: string, body: Partial<PaymentLink>) =>
    apiRequest<PaymentLink>(`/api/v1/payment-links/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLink: (id: string) => apiRequest<true>(`/api/v1/payment-links/${id}`, { method: 'DELETE' }),
  listMethods: () => apiRequest<PaymentMethod[]>('/api/v1/payment-methods'),
  updateMethod: (id: string, body: Partial<PaymentMethod>) =>
    apiRequest<PaymentMethod>(`/api/v1/payment-methods/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMethod: (id: string) => apiRequest<true>(`/api/v1/payment-methods/${id}`, { method: 'DELETE' }),
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newLink, setNewLink] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    description: '',
  });

  const fetchData = useCallback(async (background = false) => {
    if (!background) {
      setLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [links, methods] = await Promise.all([paymentApi.listLinks(), paymentApi.listMethods()]);
      setPaymentLinks(links);
      setPaymentMethods(methods);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Failed to load payment data';
      setError(message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Payment link copied to clipboard.' });
  };

  const handleCreateLink = async () => {
    const parsedAmount = Number(newLink.amount);

    if (!newLink.name || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid details',
        description: 'Please add a valid name and amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const optimisticLink: PaymentLink = {
      id: `temp_${Date.now()}`,
      name: newLink.name,
      amount: parsedAmount,
      description: newLink.description || null,
      currency: newLink.currency,
      link: 'Generating payment URL...',
      clicks: 0,
      conversions: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPaymentLinks((current) => [optimisticLink, ...current]);

    try {
      const created = await paymentApi.createLink({
        name: newLink.name,
        amount: parsedAmount,
        currency: newLink.currency,
        description: newLink.description || undefined,
      });

      setPaymentLinks((current) => current.map((link) => (link.id === optimisticLink.id ? created : link)));
      setShowNewLinkForm(false);
      setNewLink({ name: '', amount: '', currency: 'USD', description: '' });
      toast({ title: 'Payment link created', description: 'Your new payment link is now live.' });
    } catch (submitError) {
      setPaymentLinks((current) => current.filter((link) => link.id !== optimisticLink.id));
      toast({
        title: 'Failed to create payment link',
        description: submitError instanceof Error ? submitError.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (link: PaymentLink) => {
    const nextStatus: PaymentLink['status'] = link.status === 'active' ? 'paused' : 'active';
    const previousLinks = paymentLinks;

    setPaymentLinks((current) => current.map((item) => (item.id === link.id ? { ...item, status: nextStatus } : item)));

    try {
      await paymentApi.updateLink(link.id, { status: nextStatus });
      toast({ title: 'Link updated', description: `Payment link marked as ${nextStatus}.` });
    } catch {
      setPaymentLinks(previousLinks);
      toast({ title: 'Update failed', description: 'Could not update link status.', variant: 'destructive' });
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const previousLinks = paymentLinks;
    setPaymentLinks((current) => current.filter((link) => link.id !== linkId));

    try {
      await paymentApi.deleteLink(linkId);
      toast({ title: 'Link deleted', description: 'Payment link has been removed.' });
    } catch {
      setPaymentLinks(previousLinks);
      toast({ title: 'Delete failed', description: 'Could not delete payment link.', variant: 'destructive' });
    }
  };

  const toggleMethodConnection = async (method: PaymentMethod) => {
    const previous = paymentMethods;
    setPaymentMethods((current) =>
      current.map((item) => (item.id === method.id ? { ...item, connected: !item.connected } : item)),
    );

    try {
      await paymentApi.updateMethod(method.id, { connected: !method.connected });
      toast({ title: 'Method updated', description: `${method.name} connection updated.` });
    } catch {
      setPaymentMethods(previous);
      toast({ title: 'Update failed', description: 'Could not update payment method.', variant: 'destructive' });
    }
  };

  const linksEmpty = useMemo(() => !loading && paymentLinks.length === 0, [loading, paymentLinks.length]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
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
            <Link href="/payment/runash-pay#create-intent">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">
                <Wallet className="w-4 h-4 mr-1" />
                Collect payment
              </Button>
            </Link>
            <Link href="/payment/subscription">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">Manage payout/subscription</Button>
            </Link>
            <Link href="/payment/dashboard#analytics">
              <Button className="bg-slate-800 hover:bg-slate-700 text-white">
                <BarChart3 className="w-4 h-4 mr-1" />
                View analytics
              </Button>
            </Link>
            <Button
              onClick={() => fetchData(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white"
              disabled={isRefreshing}
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Refresh
            </Button>
          </div>
        </div>

        {loading && (
          <Card className="bg-slate-900 border-slate-800 p-6 mb-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" /> Loading payment data...
          </Card>
        )}

        {error && (
          <Card className="bg-red-950 border-red-800 text-red-100 p-4 mb-6">
            Failed to load data: {error}
          </Card>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Connected Payment Methods</h2>
          {!loading && paymentMethods.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800 p-6 text-slate-400">No payment methods available.</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={`bg-slate-900 border-slate-800 p-6 cursor-pointer transition-all ${
                    method.connected ? 'hover:border-orange-500' : 'opacity-80 hover:border-slate-700'
                  }`}
                  onClick={() => toggleMethodConnection(method)}
                >
                  <div className="text-4xl mb-3">{method.icon}</div>
                  <h3 className="font-bold text-white mb-1">{method.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{method.provider}</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${method.connected ? 'bg-green-500' : 'bg-slate-600'}`} />
                    <span className="text-sm font-medium">{method.connected ? 'Connected' : 'Not Connected'}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

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
                    value={newLink.name}
                    onChange={(event) => setNewLink((current) => ({ ...current, name: event.target.value }))}
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
                        value={newLink.amount}
                        onChange={(event) => setNewLink((current) => ({ ...current, amount: event.target.value }))}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                    <select
                      value={newLink.currency}
                      onChange={(event) => setNewLink((current) => ({ ...current, currency: event.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>JPY</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                  <textarea
                    value={newLink.description}
                    onChange={(event) => setNewLink((current) => ({ ...current, description: event.target.value }))}
                    placeholder="What is this payment for?"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateLink}
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
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

          <div className="space-y-4">
            {linksEmpty && (
              <Card className="bg-slate-900 border-slate-800 p-6 text-slate-400">
                No custom payment links yet. Create your first one to get started.
              </Card>
            )}

            {paymentLinks.map((link) => (
              <Card key={link.id} className="bg-slate-900 border-slate-800 p-6">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{link.name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{link.description || 'No description provided'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-400 mb-1">${link.amount}</div>
                    <span className="inline-block bg-green-900 text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                      {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                    </span>
                  </div>
                </div>

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
                      {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Total Revenue</span>
                    <span className="text-xl font-bold text-green-400">${(link.amount * link.conversions).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleToggleStatus(link)}
                    className="bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    {link.status === 'active' ? 'Pause Link' : 'Resume Link'}
                  </Button>
                  <Button
                    onClick={() => handleDeleteLink(link.id)}
                    className="bg-red-700 hover:bg-red-800 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
