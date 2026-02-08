import { Shield, Lock, Eye, Key } from "lucide-react"

export default function SecurityPage() {
  const features = [
    { icon: Shield, title: "Data Encryption", desc: "End-to-end encryption for all data" },
    { icon: Lock, title: "Two-Factor Auth", desc: "Secure your account with 2FA" },
    { icon: Eye, title: "Privacy Controls", desc: "Full control over your data privacy" },
    { icon: Key, title: "API Security", desc: "Secure API keys and tokens" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-muted-foreground mt-1">Your security is our priority</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon
          return (
            <div key={idx} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
