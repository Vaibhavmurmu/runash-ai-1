'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProfileData } from '@/hooks/use-commerce-data';
import { Loader2, Save } from 'lucide-react';

type ProfileForm = {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
};

export default function ProfilePage() {
  const { data, loading, error, reload } = useProfileData();
  const [form, setForm] = useState<ProfileForm>({ name: '', username: '', bio: '', location: '', website: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: String(data.name ?? ''),
      username: String(data.username ?? ''),
      bio: String(data.bio ?? ''),
      location: String(data.location ?? ''),
      website: String(data.website ?? ''),
    });
  }, [data]);

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? 'Failed to update profile');
      }

      setMessage('Profile updated successfully.');
      await reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profile...
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="mt-2 text-muted-foreground">Manage your commerce profile and checkout details.</p>
        </div>

        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-orange-500/10 text-orange-600">Profile</Badge>
            <p className="text-sm text-muted-foreground">Keep this information updated for faster checkout.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} />
            </div>
          </div>

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

          <Button onClick={onSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </Card>
      </div>
    </div>
  );
}
