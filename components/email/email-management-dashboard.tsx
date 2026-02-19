"use client"

import { type ComponentType, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, BarChart3, Mail, Plus, RefreshCw, Search, Settings2, Shield, Trash2, Webhook } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAnalyticsOverview, useBroadcasts, useContacts, useDelivery, useReplyInbox, useSuppressions, useTemplates, useWebhooks } from "@/components/email/use-email-management"
import type { BroadcastPayload, ContactPayload, TemplatePayload } from "@/components/email/email-management-types"

interface EmailSafetyModeState {
  safeMode: boolean
  dryRun: boolean
  testRecipients: string[]
  sinkRecipient?: string
}

type EmailSection = "emails" | "broadcasts" | "audiences" | "replyInbox" | "metrics" | "webhooks" | "logs" | "settings"

function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}</div>
}

function SectionState({
  loading,
  error,
  empty,
  onRetry,
  emptyTitle,
  emptyCta,
  onEmptyAction,
}: {
  loading: boolean
  error: string | null
  empty: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyCta?: string
  onEmptyAction?: () => void
}) {
  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-between pt-6">
          <p className="text-sm text-red-600">{error}</p>
          {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
        </CardContent>
      </Card>
    )
  }

  if (empty) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
          <p>{emptyTitle || "No records found for current filters."}</p>
          {emptyCta && onEmptyAction && <Button size="sm" onClick={onEmptyAction}>{emptyCta}</Button>}
        </CardContent>
      </Card>
    )
  }

  return null
}

function EmailSidebarNav() {
  const sections: Array<{ key: EmailSection; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: "emails", label: "Emails", icon: Mail },
    { key: "broadcasts", label: "Broadcasts", icon: Activity },
    { key: "audiences", label: "Audiences", icon: Shield },
    { key: "replyInbox", label: "Reply Inbox", icon: Mail },
    { key: "metrics", label: "Metrics", icon: BarChart3 },
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "logs", label: "Logs", icon: Activity },
    { key: "settings", label: "Settings", icon: Settings2 },
  ]

  return (
    <TabsList className="grid h-fit w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-1">
      {sections.map(({ key, label, icon: Icon }) => (
        <TabsTrigger key={key} value={key} className="justify-start gap-2 rounded border bg-background px-3 py-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-50">
          <Icon className="h-4 w-4" />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

function EmailMetricsCards() {
  const { overview, loading } = useAnalyticsOverview()
  const stats = useMemo(() => ({ sent: overview?.total_sent ?? 0, deliveryRate: overview?.delivery_rate ?? 0, openRate: overview?.open_rate ?? 0, bounced: overview?.bounced ?? 0 }), [overview])

  if (loading) return <LoadingSkeleton rows={1} />

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Sent</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.sent.toLocaleString()}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Delivery Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Open Rate</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bounced</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.bounced.toLocaleString()}</CardContent></Card>
    </div>
  )
}

function EmailDeliverabilityPanel() {
  const { overview, loading, error, fetchOverview } = useAnalyticsOverview()
  return <Card><CardHeader><CardTitle>EmailDeliverabilityPanel</CardTitle></CardHeader><CardContent>{loading ? <LoadingSkeleton rows={2} /> : error || !overview ? <SectionState loading={false} error={error || "Analytics unavailable"} empty={false} onRetry={fetchOverview} /> : <div className="space-y-1 text-sm"><p>Delivered: {overview.delivered.toLocaleString()}</p><p>Bounced: {overview.bounced.toLocaleString()}</p><p>Delivery rate: {overview.delivery_rate.toFixed(1)}%</p><p>Bounce rate: {overview.bounce_rate.toFixed(1)}%</p></div>}</CardContent></Card>
}

function EmailEngagementPanel() {
  const { overview, loading, error, fetchOverview } = useAnalyticsOverview()
  return <Card><CardHeader><CardTitle>EmailEngagementPanel</CardTitle></CardHeader><CardContent>{loading ? <LoadingSkeleton rows={2} /> : error || !overview ? <SectionState loading={false} error={error || "Analytics unavailable"} empty={false} onRetry={fetchOverview} /> : <div className="space-y-1 text-sm"><p>Opened: {overview.opened.toLocaleString()} ({overview.open_rate.toFixed(1)}%)</p><p>Clicked: {overview.clicked.toLocaleString()} ({overview.click_rate.toFixed(1)}%)</p><p>Unsubscribed: {overview.unsubscribed.toLocaleString()} ({overview.unsubscribe_rate.toFixed(1)}%)</p></div>}</CardContent></Card>
}

function EmailTimelineChart() {
  const { overview, loading, error, fetchOverview } = useAnalyticsOverview()
  const bars = [
    { label: "Delivery", value: overview?.delivery_rate ?? 0 },
    { label: "Open", value: overview?.open_rate ?? 0 },
    { label: "Click", value: overview?.click_rate ?? 0 },
  ]

  return (
    <Card>
      <CardHeader><CardTitle>EmailTimelineChart</CardTitle><CardDescription>Performance snapshot</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {loading && <LoadingSkeleton rows={3} />}
        {!loading && (error || !overview) && <SectionState loading={false} error={error || "No timeline data"} empty={false} onRetry={fetchOverview} />}
        {!loading && !error && overview && bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex justify-between text-xs"><span>{bar.label}</span><span>{bar.value.toFixed(1)}%</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-full rounded bg-orange-500" style={{ width: `${Math.min(bar.value, 100)}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TemplatesTab() {
  const { toast } = useToast()
  const { query, setQuery, items, loading, saving, error, fetchTemplates, createTemplate, deleteTemplate } = useTemplates()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<TemplatePayload>({ name: "", subject: "", html_content: "", category: "general" })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="w-80 pl-9" placeholder="Search templates" value={query.search || ""} onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, offset: 0 }))} /></div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button disabled={saving}><Plus className="mr-2 h-4 w-4" />New Template</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create template</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /><Input placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /><Textarea placeholder="HTML content" value={form.html_content} onChange={(e) => setForm((p) => ({ ...p, html_content: e.target.value }))} /><Button onClick={async () => { try { await createTemplate(form); toast({ title: "Template created" }); setCreateOpen(false) } catch (err) { toast({ title: "Create failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !form.name || !form.subject || !form.html_content}>Create</Button></div></DialogContent></Dialog>
      </div>

      <SectionState loading={loading} error={error} onRetry={fetchTemplates} empty={!items.length} emptyTitle="No email templates yet." emptyCta="Create first template" onEmptyAction={() => setCreateOpen(true)} />
      {!loading && !error && items.length > 0 && <div className="grid gap-4 md:grid-cols-2">{items.map((template) => <Card key={template.id}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">{template.name}</CardTitle><Badge variant="outline">{template.category}</Badge></div><CardDescription>{template.subject}</CardDescription></CardHeader><CardContent><Button variant="outline" size="sm" disabled={saving} onClick={async () => { try { await deleteTemplate(template.id); toast({ title: "Template deleted" }) } catch (err) { toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" }) } }}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}</div>}
    </div>
  )
}

function ContactsTab() {
  const { toast } = useToast()
  const { query, setQuery, items, loading, saving, error, fetchContacts, createContact } = useContacts()
  const [form, setForm] = useState<ContactPayload>({ email: "", name: "", status: "subscribed", tags: [] })

  return <div className="space-y-4"><div className="grid gap-2 md:grid-cols-4"><Input placeholder="Search contacts" value={query.search || ""} onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, offset: 0 }))} /><Select value={query.status || "all"} onValueChange={(value) => setQuery((p) => ({ ...p, status: value === "all" ? "" : value, offset: 0 }))}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="subscribed">Subscribed</SelectItem><SelectItem value="unsubscribed">Unsubscribed</SelectItem><SelectItem value="bounced">Bounced</SelectItem><SelectItem value="suppressed">Suppressed</SelectItem></SelectContent></Select><Input placeholder="Tags" value={query.tags || ""} onChange={(e) => setQuery((p) => ({ ...p, tags: e.target.value, offset: 0 }))} /><Button onClick={async () => { try { await createContact(form); toast({ title: "Contact created" }); setForm({ email: "", name: "", status: "subscribed", tags: [] }) } catch (err) { toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !form.email}><Plus className="mr-1 h-4 w-4" />Quick add</Button></div><div className="grid gap-2 md:grid-cols-3"><Input placeholder="Email" value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /><Input placeholder="Name" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /><Input placeholder="Tags csv" value={(form.tags || []).join(",")} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} /></div><SectionState loading={loading} error={error} onRetry={fetchContacts} empty={!items.length} emptyTitle="No audience contacts yet." emptyCta="Import contacts" onEmptyAction={() => toast({ title: "Tip", description: "Use CSV import in the contacts workflow to seed your audience." })} />{!loading && !error && items.length > 0 && <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{items.map((contact) => <TableRow key={contact.id}><TableCell>{contact.email}</TableCell><TableCell>{contact.name || "-"}</TableCell><TableCell><Badge variant="outline">{contact.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>
}

function BroadcastsTab({ safety }: { safety: EmailSafetyModeState }) {
  const { toast } = useToast()
  const { query, setQuery, items, templates, loading, saving, error, fetchBroadcasts, createBroadcast, sendBroadcast, sendBroadcastTest } = useBroadcasts()
  const [testEmail, setTestEmail] = useState("")
  const [form, setForm] = useState<BroadcastPayload>({ name: "", subject: "", preheader: "", template_key: "", template_props: {}, audience_filter: { status: "subscribed" } })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = items.find((item) => item.id === selectedId)
  const disableSend = !selectedId || selected?.status === "sent" || safety.safeMode || safety.dryRun

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><Input placeholder="Search broadcasts" value={query.search || ""} onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, offset: 0 }))} className="max-w-sm" /><Button variant="outline" onClick={() => setSelectedId(null)}>New</Button></div>
      <SectionState loading={loading} error={error} empty={!items.length} onRetry={fetchBroadcasts} emptyTitle="No broadcasts created yet." emptyCta="Create broadcast" onEmptyAction={async () => { try { await createBroadcast({ ...form, template_key: templates[0]?.key || "marketing.announcement" }); toast({ title: "Broadcast created" }) } catch (err) { toast({ title: "Create failed", description: (err as Error).message, variant: "destructive" }) } }} />
      {!loading && !error && <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Broadcasts</CardTitle></CardHeader><CardContent className="space-y-2">{items.map((item) => <button key={item.id} className={`w-full rounded border px-3 py-2 text-left ${selectedId === item.id ? "border-orange-500 bg-orange-50" : "border-border"}`} onClick={() => setSelectedId(item.id)}><div className="flex items-center justify-between"><span>{item.name}</span><Badge variant="outline">{item.status}</Badge></div><p className="text-xs text-muted-foreground">{item.subject}</p></button>)}</CardContent></Card><Card><CardHeader><CardTitle>Editor</CardTitle><CardDescription>{disableSend ? "Send is disabled in safety mode/dry-run or for sent campaigns." : "Ready to send."}</CardDescription></CardHeader><CardContent className="space-y-3"><Input placeholder="Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /><Input placeholder="Subject" value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} /><Select value={form.template_key} onValueChange={(value) => setForm((prev) => ({ ...prev, template_key: value }))}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.key} value={template.key}>{template.label}</SelectItem>)}</SelectContent></Select><div className="flex flex-wrap gap-2"><Button onClick={async () => { try { await createBroadcast(form); toast({ title: "Broadcast saved" }) } catch (err) { toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !form.name || !form.subject}>Save</Button><Input placeholder="test@recipient.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="max-w-xs" /><Button variant="outline" onClick={async () => { if (!selectedId || !testEmail) return; try { await sendBroadcastTest(selectedId, testEmail); toast({ title: "Test email sent" }) } catch (err) { toast({ title: "Test failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !selectedId || !testEmail}>Send test</Button><Button variant="destructive" onClick={async () => { if (!selectedId) return; const confirmation = window.prompt("Type SEND to confirm broadcast delivery"); if (confirmation !== "SEND") return; try { await sendBroadcast(selectedId); toast({ title: "Broadcast sent" }) } catch (err) { toast({ title: "Send failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || disableSend}>Send broadcast</Button></div></CardContent></Card></div>}
    </div>
  )
}

function DeliveryTab() {
  const { query, setQuery, items, loading, error, fetchDelivery } = useDelivery()
  return <div className="space-y-4"><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Recipient" value={query.recipient_email || ""} onChange={(e) => setQuery((p) => ({ ...p, recipient_email: e.target.value, offset: 0 }))} /><Select value={query.status || "all"} onValueChange={(value) => setQuery((p) => ({ ...p, status: value === "all" ? "" : value, offset: 0 }))}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="bounced">Bounced</SelectItem></SelectContent></Select></div><SectionState loading={loading} error={error} empty={!items.length} onRetry={fetchDelivery} emptyTitle="No delivery logs for current filters." />{!loading && !error && items.length > 0 && <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.recipient_email}</TableCell><TableCell>{item.subject}</TableCell><TableCell><Badge variant="outline">{item.status}</Badge></TableCell><TableCell>{new Date(item.created_at).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>
}

function SuppressionsTab() {
  const { toast } = useToast()
  const { query, setQuery, items, loading, saving, error, fetchSuppressions, createSuppression } = useSuppressions()
  const [newEmail, setNewEmail] = useState("")

  return <div className="space-y-4"><div className="grid gap-2 md:grid-cols-3"><Input placeholder="Search email" value={query.search || ""} onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, offset: 0 }))} /><Input placeholder="email@domain.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /><Button onClick={async () => { try { await createSuppression({ email: newEmail, type: "bounce" }); setNewEmail(""); toast({ title: "Suppression added" }) } catch (err) { toast({ title: "Add failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !newEmail}>Add suppression</Button></div><SectionState loading={loading} error={error} empty={!items.length} onRetry={fetchSuppressions} emptyTitle="No suppressions configured." />{!loading && !error && items.length > 0 && <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Type</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.email}</TableCell><TableCell>{item.type}</TableCell><TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}</div>
}

function WebhooksTab() {
  const { items, loading, error, fetchWebhooks } = useWebhooks()

  return (
    <div className="space-y-4">
      <SectionState loading={loading} error={error} empty={!items.length} onRetry={fetchWebhooks} emptyTitle="No webhooks configured yet." emptyCta="Create webhook" onEmptyAction={fetchWebhooks} />
      {!loading && !error && items.length > 0 && <Card><CardHeader><CardTitle>Webhook Endpoints</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Status</TableHead><TableHead>Events</TableHead></TableRow></TableHeader><TableBody>{items.map((hook) => <TableRow key={hook.id}><TableCell>{hook.url}</TableCell><TableCell><Badge variant={hook.active ? "default" : "secondary"}>{hook.active ? "active" : "inactive"}</Badge></TableCell><TableCell>{hook.events.join(", ")}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
    </div>
  )
}


function ReplyInboxTab() {
  const { toast } = useToast()
  const { items, loading, saving, error, fetchInbox, applyAction } = useReplyInbox()
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  return (
    <div className="space-y-4">
      <SectionState loading={loading} error={error} empty={!items.length} onRetry={fetchInbox} emptyTitle="No inbound replies waiting." />
      {!loading && !error && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inbound Reply Inbox</CardTitle>
            <CardDescription>Review AI-drafted responses before sending to customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {items.map((item) => (
              <div key={item.id} className="rounded border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.from_email}</p>
                    <p className="text-xs text-muted-foreground">{item.subject || "(no subject)"} • {new Date(item.received_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.latest_status || "drafted"}</Badge>
                    {item.requires_human_review && <Badge>Human review</Badge>}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.text_body || "No text content provided."}</p>
                <Textarea
                  value={drafts[item.id] ?? item.draft_body ?? ""}
                  onChange={(event) => setDrafts((previous) => ({ ...previous, [item.id]: event.target.value }))}
                  placeholder="Draft reply"
                  rows={5}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        await applyAction(item.id, { action: "save_edit", editedBody: drafts[item.id] ?? item.draft_body ?? "" })
                        toast({ title: "Draft saved" })
                      } catch (replyError) {
                        toast({ title: "Save failed", description: (replyError as Error).message, variant: "destructive" })
                      }
                    }}
                  >
                    Save edit
                  </Button>
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        await applyAction(item.id, { action: "approve_send", editedBody: drafts[item.id] ?? item.draft_body ?? "" })
                        toast({ title: "Reply sent" })
                      } catch (replyError) {
                        toast({ title: "Send failed", description: (replyError as Error).message, variant: "destructive" })
                      }
                    }}
                  >
                    Approve & send
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        await applyAction(item.id, { action: "skip" })
                        toast({ title: "Reply skipped" })
                      } catch (replyError) {
                        toast({ title: "Skip failed", description: (replyError as Error).message, variant: "destructive" })
                      }
                    }}
                  >
                    Skip
                  </Button>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Audit trail</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {item.audit.slice(0, 4).map((auditEvent) => (
                      <p key={auditEvent.id}>[{new Date(auditEvent.created_at).toLocaleString()}] {auditEvent.actor_type} {auditEvent.action_type} → {auditEvent.status}{auditEvent.reason ? ` (${auditEvent.reason})` : ""}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SettingsTab({ safety }: { safety: EmailSafetyModeState }) {
  return <Card><CardHeader><CardTitle>Email Delivery Safety</CardTitle><CardDescription>Read-only environment state for delivery guardrails.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Safe mode: <Badge variant={safety.safeMode ? "default" : "secondary"}>{safety.safeMode ? "enabled" : "disabled"}</Badge></p><p>Dry run: <Badge variant={safety.dryRun ? "default" : "secondary"}>{safety.dryRun ? "enabled" : "disabled"}</Badge></p><p>Allowlisted test recipients: {safety.testRecipients.length ? safety.testRecipients.join(", ") : "none configured"}</p><p>Sink mailbox: {safety.sinkRecipient || "not configured"}</p></CardContent></Card>
}

export function EmailManagementDashboard({ safety }: { safety: EmailSafetyModeState }) {
  return (
    <div className="space-y-6">
      <div><h1 className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-3xl font-bold text-transparent">Email Management</h1><p className="mt-2 text-muted-foreground">Modern modular workspace for email operations, metrics, and safety controls.</p></div>
      <EmailMetricsCards />

      <Tabs defaultValue="emails" className="grid gap-4 md:grid-cols-[220px_1fr]">
        <EmailSidebarNav />
        <div className="space-y-4">
          <TabsContent value="emails"><TemplatesTab /></TabsContent>
          <TabsContent value="broadcasts"><BroadcastsTab safety={safety} /></TabsContent>
          <TabsContent value="audiences"><ContactsTab /></TabsContent>
          <TabsContent value="replyInbox"><ReplyInboxTab /></TabsContent>
          <TabsContent value="metrics"><div className="grid gap-4 lg:grid-cols-3"><EmailDeliverabilityPanel /><EmailEngagementPanel /><EmailTimelineChart /></div></TabsContent>
          <TabsContent value="webhooks"><WebhooksTab /></TabsContent>
          <TabsContent value="logs"><Tabs defaultValue="delivery" className="space-y-3"><TabsList><TabsTrigger value="delivery">Delivery Logs</TabsTrigger><TabsTrigger value="suppressions">Suppression Logs</TabsTrigger></TabsList><TabsContent value="delivery"><DeliveryTab /></TabsContent><TabsContent value="suppressions"><SuppressionsTab /></TabsContent></Tabs></TabsContent>
          <TabsContent value="settings"><SettingsTab safety={safety} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
