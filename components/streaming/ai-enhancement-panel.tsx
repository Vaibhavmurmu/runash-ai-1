"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Wand2, Sparkles, ImageIcon, Sliders } from "lucide-react"
import VirtualBackgrounds from "./virtual-backgrounds"

interface AIEnhancementPanelProps {
  streamId?: string
}

export default function AIEnhancementPanel({ streamId = "studio-default" }: AIEnhancementPanelProps) {
  const [activeTab, setActiveTab] = useState("backgrounds")
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null)
  const [blurAmount, setBlurAmount] = useState(0)

  // Enhancement settings
  const [enhancementSettings, setEnhancementSettings] = useState({
    beautify: 50,
    lighting: 50,
    denoise: 50,
    sharpness: 50,
    aiUpscale: true,
    autoFraming: true,
    eyeContact: false,
  })

  const handleSettingChange = (setting: string, value: number | boolean) => {
    setEnhancementSettings((prev) => ({
      ...prev,
      [setting]: value,
    }))
  }

  const handleBackgroundSelect = (background: string | null) => {
    setSelectedBackground(background)
  }

  const handleBlurChange = (amount: number) => {
    setBlurAmount(amount)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Wand2 className="h-5 w-5 mr-2 text-orange-500" />
        <h3 className="text-lg font-medium">AI Enhancements</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="backgrounds" className="text-xs">
            <ImageIcon className="h-4 w-4 mr-1" />
            Backgrounds
          </TabsTrigger>
          <TabsTrigger value="enhance" className="text-xs">
            <Sparkles className="h-4 w-4 mr-1" />
            Enhance
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs">
            <Sliders className="h-4 w-4 mr-1" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backgrounds" className="space-y-4 mt-4">
          <VirtualBackgrounds
            streamId={streamId}
            onSelectBackground={handleBackgroundSelect}
            onBlurBackground={handleBlurChange}
            selectedBackground={selectedBackground}
            blurAmount={blurAmount}
          />
        </TabsContent>

        <TabsContent value="enhance" className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="beautify">Beautify</Label>
                <span className="text-xs text-gray-500">{enhancementSettings.beautify}%</span>
              </div>
              <Slider
                id="beautify"
                min={0}
                max={100}
                step={1}
                value={[enhancementSettings.beautify]}
                onValueChange={(value) => handleSettingChange("beautify", value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="lighting">AI Lighting</Label>
                <span className="text-xs text-gray-500">{enhancementSettings.lighting}%</span>
              </div>
              <Slider
                id="lighting"
                min={0}
                max={100}
                step={1}
                value={[enhancementSettings.lighting]}
                onValueChange={(value) => handleSettingChange("lighting", value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="denoise">Noise Reduction</Label>
                <span className="text-xs text-gray-500">{enhancementSettings.denoise}%</span>
              </div>
              <Slider
                id="denoise"
                min={0}
                max={100}
                step={1}
                value={[enhancementSettings.denoise]}
                onValueChange={(value) => handleSettingChange("denoise", value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="sharpness">Sharpness</Label>
                <span className="text-xs text-gray-500">{enhancementSettings.sharpness}%</span>
              </div>
              <Slider
                id="sharpness"
                min={0}
                max={100}
                step={1}
                value={[enhancementSettings.sharpness]}
                onValueChange={(value) => handleSettingChange("sharpness", value[0])}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-upscale">AI Upscaling</Label>
                <p className="text-xs text-gray-500">Enhance low-resolution video</p>
              </div>
              <Switch
                id="ai-upscale"
                checked={enhancementSettings.aiUpscale}
                onCheckedChange={(value) => handleSettingChange("aiUpscale", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-framing">Smart Auto-Framing</Label>
                <p className="text-xs text-gray-500">Keep you centered in frame</p>
              </div>
              <Switch
                id="auto-framing"
                checked={enhancementSettings.autoFraming}
                onCheckedChange={(value) => handleSettingChange("autoFraming", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="eye-contact">AI Eye Contact</Label>
                <p className="text-xs text-gray-500">Simulate eye contact with viewers</p>
              </div>
              <Switch
                id="eye-contact"
                checked={enhancementSettings.eyeContact}
                onCheckedChange={(value) => handleSettingChange("eyeContact", value)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
