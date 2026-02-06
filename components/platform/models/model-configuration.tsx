"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface ModelConfiguratorProps {
  onClose: () => void
}

export default function ModelConfigurator({ onClose }: ModelConfiguratorProps) {
  const [config, setConfig] = useState({
    name: "",
    type: "custom",
    baseModel: "gpt4-vision",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 8000,
    frequency: 0.5,
    presence: 0,
  })

  const handleChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    console.log("Saving model config:", config)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-semibold">Configure Custom Model</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Model Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., My Custom GPT"
              className="w-full px-3 py-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Type</label>
            <div className="flex gap-4">
              {["custom", "open"].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={config.type === type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">{type} Model</span>
                </label>
              ))}
            </div>
          </div>

          {/* Base Model */}
          <div>
            <label className="block text-sm font-semibold mb-2">Base Model</label>
            <select
              value={config.baseModel}
              onChange={(e) => handleChange("baseModel", e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="gpt4-vision">GPT-4 Vision</option>
              <option value="wan2.1">WAN 2.1</option>
              <option value="claude3">Claude 3 Opus</option>
              <option value="flux-lite">Flux Lite</option>
            </select>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "temperature", label: "Temperature", min: 0, max: 2, step: 0.1 },
              { key: "topP", label: "Top P", min: 0, max: 1, step: 0.1 },
              { key: "frequency", label: "Frequency Penalty", min: 0, max: 2, step: 0.1 },
              { key: "presence", label: "Presence Penalty", min: 0, max: 2, step: 0.1 },
            ].map((param) => (
              <div key={param.key}>
                <label className="block text-sm font-semibold mb-2">
                  {param.label}: <span className="text-primary">{config[param.key as keyof typeof config]}</span>
                </label>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={config[param.key as keyof typeof config]}
                  onChange={(e) => handleChange(param.key, Number.parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Max Tokens: <span className="text-primary">{config.maxTokens}</span>
            </label>
            <input
              type="range"
              min={100}
              max={32000}
              step={100}
              value={config.maxTokens}
              onChange={(e) => handleChange("maxTokens", Number.parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-card p-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors"
          >
            Save Model
          </button>
        </div>
      </div>
    </div>
  )
}
