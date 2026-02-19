"use client"
import { useEffect, useState } from "react"
import { useAuthSession } from "@/lib/auth/access-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

type User = {
  id: string
  email: string
  name: string | null
  role: "user" | "admin"
}

export default function UsersPage() {
  const { data: session } = useAuthSession()
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState({ email: "", name: "", role: "user", password: "" })

  const isAdmin = (session?.user as any)?.role === "admin"

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      const r = await fetch("/api/users", { cache: "no-store" })
      if (r.ok) setUsers((await r.json()) as User[])
    })()
  }, [isAdmin])

  if (!session?.user) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Sign in to manage users</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild><a href="/login?callbackUrl=/admin/users">Sign in</a></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>You must be an admin to view this page.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <Button
            onClick={async () => {
              const r = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              })
              if (r.ok) {
                const created = (await r.json()) as User
                setUsers((u) => [created, ...u])
                setForm({ email: "", name: "", role: "user", password: "" })
              } else {
                alert("Failed to create user")
              }
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.length === 0 ? (
            <div className="text-sm text-muted-foreground">No users found.</div>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between border rounded p-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.name || "—"} • {u.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        const r = await fetch(`/api/users/${u.id}`, { method: "DELETE" })
                        if (r.ok) setUsers((x) => x.filter((y) => y.id !== u.id))
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
