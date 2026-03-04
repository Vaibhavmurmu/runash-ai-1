"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Cloud,
  Download,
  Upload,
  Wifi,
  WifiOff,
  HardDrive,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react"

interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  pendingUploads: number
  pendingDownloads: number
  storageUsed: number
  storageLimit: number
  autoSync: boolean
  syncInProgress: boolean
}

interface StorageItem {
  id: string
  type: "stream" | "product" | "user-data"
  name: string
  size: number
  lastAccessed: Date
  synced: boolean
}

export default function OfflineSyncManager() {
  const { toast } = useToast()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: new Date(),
    pendingUploads: 3,
    pendingDownloads: 1,
    storageUsed: 2.4,
    storageLimit: 5.0,
    autoSync: true,
    syncInProgress: false,
  })

  const [storageItems] = useState<StorageItem[]>([
    {
      id: "1",
      type: "stream",
      name: "Organic Farming Techniques",
      size: 0.8,
      lastAccessed: new Date(),
      synced: true,
    },
    {
      id: "2",
      type: "product",
      name: "Kerala Spices Collection",
      size: 0.3,
      lastAccessed: new Date(Date.now() - 86400000),
      synced: false,
    },
    {
      id: "3",
      type: "user-data",
      name: "User Preferences",
      size: 0.1,
      lastAccessed: new Date(),
      synced: true,
    },
  ])

  useEffect(() => {
    // Simulate network status changes
    const handleOnline = () => setSyncStatus((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setSyncStatus((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleManualSync = async () => {
    setSyncStatus((prev) => ({ ...prev, syncInProgress: true }))

    // Simulate sync process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setSyncStatus((prev) => ({
      ...prev,
      syncInProgress: false,
      lastSync: new Date(),
      pendingUploads: 0,
      pendingDownloads: 0,
    }))

    toast({
      title: "Sync Complete",
      description: "All data has been synchronized successfully.",
    })
  }

  const toggleAutoSync = (enabled: boolean) => {
    setSyncStatus((prev) => ({ ...prev, autoSync: enabled }))
    toast({
      title: enabled ? "Auto-sync Enabled" : "Auto-sync Disabled",
      description: enabled ? "Data will sync automatically when online." : "Manual sync required for updates.",
    })
  }

  const clearStorage = () => {
    toast({
      title: "Storage Cleared",
      description: "Offline data has been removed to free up space.",
    })
  }

  const formatFileSize = (sizeInGB: number) => {
    if (sizeInGB < 1) {
      return `${(sizeInGB * 1024).toFixed(0)} MB`
    }
    return `${sizeInGB.toFixed(1)} GB`
  }

  const getStoragePercentage = () => {
    return (syncStatus.storageUsed / syncStatus.storageLimit) * 100
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "stream":
        return <Download className="h-4 w-4" />
      case "product":
        return <HardDrive className="h-4 w-4" />
      case "user-data":
        return <Settings className="h-4 w-4" />
      default:
        return <HardDrive className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Sync Status
            <Badge variant={syncStatus.isOnline ? "default" : "destructive"}>
              {syncStatus.isOnline ? "Online" : "Offline"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <Upload className="h-4 w-4" />
                Pending Uploads
              </div>
              <div className="text-2xl font-bold">{syncStatus.pendingUploads}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <Download className="h-4 w-4" />
                Pending Downloads
              </div>
              <div className="text-2xl font-bold">{syncStatus.pendingDownloads}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                Last Sync
              </div>
              <div className="text-sm font-medium">{syncStatus.lastSync?.toLocaleTimeString() || "Never"}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <HardDrive className="h-4 w-4" />
                Storage Used
              </div>
              <div className="text-sm font-medium">
                {formatFileSize(syncStatus.storageUsed)} / {formatFileSize(syncStatus.storageLimit)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Storage Usage</span>
              <span>{getStoragePercentage().toFixed(1)}%</span>
            </div>
            <Progress value={getStoragePercentage()} className="h-2" />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleManualSync}
              disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
              className="flex-1"
            >
              {syncStatus.syncInProgress ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              {syncStatus.syncInProgress ? "Syncing..." : "Sync Now"}
            </Button>
            <Button variant="outline" onClick={clearStorage}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Storage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Management */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="storage">Storage Details</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync">Auto Sync</Label>
                  <div className="text-sm text-gray-500">Automatically sync when online</div>
                </div>
                <Switch id="auto-sync" checked={syncStatus.autoSync} onCheckedChange={toggleAutoSync} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Sync Preferences</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sync on WiFi only</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Background sync</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compress data</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {storageItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(item.type)}
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(item.size)} • Last accessed {item.lastAccessed.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.synced ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
