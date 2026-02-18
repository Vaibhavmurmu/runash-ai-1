"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart3, Edit, Mail, Plus, RefreshCw, Search, Shield, Trash2, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAnalyticsOverview, useContacts, useDelivery, useSuppressions, useTemplates } from "@/components/email/use-email-management"
import type { ContactPayload, EmailContactRecord, TemplatePayload } from "@/components/email/email-management-types"

interface EmailSafetyModeState {
  safeMode: boolean
  dryRun: boolean
  testRecipients: string[]
  sinkRecipient?: string
}

function SectionState({ loading, error, empty }: { loading: boolean; error: string | null; empty: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (empty) return <p className="text-sm text-muted-foreground">No records found for current filters.</p>
  return null
}

function TemplatesTab() {
  const { toast } = useToast()
  const { query, setQuery, items, total, loading, saving, error, createTemplate, updateTemplate, deleteTemplate } = useTemplates()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<TemplatePayload>({ name: "", subject: "", html_content: "", category: "general" })

  const submitCreate = async () => {
    try {
      await createTemplate(form)
      toast({ title: "Template created" })
      setCreateOpen(false)
      setForm({ name: "", subject: "", html_content: "", category: "general" })
    } catch (createError) {
      toast({ title: "Create failed", description: (createError as Error).message, variant: "destructive" })
    }
  }

  const submitEdit = async () => {
    if (!editingId) return
    try {
      await updateTemplate(editingId, form)
      toast({ title: "Template updated" })
      setEditingId(null)
    } catch (updateError) {
      toast({ title: "Update failed", description: (updateError as Error).message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 w-80" placeholder="Search templates" value={query.search || ""} onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, offset: 0 }))} />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button disabled={saving}><Plus className="h-4 w-4 mr-2" />New Template</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              <Textarea placeholder="HTML content" value={form.html_content} onChange={(e) => setForm((p) => ({ ...p, html_content: e.target.value }))} />
              <Button onClick={submitCreate} disabled={saving || !form.name || !form.subject || !form.html_content}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <SectionState loading={loading} error={error} empty={!items.length} />

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between"><CardTitle className="text-lg">{template.name}</CardTitle><Badge variant="outline">{template.category}</Badge></div>
                <CardDescription>{template.subject}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Updated {new Date(template.updated_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={saving} onClick={() => { setEditingId(template.id); setForm({ name: template.name, subject: template.subject, html_content: template.html_content, text_content: template.text_content || undefined, category: template.category }) }}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                  <Button variant="outline" size="sm" disabled={saving} onClick={async () => { try { await deleteTemplate(template.id); toast({ title: "Template deleted" }) } catch (err) { toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" }) } }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
            <Textarea placeholder="HTML content" value={form.html_content} onChange={(e) => setForm((p) => ({ ...p, html_content: e.target.value }))} />
            <Button onClick={submitEdit} disabled={saving || !form.name || !form.subject || !form.html_content}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total {total} templates</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={loading || query.offset === 0} onClick={() => setQuery((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={loading || query.offset + query.limit >= total} onClick={() => setQuery((p) => ({ ...p, offset: p.offset + p.limit }))}>Next</Button>
        </div>
      </div>
    </div>
  )
}

function DeliveryTab() {
  const { query, setQuery, items, total, loading, error } = useDelivery()
  return <div className="space-y-4"><div className="grid gap-2 md:grid-cols-2"><Input placeholder="Recipient" value={query.recipient_email || ""} onChange={(e) => setQuery((p) => ({ ...p, recipient_email: e.target.value, offset: 0 }))} /><Select value={query.status || "all"} onValueChange={(value) => setQuery((p) => ({ ...p, status: value === "all" ? "" : value, offset: 0 }))}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="bounced">Bounced</SelectItem></SelectContent></Select></div><SectionState loading={loading} error={error} empty={!items.length} />{!loading && !error && items.length > 0 && <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Recipient</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.recipient_email}</TableCell><TableCell>{item.subject}</TableCell><TableCell><Badge variant="outline">{item.status}</Badge></TableCell><TableCell>{new Date(item.created_at).toLocaleString()}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}<div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total {total} delivery records</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || query.offset === 0} onClick={() => setQuery((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button><Button variant="outline" size="sm" disabled={loading || query.offset + query.limit >= total} onClick={() => setQuery((p) => ({ ...p, offset: p.offset + p.limit }))}>Next</Button></div></div></div>
}

function SuppressionsTab() {
  const { toast } = useToast()
  const { query, setQuery, items, total, loading, saving, error, createSuppression, deleteSuppression } = useSuppressions()
  const [newEmail, setNewEmail] = useState("")
  const [newType, setNewType] = useState("bounce")

  return <div className="space-y-4"><div className="grid gap-2 md:grid-cols-3"><Input placeholder="Search email" value={query.search || ""} onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, offset: 0 }))} /><Select value={query.type || "all"} onValueChange={(value) => setQuery((p) => ({ ...p, type: value === "all" ? "" : value, offset: 0 }))}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="bounce">Bounce</SelectItem><SelectItem value="unsubscribe">Unsubscribe</SelectItem><SelectItem value="complaint">Complaint</SelectItem></SelectContent></Select><div className="flex gap-2"><Input placeholder="email@domain.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /><Select value={newType} onValueChange={setNewType}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bounce">Bounce</SelectItem><SelectItem value="unsubscribe">Unsubscribe</SelectItem><SelectItem value="complaint">Complaint</SelectItem></SelectContent></Select><Button onClick={async () => { try { await createSuppression({ email: newEmail, type: newType }); setNewEmail(""); toast({ title: "Suppression added" }) } catch (err) { toast({ title: "Add failed", description: (err as Error).message, variant: "destructive" }) } }} disabled={saving || !newEmail}>Add</Button></div></div><SectionState loading={loading} error={error} empty={!items.length} />{!loading && !error && items.length > 0 && <Card><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Type</TableHead><TableHead>Permanent</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.id}><TableCell>{item.email}</TableCell><TableCell>{item.type}</TableCell><TableCell>{item.is_permanent ? "Yes" : "No"}</TableCell><TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell><TableCell><Button variant="outline" size="sm" disabled={saving} onClick={async () => { try { await deleteSuppression(item.email); toast({ title: "Suppression removed" }) } catch (err) { toast({ title: "Remove failed", description: (err as Error).message, variant: "destructive" }) } }}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}<div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Total {total} suppressions</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || query.offset === 0} onClick={() => setQuery((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button><Button variant="outline" size="sm" disabled={loading || query.offset + query.limit >= total} onClick={() => setQuery((p) => ({ ...p, offset: p.offset + p.limit }))}>Next</Button></div></div></div>
}

function ContactsTab() {
  const { toast } = useToast()
  const { query, setQuery, items, total, loading, saving, error, lastImportSummary, createContact, updateContact, deleteContact, importContacts } = useContacts()
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmailContactRecord | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [form, setForm] = useState<ContactPayload>({ email: "", name: "", status: "subscribed", source: "manual", tags: [] })

  const openCreateModal = () => {
    setEditingContact(null)
    setForm({ email: "", name: "", status: "subscribed", source: "manual", tags: [] })
    setContactModalOpen(true)
  }

  const openEditModal = (contact: EmailContactRecord) => {
    setEditingContact(contact)
    setForm({ email: contact.email, name: contact.name || "", status: contact.status, source: contact.source || "manual", metadata: contact.metadata, tags: contact.tags })
    setContactModalOpen(true)
  }

  const saveContact = async () => {
    try {
      const payload = { ...form, tags: form.tags || [] }
      if (editingContact) {
        await updateContact(editingContact.id, payload)
        toast({ title: "Contact updated" })
      } else {
        await createContact(payload)
        toast({ title: "Contact created" })
      }
      setContactModalOpen(false)
    } catch (saveError) {
      toast({ title: "Save failed", description: (saveError as Error).message, variant: "destructive" })
    }
  }

  const runImport = async () => {
    if (!importFile) return
    try {
      await importContacts({ file: importFile, defaultStatus: "subscribed", source: "csv_import", updateExisting: true })
      toast({ title: "Import completed" })
      setImportFile(null)
    } catch (importError) {
      toast({ title: "Import failed", description: (importError as Error).message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Search contacts" value={query.search || ""} onChange={(e) => setQuery((p) => ({ ...p, search: e.target.value, offset: 0 }))} />
        <Select value={query.status || "all"} onValueChange={(value) => setQuery((p) => ({ ...p, status: value === "all" ? "" : value, offset: 0 }))}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="subscribed">Subscribed</SelectItem><SelectItem value="unsubscribed">Unsubscribed</SelectItem><SelectItem value="bounced">Bounced</SelectItem><SelectItem value="suppressed">Suppressed</SelectItem></SelectContent>
        </Select>
        <Input placeholder="Tags (comma separated)" value={query.tags || ""} onChange={(e) => setQuery((p) => ({ ...p, tags: e.target.value, offset: 0 }))} />
        <div className="flex gap-2"><Button onClick={openCreateModal} disabled={saving}><Plus className="h-4 w-4 mr-1" />Add Contact</Button><Button variant="outline" disabled={saving || !importFile} onClick={runImport}><Upload className="h-4 w-4 mr-1" />Import CSV</Button></div>
      </div>

      <div className="flex items-center gap-2">
        <Input type="file" accept=".csv,text/csv" className="max-w-sm" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
        {importFile && <span className="text-xs text-muted-foreground">{importFile.name}</span>}
      </div>

      {lastImportSummary && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <p>Import summary: {lastImportSummary.created_count} created, {lastImportSummary.updated_count} updated, {lastImportSummary.duplicate_count} duplicates, {lastImportSummary.invalid_count} invalid.</p>
          </CardContent>
        </Card>
      )}

      <SectionState loading={loading} error={error} empty={!items.length} />
      {!loading && !error && items.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Tags</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {items.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.name || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{contact.status}</Badge></TableCell>
                    <TableCell>{contact.tags.length ? contact.tags.join(", ") : "-"}</TableCell>
                    <TableCell>{new Date(contact.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" disabled={saving} onClick={() => openEditModal(contact)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" disabled={saving} onClick={async () => { try { await deleteContact(contact.id); toast({ title: "Contact deleted" }) } catch (deleteError) { toast({ title: "Delete failed", description: (deleteError as Error).message, variant: "destructive" }) } }}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingContact ? "Edit contact" : "Add contact"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Email" value={form.email || ""} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input placeholder="Name" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Select value={form.status || "subscribed"} onValueChange={(value) => setForm((p) => ({ ...p, status: value as ContactPayload["status"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="subscribed">Subscribed</SelectItem><SelectItem value="unsubscribed">Unsubscribed</SelectItem><SelectItem value="bounced">Bounced</SelectItem><SelectItem value="suppressed">Suppressed</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Tags (comma separated)" value={(form.tags || []).join(",")} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} />
            <Button onClick={saveContact} disabled={saving || !form.email}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total {total} contacts</span>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={loading || query.offset === 0} onClick={() => setQuery((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>Previous</Button><Button variant="outline" size="sm" disabled={loading || query.offset + query.limit >= total} onClick={() => setQuery((p) => ({ ...p, offset: p.offset + p.limit }))}>Next</Button></div>
      </div>
    </div>
  )
}

function SettingsTab({ safety }: { safety: EmailSafetyModeState }) {
  const { overview, loading, error } = useAnalyticsOverview()
  if (loading) return <SectionState loading={loading} error={null} empty={false} />
  if (error || !overview) return <p className="text-sm text-red-600">{error || "Analytics unavailable"}</p>

  return <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Delivery Overview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Total sent: {overview.total_sent.toLocaleString()}</p><p>Delivered: {overview.delivered.toLocaleString()} ({overview.delivery_rate.toFixed(1)}%)</p><p>Bounced: {overview.bounced.toLocaleString()} ({overview.bounce_rate.toFixed(1)}%)</p></CardContent></Card><Card><CardHeader><CardTitle>Engagement Overview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Opened: {overview.opened.toLocaleString()} ({overview.open_rate.toFixed(1)}%)</p><p>Clicked: {overview.clicked.toLocaleString()} ({overview.click_rate.toFixed(1)}%)</p><p>Unsubscribed: {overview.unsubscribed.toLocaleString()} ({overview.unsubscribe_rate.toFixed(1)}%)</p></CardContent></Card><Card className="md:col-span-2"><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Email Delivery Safety</CardTitle><CardDescription>Read-only environment state for delivery guardrails.</CardDescription></div><Badge variant="outline">Read only</Badge></CardHeader><CardContent className="space-y-2 text-sm"><p>Safe mode: <Badge variant={safety.safeMode ? "default" : "secondary"}>{safety.safeMode ? "enabled" : "disabled"}</Badge></p><p>Dry run: <Badge variant={safety.dryRun ? "default" : "secondary"}>{safety.dryRun ? "enabled" : "disabled"}</Badge></p><p>Allowlisted test recipients: {safety.testRecipients.length ? safety.testRecipients.join(", ") : "none configured"}</p><p>Sink mailbox: {safety.sinkRecipient || "not configured"}</p></CardContent></Card></div>
}

export function EmailManagementDashboard({ safety }: { safety: EmailSafetyModeState }) {
  const { overview } = useAnalyticsOverview()
  const stats = useMemo(() => ({ sent: overview?.total_sent ?? 0, deliveryRate: overview?.delivery_rate ?? 0, openRate: overview?.open_rate ?? 0, bounced: overview?.bounced ?? 0 }), [overview])

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Email Management</h1><p className="text-muted-foreground mt-2">Manage templates, contacts, delivery logs, suppressions, and settings</p></div>
      <div className="grid gap-4 md:grid-cols-4"><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Total Sent</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.sent.toLocaleString()}</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Delivery Rate</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Open Rate</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Suppressed (bounced)</CardTitle><Shield className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.bounced.toLocaleString()}</div></CardContent></Card></div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="suppressions">Suppressions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="delivery"><DeliveryTab /></TabsContent>
        <TabsContent value="suppressions"><SuppressionsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab safety={safety} /></TabsContent>
      </Tabs>
    </div>
  )
}
