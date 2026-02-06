'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Filter, Search } from 'lucide-react';

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const invoices = [
    {
      id: 'INV-2024-001',
      orderDate: '2024-01-15',
      dueDate: '2024-01-30',
      amount: '$249.99',
      status: 'Paid',
      paymentDate: '2024-01-16',
    },
    {
      id: 'INV-2024-002',
      orderDate: '2024-01-14',
      dueDate: '2024-01-29',
      amount: '$189.50',
      status: 'Paid',
      paymentDate: '2024-01-14',
    },
    {
      id: 'INV-2024-003',
      orderDate: '2024-01-12',
      dueDate: '2024-01-27',
      amount: '$599.99',
      status: 'Pending',
      paymentDate: null,
    },
    {
      id: 'INV-2024-004',
      orderDate: '2024-01-10',
      dueDate: '2024-01-25',
      amount: '$89.99',
      status: 'Paid',
      paymentDate: '2024-01-11',
    },
    {
      id: 'INV-2024-005',
      orderDate: '2024-01-08',
      dueDate: '2024-01-23',
      amount: '$349.99',
      status: 'Overdue',
      paymentDate: null,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-500/10 text-green-700';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'Overdue':
        return 'bg-red-500/10 text-red-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.amount.includes(searchTerm)
  );

  const totalAmount = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount.replace('$', '')),
    0
  );
  const paidAmount = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + parseFloat(inv.amount.replace('$', '')), 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status === 'Pending' || inv.status === 'Overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.amount.replace('$', '')), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-2">View and manage your invoices</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 space-y-2 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4 space-y-2 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">${paidAmount.toFixed(2)}</p>
          </Card>
          <Card className="p-4 space-y-2 bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-orange-600">${pendingAmount.toFixed(2)}</p>
          </Card>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>

            <div className="space-y-3">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:border-orange-500/50 transition"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{invoice.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Ordered: {invoice.orderDate}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-semibold">{invoice.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {invoice.dueDate}
                      </p>
                    </div>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>

                  <div className="md:hidden">
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
