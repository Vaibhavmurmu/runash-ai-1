"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function DownloadSettings() {
  const { toast } = useToast()
  const [downloadQuality, setDownloadQuality] = useState("hd")
  const [wifiOnly, setWifiOnly] = useState(true)
  const [autoDownload, setAutoDownload] = useState(false)
  const [storageLimit, setStorageLimit] = useState(10)
  const [autoDelete, setAutoDelete] = useState(false)

  const handleSaveSettings = () => {
    // In a real app, this would save the settings to the server/local storage
    toast({
      title: "Settings saved",
      description: "Your download settings have been updated",
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="mb-3 text-lg font-medium">Download Quality</h3>
              <RadioGroup value={downloadQuality} onValueChange={setDownloadQuality}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hd" id="hd" />
                  <Label htmlFor="hd">HD (1080p) - Best quality, larger file size</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sd" id="sd" />
                  <Label htmlFor="sd">SD (720p) - Good quality, medium file size</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low">Low (480p) - Lower quality, smaller file size</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="audio" id="audio" />
                  <Label htmlFor="audio">Audio only - Smallest file size</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-medium">Download Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="wifi-only">Download on Wi-Fi only</Label>
                    <p className="text-sm text-muted-foreground">
                      Save mobile data by downloading only when connected to Wi-Fi
                    </p>
                  </div>
                  <Switch id="wifi-only" checked={wifiOnly} onCheckedChange={setWifiOnly} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-download">Auto-download subscriptions</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically download new recordings from channels you subscribe to
                    </p>
                  </div>
                  <Switch id="auto-download" checked={autoDownload} onCheckedChange={setAutoDownload} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-medium">Storage Management</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label htmlFor="storage-limit">Storage limit: {storageLimit} GB</Label>
                  </div>
                  <Slider
                    id="storage-limit"
                    min={1}
                    max={50}
                    step={1}
                    value={[storageLimit]}
                    onValueChange={(value) => setStorageLimit(value[0])}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set a limit for how much storage space downloads can use on your device
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-delete">Auto-delete watched recordings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete recordings after you've watched them
                    </p>
                  </div>
                  <Switch id="auto-delete" checked={autoDelete} onCheckedChange={setAutoDelete} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="bg-orange-500 hover:bg-orange-600">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
