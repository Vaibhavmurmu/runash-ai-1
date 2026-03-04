"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Fingerprint, Plus, Trash2, Edit3, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { startRegistration } from "@simplewebauthn/browser"
import { useAuthSession } from "@/lib/auth/access-client"

interface PasskeyCredential {
  id: number
  credential_id: string
  name?: string
  device_type: string
  created_at: string
  last_used_at?: string
}

export function PasskeySetup() {
  const { data: session } = useAuthSession()
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")

  useEffect(() => {
    fetchPasskeys()
  }, [])

  const fetchPasskeys = async () => {
    try {
      const response = await fetch("/api/auth/passkey/list")
      if (response.ok) {
        const data = await response.json()
        setPasskeys(data.passkeys || [])
      }
    } catch (error) {
      console.error("Error fetching passkeys:", error)
    }
  }

  const handleCreatePasskey = async () => {
    if (!session?.user) return

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      // Get registration options
      const optionsResponse = await fetch("/api/auth/passkey/register")
      const options = await optionsResponse.json()

      if (!optionsResponse.ok) {
        throw new Error(options.error || "Failed to get registration options")
      }

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options)

      // Verify registration
      const verifyResponse = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: registrationResponse,
          expectedChallenge: options.challenge,
        }),
      })

      const verifyResult = await verifyResponse.json()

      if (verifyResponse.ok) {
        setSuccess("Passkey created successfully!")
        fetchPasskeys()
      } else {
        setError(verifyResult.error || "Failed to create passkey")
      }
    } catch (err: any) {
      console.error("Passkey creation error:", err)
      if (err.name === "NotAllowedError") {
        setError("Passkey creation was cancelled")
      } else if (err.name === "NotSupportedError") {
        setError("Passkeys are not supported on this device")
      } else {
        setError(err.message || "Failed to create passkey")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePasskey = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/auth/passkey/${credentialId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("Passkey deleted successfully")
        fetchPasskeys()
      } else {
        setError("Failed to delete passkey")
      }
    } catch (error) {
      setError("Failed to delete passkey")
    }
  }

  const handleUpdateName = async (credentialId: string, name: string) => {
    try {
      const response = await fetch(`/api/auth/passkey/${credentialId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setSuccess("Passkey name updated")
        setEditingId(null)
        setEditName("")
        fetchPasskeys()
      } else {
        setError("Failed to update passkey name")
      }
    } catch (error) {
      setError("Failed to update passkey name")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Passkey Management</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your passkeys for secure, passwordless authentication
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Your Passkeys</h3>
          <Button
            onClick={handleCreatePasskey}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Passkey
              </div>
            )}
          </Button>
        </div>

        {passkeys.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No passkeys yet</h4>
              <p className="text-gray-600 text-sm">
                Create your first passkey to enable secure, passwordless authentication
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    {editingId === passkey.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter passkey name"
                          className="h-8 w-48"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateName(passkey.credential_id, editName)}
                          className="h-8 px-3"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null)
                            setEditName("")
                          }}
                          className="h-8 px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-gray-900">{passkey.name || `${passkey.device_type} Passkey`}</p>
                        <p className="text-sm text-gray-500">
                          Created {formatDate(passkey.created_at)}
                          {passkey.last_used_at && ` • Last used ${formatDate(passkey.last_used_at)}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(passkey.id)
                      setEditName(passkey.name || "")
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePasskey(passkey.credential_id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            About Passkeys
          </h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>• Passkeys are more secure than passwords</li>
            <li>• They use your device's built-in security (fingerprint, face, PIN)</li>
            <li>• Each passkey is unique and can't be phished or stolen</li>
            <li>• You can create multiple passkeys for different devices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
