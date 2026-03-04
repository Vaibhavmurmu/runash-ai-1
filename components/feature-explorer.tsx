"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Zap, Shield, Users, Layers, Globe } from "lucide-react"

export default function FeatureExplorer() {
  const [videoQuality, setVideoQuality] = useState(70)
  const [noiseReduction, setNoiseReduction] = useState(50)
  const [autoEnhance, setAutoEnhance] = useState(true)
  const [virtualBackground, setVirtualBackground] = useState(false)
  const [contentFilter, setContentFilter] = useState(true)
  const [multiPlatform, setMultiPlatform] = useState(false)
  const [audioClarity, setAudioClarity] = useState(75)
  const [micSensitivity, setMicSensitivity] = useState(60)
  const [echoCancellation, setEchoCancellation] = useState(true)
  const [audioProfile, setAudioProfile] = useState("balanced")
  const [livePolls, setLivePolls] = useState(true)
  const [chatSlowMode, setChatSlowMode] = useState(10)
  const [engagementAlerts, setEngagementAlerts] = useState(true)
  const [highlightStyle, setHighlightStyle] = useState("cinematic")
  const [captionLatency, setCaptionLatency] = useState(35)
  const [translationLanguage, setTranslationLanguage] = useState("spanish")
  const [autoCaption, setAutoCaption] = useState(true)
  const [translationTone, setTranslationTone] = useState("conversational")

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200/50 dark:border-orange-800/30 overflow-hidden shadow-xl">
      <Tabs defaultValue="video" className="w-full">
        <div className="bg-orange-50 dark:bg-orange-950/30 p-4 border-b border-orange-200/50 dark:border-orange-800/30">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-white/50 dark:bg-gray-900/50">
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Video
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Audio
            </TabsTrigger>
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Moderation
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Engagement
            </TabsTrigger>
            <TabsTrigger value="platforms" className="flex items-center gap-2">
              <Layers className="h-4 w-4" /> Platforms
            </TabsTrigger>
            <TabsTrigger value="translation" className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> Translation
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-6">
          <TabsContent value="video" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Video Enhancement</h3>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="video-quality" className="text-gray-700 dark:text-gray-300">
                        Enhancement Level: {videoQuality}%
                      </Label>
                    </div>
                    <Slider
                      id="video-quality"
                      min={0}
                      max={100}
                      step={1}
                      value={[videoQuality]}
                      onValueChange={(value) => setVideoQuality(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="noise-reduction" className="text-gray-700 dark:text-gray-300">
                        Noise Reduction: {noiseReduction}%
                      </Label>
                    </div>
                    <Slider
                      id="noise-reduction"
                      min={0}
                      max={100}
                      step={1}
                      value={[noiseReduction]}
                      onValueChange={(value) => setNoiseReduction(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-enhance" checked={autoEnhance} onCheckedChange={setAutoEnhance} />
                    <Label htmlFor="auto-enhance" className="text-gray-700 dark:text-gray-300">
                      Auto-enhance based on conditions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="virtual-bg" checked={virtualBackground} onCheckedChange={setVirtualBackground} />
                    <Label htmlFor="virtual-bg" className="text-gray-700 dark:text-gray-300">
                      Enable virtual background
                    </Label>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Video preview would appear here</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Enhancement Level: {videoQuality}% | Noise Reduction: {noiseReduction}%
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {autoEnhance ? "Auto-enhance: ON" : "Auto-enhance: OFF"} |{" "}
                      {virtualBackground ? "Virtual Background: ON" : "Virtual Background: OFF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="moderation" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Content Moderation</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="content-filter" checked={contentFilter} onCheckedChange={setContentFilter} />
                    <Label htmlFor="content-filter" className="text-gray-700 dark:text-gray-300">
                      Enable content filtering
                    </Label>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Content Filter Settings</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Our AI content filter helps ensure your streams comply with platform guidelines by detecting and
                      alerting you to potentially problematic content.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Content moderation preview would appear here</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {contentFilter ? "Content Filter: ON" : "Content Filter: OFF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Multi-platform Streaming</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="multi-platform" checked={multiPlatform} onCheckedChange={setMultiPlatform} />
                    <Label htmlFor="multi-platform" className="text-gray-700 dark:text-gray-300">
                      Enable multi-platform streaming
                    </Label>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Platform Selection</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Stream to multiple platforms simultaneously with optimized settings for each platform.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Platform selection would appear here</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {multiPlatform ? "Multi-platform: ON" : "Multi-platform: OFF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Audio Enhancement</h3>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="audio-clarity" className="text-gray-700 dark:text-gray-300">
                        Voice Clarity: {audioClarity}%
                      </Label>
                    </div>
                    <Slider
                      id="audio-clarity"
                      min={0}
                      max={100}
                      step={1}
                      value={[audioClarity]}
                      onValueChange={(value) => setAudioClarity(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="mic-sensitivity" className="text-gray-700 dark:text-gray-300">
                        Mic Sensitivity: {micSensitivity}%
                      </Label>
                    </div>
                    <Slider
                      id="mic-sensitivity"
                      min={0}
                      max={100}
                      step={1}
                      value={[micSensitivity]}
                      onValueChange={(value) => setMicSensitivity(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="echo-cancellation" checked={echoCancellation} onCheckedChange={setEchoCancellation} />
                    <Label htmlFor="echo-cancellation" className="text-gray-700 dark:text-gray-300">
                      Enable echo cancellation
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audio-profile" className="text-gray-700 dark:text-gray-300">
                      Audio Profile
                    </Label>
                    <Select value={audioProfile} onValueChange={setAudioProfile}>
                      <SelectTrigger id="audio-profile" className="w-full">
                        <SelectValue placeholder="Select profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="speech">Speech Focused</SelectItem>
                        <SelectItem value="music">Music Rich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Audio mix preview panel</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Voice Clarity: {audioClarity}% | Mic Sensitivity: {micSensitivity}%
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {echoCancellation ? "Echo Cancellation: ON" : "Echo Cancellation: OFF"} | Profile: {audioProfile}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Audience Engagement</h3>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="chat-slow-mode" className="text-gray-700 dark:text-gray-300">
                        Chat Slow Mode: {chatSlowMode}s
                      </Label>
                    </div>
                    <Slider
                      id="chat-slow-mode"
                      min={0}
                      max={30}
                      step={1}
                      value={[chatSlowMode]}
                      onValueChange={(value) => setChatSlowMode(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="live-polls" checked={livePolls} onCheckedChange={setLivePolls} />
                    <Label htmlFor="live-polls" className="text-gray-700 dark:text-gray-300">
                      Enable live polls
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="engagement-alerts" checked={engagementAlerts} onCheckedChange={setEngagementAlerts} />
                    <Label htmlFor="engagement-alerts" className="text-gray-700 dark:text-gray-300">
                      Smart engagement alerts
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="highlight-style" className="text-gray-700 dark:text-gray-300">
                      Highlight Style
                    </Label>
                    <Select value={highlightStyle} onValueChange={setHighlightStyle}>
                      <SelectTrigger id="highlight-style" className="w-full">
                        <SelectValue placeholder="Select highlight style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Engagement dashboard preview</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Slow Mode: {chatSlowMode}s | Highlight Style: {highlightStyle}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {livePolls ? "Live Polls: ON" : "Live Polls: OFF"} | {engagementAlerts ? "Alerts: ON" : "Alerts: OFF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="translation" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Live Translation</h3>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="caption-latency" className="text-gray-700 dark:text-gray-300">
                        Caption Latency Target: {captionLatency}ms
                      </Label>
                    </div>
                    <Slider
                      id="caption-latency"
                      min={10}
                      max={100}
                      step={1}
                      value={[captionLatency]}
                      onValueChange={(value) => setCaptionLatency(value[0])}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="translation-language" className="text-gray-700 dark:text-gray-300">
                      Output Language
                    </Label>
                    <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
                      <SelectTrigger id="translation-language" className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spanish">Spanish</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="translation-tone" className="text-gray-700 dark:text-gray-300">
                      Translation Tone
                    </Label>
                    <Select value={translationTone} onValueChange={setTranslationTone}>
                      <SelectTrigger id="translation-tone" className="w-full">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-caption" checked={autoCaption} onCheckedChange={setAutoCaption} />
                    <Label htmlFor="auto-caption" className="text-gray-700 dark:text-gray-300">
                      Auto-generate captions
                    </Label>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200/50 dark:border-orange-800/30">
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="text-gray-500 dark:text-gray-400">Translation state preview</div>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Language: {translationLanguage} | Tone: {translationTone}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Latency Target: {captionLatency}ms | {autoCaption ? "Auto Captions: ON" : "Auto Captions: OFF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
