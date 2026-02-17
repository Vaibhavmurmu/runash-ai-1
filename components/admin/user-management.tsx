"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Edit, Trash2, Shield, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"

interface User {
  id: number
  name: string | null
  username: string | null
  email: string
  role: string | null
  email_verified: boolean
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  provider: string | null
  created_at: string
  is_admin: boolean
  admin_role?: string
}

interface UserFilters {
  search: string
  role: string
  email_verified: string
  provider: string
  is_admin: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "all", // Updated default value
    email_verified: "all", // Updated default value
    provider: "all", // Updated default value
    is_admin: "all", // Updated default value
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [userStats, setUserStats] = useState<any>(null)

  useEffect(() => {
    fetchUsers()
    fetchUserStats()
  }, [currentPage, filters])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== "all")),
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      if (response.ok) {
        setUsers(data.users)
        setTotalPages(data.totalPages)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/admin/users/stats")
      const data = await response.json()
      if (response.ok) {
        setUserStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error)
    }
  }

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User updated successfully",
        })
        setShowEditDialog(false)
        setEditingUser(null)
        fetchUsers()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to update user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
        fetchUsers()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Please select users first",
        variant: "destructive",
      })
      return
    }

    // Implement bulk actions
    console.log(`Bulk action: ${action} for users:`, selectedUsers)
  }

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "moderator":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "premium":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.overview.total_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.overview.verified_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.overview.admin_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.overview.new_users_30d}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.overview.new_users_7d}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage users, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="viewer">Viewer (baseline)</SelectItem>
                  <SelectItem value="operator">Operator (baseline)</SelectItem>
                  <SelectItem value="admin">Admin (baseline)</SelectItem>
                  <SelectItem value="user">User (legacy)</SelectItem>
                  <SelectItem value="premium">Premium (legacy)</SelectItem>
                  <SelectItem value="moderator">Moderator (legacy)</SelectItem>
                  <SelectItem value="guest">Guest (legacy)</SelectItem>
                  <SelectItem value="super_admin">Super Admin (legacy)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.email_verified}
                onValueChange={(value) => setFilters({ ...filters, email_verified: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Verified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.provider} onValueChange={(value) => setFilters({ ...filters, provider: value })}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="credentials">Email</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="github">GitHub</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("verify")}>
                Verify Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("disable")}>
                Disable
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("delete")}>
                Delete
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(users.map((u) => u.id))
                          } else {
                            setSelectedUsers([])
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Provider</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback>{user.name?.charAt(0) || user.email.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name || user.username || "No name"}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.is_admin ? user.admin_role : user.role || "user"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {user.email_verified ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Unverified
                              </Badge>
                            )}
                            {user.is_admin && <Shield className="h-4 w-4 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{user.provider || "email"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingUser(user)
                                  setShowEditDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <EditUserForm user={editingUser} onSave={handleEditUser} onCancel={() => setShowEditDialog(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditUserForm({
  user,
  onSave,
  onCancel,
}: {
  user: User
  onSave: (data: Partial<User>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    username: user.username || "",
    email: user.email,
    role: user.role || "user",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer (baseline)</SelectItem>
            <SelectItem value="operator">Operator (baseline)</SelectItem>
            <SelectItem value="admin">Admin (baseline)</SelectItem>
            <SelectItem value="user">User (legacy)</SelectItem>
            <SelectItem value="premium">Premium (legacy)</SelectItem>
            <SelectItem value="moderator">Moderator (legacy)</SelectItem>
            <SelectItem value="guest">Guest (legacy)</SelectItem>
            <SelectItem value="super_admin">Super Admin (legacy)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  )
}
