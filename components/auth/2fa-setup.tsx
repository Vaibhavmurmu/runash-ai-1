"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Smartphone,
  Mail,
  QrCode,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Key,
  RefreshCw,
} from "lucide-react"
import { useAuthSession } from "@/lib/auth/access-client"
import Image from "next/image"

interface BackupCodesStatus {
  total: number
  used: number
  remaining: number
  lastGenerated?: string
}

export function TwoFactorSetup() {
  const { data: session } = useAuthSession()
  const [activeTab, setActiveTab] = useState("totp")
  const [step, setStep] = useState<"setup" | "verify" | "complete">("setup")

  // TOTP states
  const [totpSecret, setTotpSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [manualEntryKey, setManualEntryKey] = useState("")
  const [totpCode, setTotpCode] = useState("")

  // General states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [backupCodesStatus, setBackupCodesStatus] = useState<BackupCodesStatus>({
    total: 0,
    used: 0,
    remaining: 0,
  })

  useEffect(() => {
    fetchBackupCodesStatus()
  }, [])

  const fetchBackupCodesStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/backup-codes")
      if (response.ok) {
        const status = await response.json()
        setBackupCodesStatus(status)
      }
    } catch (error) {
      console.error("Error fetching backup codes status:", error)
    }
  }

  const handleTOTPSetup = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/setup?method=totp")
      const data = await response.json()

      if (response.ok) {
        setTotpSecret(data.secret)
        setQrCodeUrl(data.qrCodeUrl)
        setManualEntryKey(data.manualEntryKey)
        setStep("verify")
      } else {
        setError(data.error || "Failed to setup TOTP")
      }
    } catch (error) {
      setError("Failed to setup TOTP")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTPVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "totp",
          totpCode,
          totpSecret,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("TOTP 2FA enabled successfully!")
        setStep("complete")
        // Generate backup codes
        await generateBackupCodes()
      } else {
        setError(data.error || "Failed to verify TOTP code")
      }
    } catch (error) {
      setError("Failed to verify TOTP code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSMSSetup = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "sms",
          phoneNumber: "+1234567890", // This should come from user input
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("SMS 2FA enabled successfully!")
        setStep("complete")
        await generateBackupCodes()
      } else {
        setError(data.error || "Failed to setup SMS 2FA")
      }
    } catch (error) {
      setError("Failed to setup SMS 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSetup = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "email",
          email: session?.user?.email,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Email 2FA enabled successfully!")
        setStep("complete")
        await generateBackupCodes()
      } else {
        setError(data.error || "Failed to setup Email 2FA")
      }
    } catch (error) {
      setError("Failed to setup Email 2FA")
    } finally {
      setIsLoading(false)
    }
  }

  const generateBackupCodes = async () => {
    try {
      const response = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setBackupCodes(data.backupCodes)
        await fetchBackupCodesStatus()
      }
    } catch (error) {
      console.error("Error generating backup codes:", error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess("Copied to clipboard!")
    setTimeout(() => setSuccess(""), 2000)
  }

  const downloadBackupCodes = () => {
    const content = `Runash.in Two-Factor Authentication Backup Codes

Generated: ${new Date().toLocaleString()}
Account: ${session?.user?.email}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Instructions:
- Use these codes if you lose access to your authenticator app
- Each code can only be used once
- Generate new codes if you run out
- Keep these codes secure and private`

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `runash-backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">2FA Setup Complete!</CardTitle>
          <CardDescription className="text-gray-600">
            Your account is now protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {backupCodes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  <strong>Important:</strong> Save these backup codes in a safe place. You'll need them if you lose
                  access to your authenticator.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Backup Recovery Codes
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(backupCodes.join("\n"))}
                      className="h-8"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadBackupCodes} className="h-8 bg-transparent">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-white p-2 rounded border text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              Continue to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "verify" && activeTab === "totp") {
    return (
      <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
            Verify Authenticator
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totpCode" className="text-sm font-medium text-gray-700">
                Verification Code
              </Label>
              <Input
                id="totpCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-lg font-mono bg-white/50 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleTOTPVerify}
              disabled={isLoading || totpCode.length !== 6}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                "Verify & Enable 2FA"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setStep("setup")}
              className="w-full text-gray-600 hover:text-gray-700"
            >
              Back to Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900">Two-Factor Authentication</CardTitle>
            <CardDescription className="text-gray-600">Add an extra layer of security to your account</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="totp" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Authenticator App</h3>
              <p className="text-gray-600 text-sm">
                Use an authenticator app like Google Authenticator, Authy, or 1Password to generate secure codes.
              </p>

              {qrCodeUrl ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <Image src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" width={200} height={200} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Or enter this code manually:</p>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <code className="flex-1 text-sm font-mono text-center">{manualEntryKey}</code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(manualEntryKey)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleTOTPSetup}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Setting up...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Setup Authenticator
                    </div>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">SMS Authentication</h3>
              <p className="text-gray-600 text-sm">Receive verification codes via text message to your phone.</p>
              <Button
                onClick={handleSMSSetup}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Enable SMS 2FA
                  </div>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Email Authentication</h3>
              <p className="text-gray-600 text-sm">Receive verification codes via email to {session?.user?.email}.</p>
              <Button
                onClick={handleEmailSetup}
                disabled={isLoading}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Setting up...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Enable Email 2FA
                  </div>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-6">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-6">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Backup Codes Status */}
        {backupCodesStatus.total > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Backup Codes
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={generateBackupCodes}
                className="h-8 bg-transparent"
                disabled={isLoading}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Regenerate
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <Badge variant="outline" className="bg-white">
                {backupCodesStatus.remaining} remaining
              </Badge>
              <Badge variant="outline" className="bg-white">
                {backupCodesStatus.used} used
              </Badge>
              {backupCodesStatus.lastGenerated && (
                <span>Generated {new Date(backupCodesStatus.lastGenerated).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Why Enable 2FA?
          </h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>• Protects your account even if your password is compromised</li>
            <li>• Prevents unauthorized access to your sensitive data</li>
            <li>• Required for accessing certain premium features</li>
            <li>• Industry standard security practice</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
