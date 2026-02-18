import { RegisterForm } from "@/components/auth/register-form"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/20 dark:via-gray-950 dark:to-amber-950/20 p-6">
      <RegisterForm />
    </main>
  )
}
