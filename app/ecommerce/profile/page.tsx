'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Bell, MapPin, CreditCard, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground mt-2">Manage your profile and preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Orders', value: '24', icon: '📦' },
            { label: 'Loyalty Points', value: '2,450', icon: '⭐' },
            { label: 'Saved Addresses', value: '3', icon: '📍' },
            { label: 'Payment Methods', value: '2', icon: '💳' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 space-y-2">
              <p className="text-3xl">{stat.icon}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Addresses</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div>
                    <p className="font-semibold">John Doe</p>
                    <p className="text-sm text-muted-foreground">Member since 2022</p>
                    <Badge className="mt-2 bg-orange-600">Gold Member</Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold">Full Name</label>
                    <Input defaultValue="John Doe" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">Email</label>
                      <Input
                        defaultValue="john@example.com"
                        type="email"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Phone</label>
                      <Input
                        defaultValue="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Bio</label>
                    <textarea
                      defaultValue="Fashion enthusiast and product reviewer"
                      className="w-full mt-1 px-3 py-2 bg-muted rounded border border-border/40 text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <Button className="bg-orange-600 hover:bg-orange-700">
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="addresses" className="space-y-4 mt-6">
              {[
                {
                  type: 'Home',
                  address: '123 Main Street, San Francisco, CA 94105',
                  default: true,
                },
                {
                  type: 'Work',
                  address: '456 Business Ave, San Francisco, CA 94106',
                  default: false,
                },
              ].map((addr) => (
                <Card key={addr.type} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{addr.type}</p>
                      <p className="text-sm text-muted-foreground">{addr.address}</p>
                    </div>
                    {addr.default && (
                      <Badge className="bg-orange-600">Default</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Add New Address
              </Button>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 mt-6">
              {[
                { last4: '4242', brand: 'Visa', exp: '12/25' },
                { last4: '5555', brand: 'Mastercard', exp: '08/26' },
              ].map((card) => (
                <Card key={card.last4} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{card.brand}</p>
                      <p className="text-sm text-muted-foreground">
                        •••• {card.last4} • Expires {card.exp}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Add Payment Method
              </Button>
            </TabsContent>

            <TabsContent value="security" className="space-y-4 mt-6">
              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Password</h3>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Lock className="h-4 w-4" />
                  Change Password
                </Button>
              </Card>

              <Card className="p-4 space-y-4">
                <h3 className="font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Bell className="h-4 w-4" />
                  Enable 2FA
                </Button>
              </Card>

              <Card className="p-4 space-y-4 border-red-200 bg-red-500/5">
                <h3 className="font-semibold text-red-700">Danger Zone</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  Delete Account
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
    }
