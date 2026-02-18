import { RegisterForm } from "@/components/auth/register-form"
import { WebAuthnRoadmapHooks } from "@/components/auth/webauthn-roadmap-hooks"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/20 dark:via-gray-950 dark:to-amber-950/20 p-6">
      <div className="w-full max-w-md space-y-4"><RegisterForm /><WebAuthnRoadmapHooks /></div>
    </main>
  )
}
