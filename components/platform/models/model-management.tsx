"use client"

import { useState } from "react"
import { Plus, Settings, Trash2 } from "lucide-react"
import ModelConfigurator from "./model-configurator"
import { cn } from "@/lib/utils"

export default function ModelManagement() {
  const [selectedModel, setSelectedModel] = useState<string | null>("gpt4-vision")
  const [showConfigurator, setShowConfigurator] = useState(false)
  const [models, setModels] = useState([
    {
      id: "gpt4-vision",
      name: "GPT-4 Vision",
      type: "Open",
      status: "active",
      speed: "Medium",
      quality: "Very High",
      cost: "$$$",
    },
    {
      id: "wan2.1",
      name: "WAN 2.1",
      type: "Custom",
      status: "active",
      speed: "Fast",
      quality: "High",
      cost: "$$",
    },
    {
      id: "claude3",
      name: "Claude 3 Opus",
      type: "Open",
      status: "active",
      speed: "Fast",
      quality: "Very High",
      cost: "$$",
    },
    {
      id: "flux-lite",
      name: "Flux Lite",
      type: "Open",
      status: "inactive",
      speed: "Very Fast",
      quality: "High",
      cost: "$",
    },
  ])

  const getStatusColor = (status: string) => {
    return status === "active" ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Model Management</h1>
            <p className="text-muted-foreground mt-1">Configure and manage AI models</p>
          </div>
          <button
            onClick={() => setShowConfigurator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Custom Model
          </button>
        </div>

        {/* Model Configurator */}
        {showConfigurator && <ModelConfigurator onClose={() => setShowConfigurator(false)} />}

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={cn(
                "border-2 rounded-lg p-4 cursor-pointer transition-all",
                selectedModel === model.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{model.name}</h3>
                  <p className="text-xs text-muted-foreground">{model.type}</p>
                </div>
                <span className={cn("px-2 py-1 rounded text-xs font-medium", getStatusColor(model.status))}>
                  {model.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Speed:</span>
                  <span className="font-medium">{model.speed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quality:</span>
                  <span className="font-medium">{model.quality}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">{model.cost}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors flex items-center justify-center gap-1">
                  <Settings className="h-4 w-4" />
                  Configure
                </button>
                <button className="px-3 py-2 bg-muted hover:bg-muted/80 rounded text-sm transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Model Details */}
        {selectedModel && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Model Specifications</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Max Tokens</p>
                <p className="text-lg font-semibold">8,000</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Context Window</p>
                <p className="text-lg font-semibold">128K</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Cost</p>
                <p className="text-lg font-semibold">$0.03/1K</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Availability</p>
                <p className="text-lg font-semibold text-green-500">Available</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
