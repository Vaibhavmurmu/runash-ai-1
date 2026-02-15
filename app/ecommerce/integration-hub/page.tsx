'use client';

import { useState } from 'react';
import {
  Zap,
  Package,
  CreditCard,
  BarChart3,
  Bell,
  Workflow,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function IntegrationHubPage() {
  const [selectedFlow, setSelectedFlow] = useState<string>('customer');

  const integrations = [
    {
      id: 'livestream',
      name: 'Livestream Commerce',
      icon: Zap,
      description: 'Live shopping with real-time product integration',
      status: 'active',
      connection: 'bidirectional',
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      icon: Package,
      description: 'Real-time stock tracking and fulfillment',
      status: 'active',
      connection: 'bidirectional',
    },
    {
      id: 'payments',
      name: 'Payment Processing',
      icon: CreditCard,
      description: 'Multiple payment methods and custom links',
      status: 'active',
      connection: 'connected',
    },
    {
      id: 'analytics',
      name: 'Analytics Dashboard',
      icon: BarChart3,
      description: 'Real-time metrics and business intelligence',
      status: 'active',
      connection: 'connected',
    },
    {
      id: 'notifications',
      name: 'Real-Time Notifications',
      icon: Bell,
      description: 'Live updates and customer alerts',
      status: 'active',
      connection: 'bidirectional',
    },
  ];

  const workflows = [
    {
      id: 'customer',
      title: 'Customer Purchase Flow',
      steps: [
        {
          number: 1,
          name: 'Browse Live Stream',
          description: 'Customer watches livestream',
          system: 'Livestream Commerce',
        },
        {
          number: 2,
          name: 'Check Inventory',
          description: 'Real-time stock verification',
          system: 'Inventory Management',
        },
        {
          number: 3,
          name: 'Add to Cart',
          description: 'Item reserved temporarily',
          system: 'Cart System',
        },
        {
          number: 4,
          name: 'Choose Payment',
          description: 'Multiple payment options',
          system: 'Payment Processing',
        },
        {
          number: 5,
          name: 'Order Confirmation',
          description: 'Real-time confirmation',
          system: 'Notifications',
        },
        {
          number: 6,
          name: 'Track Order',
          description: 'Live shipment updates',
          system: 'Logistics',
        },
      ],
    },
    {
      id: 'admin',
      title: 'Admin Management Flow',
      steps: [
        {
          number: 1,
          name: 'Dashboard Overview',
          description: 'Real-time metrics',
          system: 'Analytics',
        },
        {
          number: 2,
          name: 'Monitor Inventory',
          description: 'Stock level tracking',
          system: 'Inventory',
        },
        {
          number: 3,
          name: 'Manage Orders',
          description: 'Process and fulfill',
          system: 'Order System',
        },
        {
          number: 4,
          name: 'Revenue Tracking',
          description: 'Payment confirmation',
          system: 'Payments',
        },
        {
          number: 5,
          name: 'Launch Livestream',
          description: 'Start commerce event',
          system: 'Livestream',
        },
        {
          number: 6,
          name: 'Send Notifications',
          description: 'Alert customers',
          system: 'Notifications',
        },
      ],
    },
  ];

  const currentWorkflow = workflows.find((w) => w.id === selectedFlow);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Workflow className="w-10 h-10 text-orange-500" />
            Integration Hub
          </h1>
          <p className="text-slate-400 text-lg">
            Seamless integration of all commerce systems for real-time operations
          </p>
        </div>

        {/* Integration Status */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card
                key={integration.id}
                className="bg-slate-900 border-slate-800 p-6 relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-orange-600/20 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      integration.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <h3 className="font-bold text-white mb-1">{integration.name}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                  {integration.description}
                </p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                    integration.connection === 'bidirectional'
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-green-900 text-green-300'
                  }`}
                >
                  {integration.connection}
                </span>
              </Card>
            );
          })}
        </div>

        {/* Workflow Selector */}
        <div className="mb-8 flex gap-4">
          {workflows.map((workflow) => (
            <Button
              key={workflow.id}
              onClick={() => setSelectedFlow(workflow.id)}
              className={`capitalize ${
                selectedFlow === workflow.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {workflow.title.split(' ').slice(0, 2).join(' ')} Flow
            </Button>
          ))}
        </div>

        {/* Workflow Visualization */}
        {currentWorkflow && (
          <Card className="bg-slate-900 border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-8">{currentWorkflow.title}</h2>

            <div className="space-y-4">
              {currentWorkflow.steps.map((step, idx) => (
                <div key={step.number} className="flex items-start gap-6">
                  {/* Step Number */}
                  <div className="flex items-center gap-6 flex-1">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center font-bold text-lg mb-2">
                        {step.number}
                      </div>
                      {idx < currentWorkflow.steps.length - 1 && (
                        <div className="w-1 h-12 bg-gradient-to-b from-orange-600 to-slate-800" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-orange-500 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-bold text-white">{step.name}</h4>
                          <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        <span className="text-xs font-medium text-orange-400">{step.system}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Result */}
              <div className="mt-8 flex items-center gap-4 bg-green-900/20 border border-green-600 rounded-lg p-6">
                <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-green-300 mb-1">Seamless Integration Complete</h4>
                  <p className="text-sm text-green-200">
                    {selectedFlow === 'customer'
                      ? 'Customer receives their order with real-time updates'
                      : 'Admin successfully manages commerce operations'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link href="/livecommerce">
            <Card className="bg-gradient-to-br from-orange-900/30 to-slate-900 border-orange-600 p-6 cursor-pointer hover:border-orange-500 transition-colors h-full">
              <Zap className="w-8 h-8 text-orange-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Live Commerce Hub</h3>
              <p className="text-sm text-slate-400">
                Watch livestreams and shop in real-time with integrated commerce
              </p>
              <div className="mt-4 text-orange-400 text-sm font-semibold">
                Explore →
              </div>
            </Card>
          </Link>

          <Link href="/ecommerce/admin">
            <Card className="bg-gradient-to-br from-blue-900/30 to-slate-900 border-blue-600 p-6 cursor-pointer hover:border-blue-500 transition-colors h-full">
              <BarChart3 className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Admin Dashboard</h3>
              <p className="text-sm text-slate-400">
                Monitor all commerce operations and real-time metrics
              </p>
              <div className="mt-4 text-blue-400 text-sm font-semibold">
                Access →
              </div>
            </Card>
          </Link>

          <Link href="/payment/runash-pay">
            <Card className="bg-gradient-to-br from-green-900/30 to-slate-900 border-green-600 p-6 cursor-pointer hover:border-green-500 transition-colors h-full">
              <CreditCard className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Payment Integration</h3>
              <p className="text-sm text-slate-400">
                Open RunAsh Pay routes for startup and business payment operations
              </p>
              <div className="mt-4 text-green-400 text-sm font-semibold">
                Configure →
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
