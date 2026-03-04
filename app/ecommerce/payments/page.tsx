'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Copy, Link2, Loader2, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    apiRequest<PaymentLink>(`/api/v1/payment-links/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteLink: (id: string) => apiRequest<true>(`/api/v1/payment-links/${id}`, { method: 'DELETE' }),
  listMethods: () => apiRequest<PaymentMethod[]>('/api/v1/payment-methods'),
  updateMethod: (id: string, body: Partial<PaymentMethod>) =>
    apiRequest<PaymentMethod>(`/api/v1/payment-methods/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
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
  const [workingLinkId, setWorkingLinkId] = useState<string | null>(null);
  const [workingMethodId, setWorkingMethodId] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const [newLink, setNewLink] = useState({
    name: '',
    amount: '',
    currency: 'USD',
    description: '',
  });

  const fetchData = useCallback(
    async (background = false) => {
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
        setLastSyncAt(new Date().toISOString());
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load payment data';

        if (background) {
          toast({ title: 'Refresh failed', description: message, variant: 'destructive' });
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    const onFocus = () => fetchData(true);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Payment link copied to clipboard.' });
  };

  const handleCreateLink = async () => {
    const parsedAmount = Number(newLink.amount);
    const trimmedName = newLink.name.trim();

    if (!trimmedName || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !newLink.currency) {
      toast({
        title: 'Invalid details',
        description: 'Please add a valid name, currency, and amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const optimisticLink: PaymentLink = {
      id: `temp_${Date.now()}`,
      name: trimmedName,
      amount: parsedAmount,
      description: newLink.description.trim() || null,
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
        name: trimmedName,
        amount: parsedAmount,
        currency: newLink.currency,
        description: newLink.description.trim() || undefined,
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
    setWorkingLinkId(link.id);

    setPaymentLinks((current) => current.map((item) => (item.id === link.id ? { ...item, status: nextStatus } : item)));

    try {
      await paymentApi.updateLink(link.id, { status: nextStatus });
      toast({ title: 'Link updated', description: `Payment link marked as ${nextStatus}.` });
    } catch {
      setPaymentLinks(previousLinks);
      toast({ title: 'Update failed', description: 'Could not update link status.', variant: 'destructive' });
    } finally {
      setWorkingLinkId(null);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const previousLinks = paymentLinks;
    setWorkingLinkId(linkId);
    setPaymentLinks((current) => current.filter((link) => link.id !== linkId));

    try {
      await paymentApi.deleteLink(linkId);
      toast({ title: 'Link deleted', description: 'Payment link has been removed.' });
    } catch {
      setPaymentLinks(previousLinks);
      toast({ title: 'Delete failed', description: 'Could not delete payment link.', variant: 'destructive' });
    } finally {
      setWorkingLinkId(null);
    }
  };

  const toggleMethodConnection = async (method: PaymentMethod) => {
    const previous = paymentMethods;
    setWorkingMethodId(method.id);
    setPaymentMethods((current) =>
      current.map((item) => (item.id === method.id ? { ...item, connected: !item.connected } : item)),
    );

    try {
      await paymentApi.updateMethod(method.id, { connected: !method.connected });
      toast({ title: 'Method updated', description: `${method.name} connection updated.` });
    } catch {
      setPaymentMethods(previous);
      toast({ title: 'Update failed', description: 'Could not update payment method.', variant: 'destructive' });
    } finally {
      setWorkingMethodId(null);
    }
  };

  const linksEmpty = useMemo(() => !loading && paymentLinks.length === 0, [loading, paymentLinks.length]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">Payment Integration</h1>
          <p className="text-muted-foreground">Manage payment methods and create custom payment links</p>
          {lastSyncAt && (
            <p className="mt-1 text-xs text-muted-foreground">Last synced: {new Date(lastSyncAt).toLocaleTimeString()}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/payment/runash-pay">
              <Button variant="outline">Open RunAsh Pay hub</Button>
            </Link>
            <Link href="/payment/startup">
              <Button variant="outline">Startup journey</Button>
            </Link>
            <Link href="/payment/business">
              <Button variant="outline">Business journey</Button>
            </Link>
            <Link href="/payment/runash-pay#create-intent">
              <Button variant="outline">
                <Wallet className="w-4 h-4 mr-1" />
                Collect payment
              </Button>
            </Link>
            <Link href="/payment/subscription">
              <Button variant="outline">Manage payout/subscription</Button>
            </Link>
            <Link href="/payment/dashboard#analytics">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-1" />
                View analytics
              </Button>
            </Link>
            <Button onClick={() => fetchData(true)} variant="outline" disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Refresh
            </Button>
          </div>
        </div>

        {loading && (
          <Card className="mb-6 flex items-center gap-3 border-border bg-card p-6 text-card-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading payment data...
          </Card>
        )}

        {error && (
          <Card className="mb-6 border-destructive/40 bg-destructive/10 p-4 text-destructive">
            Failed to load data: {error}
            <div className="mt-3">
              <Button onClick={() => fetchData(false)} variant="destructive">
                Retry
              </Button>
            </div>
          </Card>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Connected Payment Methods</h2>
          {!loading && paymentMethods.length === 0 ? (
            <Card className="border-border bg-card p-6 text-muted-foreground">No payment methods available.</Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={`cursor-pointer border-border bg-card p-6 transition-colors ${
                    method.connected ? 'hover:border-primary' : 'opacity-80 hover:border-muted-foreground/30'
                  }`}
                  onClick={() => (workingMethodId ? undefined : toggleMethodConnection(method))}
                >
                  <div className="text-4xl mb-3">{method.icon}</div>
                  <h3 className="mb-1 font-bold text-card-foreground">{method.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{method.provider}</p>
                  <div className="flex items-center gap-2">
                    {workingMethodId === method.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className={`h-2 w-2 rounded-full ${method.connected ? 'bg-success' : 'bg-muted-foreground/50'}`} />
                    )}
                    <span className="text-sm font-medium">{method.connected ? 'Connected' : 'Not Connected'}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">Custom Payment Links</h2>
            <Button onClick={() => setShowNewLinkForm(true)} className="flex items-center gap-2 sm:w-auto" size="sm">
              <Plus className="w-4 h-4" />
              Create Link
            </Button>
          </div>

          {showNewLinkForm && (
            <Card className="mb-6 border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-bold text-card-foreground">Create New Payment Link</h3>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-muted-foreground">Link Name</Label>
                  <Input
                    value={newLink.name}
                    onChange={(event) => setNewLink((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g., Easter Sale Bundle"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-muted-foreground">Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        value={newLink.amount}
                        onChange={(event) => setNewLink((current) => ({ ...current, amount: event.target.value }))}
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-muted-foreground">Currency</Label>
                    <Select
                      value={newLink.currency}
                      onValueChange={(value) => setNewLink((current) => ({ ...current, currency: value }))}
                    >
                      <SelectTrigger className="border-border bg-background text-foreground">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-muted-foreground">Description (optional)</Label>
                  <Textarea
                    value={newLink.description}
                    onChange={(event) => setNewLink((current) => ({ ...current, description: event.target.value }))}
                    placeholder="What is this payment for?"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleCreateLink}
                    disabled={isSubmitting}
                    className="w-full sm:flex-1"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
                  </Button>
                  <Button onClick={() => setShowNewLinkForm(false)} className="w-full sm:flex-1" variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-4">
            {linksEmpty && (
              <Card className="border-border bg-card p-6 text-muted-foreground">
                No custom payment links yet. Create your first one to get started.
              </Card>
            )}

            {paymentLinks.map((link) => (
              <Card key={link.id} className="border-border bg-card p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-card-foreground">{link.name}</h3>
                    <p className="mb-3 text-sm text-muted-foreground">{link.description || 'No description provided'}</p>
                  </div>
                  <div className="sm:text-right">
                    <div className="mb-1 text-3xl font-bold text-primary">${link.amount}</div>
                    <Badge variant={link.status === 'active' ? 'success' : 'secondary'}>
                      {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase text-muted-foreground">Payment Link</span>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 break-all text-sm text-foreground/90">{link.link}</code>
                    <Button
                      onClick={() => copyToClipboard(link.link)}
                      className="h-8 w-8 p-2"
                      variant="outline"
                      size="icon"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Clicks</p>
                    <p className="text-2xl font-bold text-card-foreground">{link.clicks}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Conversions</p>
                    <p className="text-2xl font-bold text-success">{link.conversions}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-info">
                      {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-xl font-bold text-success">${(link.amount * link.conversions).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => handleToggleStatus(link)}
                    disabled={workingLinkId === link.id}
                    className="w-full sm:w-auto"
                    variant="outline"
                  >
                    {workingLinkId === link.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : link.status === 'active' ? (
                      'Pause Link'
                    ) : (
                      'Resume Link'
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDeleteLink(link.id)}
                    disabled={workingLinkId === link.id}
                    className="w-full sm:w-auto"
                    variant="destructive"
                  >
                    {workingLinkId === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />} Delete
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
