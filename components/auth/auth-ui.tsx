"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { User, Users, Settings, Shield, Mail, KeyRound, LogOut } from "lucide-react"
import { signOut, useSession } from "@/lib/auth-client"
import { useAuthUIContext } from "@/components/auth/auth-ui-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Profile = {
  id?: string
  email?: string | null
  name?: string | null
  image?: string | null
}

export type FetchError = {
  message: string
  code?: string
}

export type AuthHooks = {
  useAuthenticate: typeof useAuthenticate
  useSession: typeof useSession
}

export type AuthMutators = {
  signOut: typeof signOut
}

export type ModelNames = "user" | "session" | "organization" | "apiKey"

export type AuthViewClassNames = {
  root?: string
  header?: string
}

export type AuthFormClassNames = {
  field?: string
  actions?: string
}

export type UserAvatarClassNames = {
  root?: string
  fallback?: string
}

export type UserButtonClassNames = {
  trigger?: string
  menu?: string
}

export type SettingsCardClassNames = {
  root?: string
  body?: string
}

export type EmailTemplateClassNames = {
  root?: string
}

function initials(name?: string | null) {
  if (!name) {
    return "U"
  }

  return name
    .split(" ")
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function useAuthenticate() {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { paths } = useAuthUIContext()

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`${paths.signIn}?next=${next}`)
    }
  }, [session.isPending, session.data?.user, router, paths.signIn, pathname])

  return session
}

export function RedirectToSignIn() {
  useAuthenticate()
  return null
}

export function RedirectToSignUp() {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { paths } = useAuthUIContext()

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`${paths.signUp}?next=${next}`)
    }
  }, [session.isPending, session.data?.user, router, paths.signUp, pathname])

  return null
}

export function AuthLoading({ children }: { children: ReactNode }) {
  const session = useSession()
  if (!session.isPending) {
    return null
  }

  return <>{children}</>
}

export function SignedIn({ children }: { children: ReactNode }) {
  const session = useSession()
  if (session.isPending || !session.data?.user) {
    return null
  }

  return <>{children}</>
}

export function SignedOut({ children }: { children: ReactNode }) {
  const session = useSession()
  if (session.isPending || session.data?.user) {
    return null
  }

  return <>{children}</>
}

export function UserAvatar({ classNames }: { classNames?: UserAvatarClassNames }) {
  const session = useSession()
  const user = session.data?.user

  return (
    <Avatar className={classNames?.root}>
      <AvatarImage src={user?.image || undefined} alt={user?.name || "User"} />
      <AvatarFallback className={classNames?.fallback}>{initials(user?.name)}</AvatarFallback>
    </Avatar>
  )
}

export function UserButton({ classNames }: { classNames?: UserButtonClassNames }) {
  const session = useSession()
  const user = session.data?.user
  const { paths } = useAuthUIContext()

  if (!user) {
    return (
      <Button asChild variant="outline">
        <Link href={paths.signIn}>Sign in</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={classNames?.trigger}>
          <UserAvatar />
          <span className="truncate">{user.name || user.email || "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={classNames?.menu} align="end">
        <DropdownMenuItem asChild>
          <Link href={paths.account}>Account settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/"
                },
              },
            })
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AuthView() {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">AuthView</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use AuthView to switch between sign-in, sign-up, and account views while preserving a consistent auth experience.
      </p>
    </section>
  )
}

function InfoCard({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function SettingsCard({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}

export function OrganizationSwitcher() {
  return <InfoCard title="OrganizationSwitcher" description="Switch between personal and team workspaces." icon={<Users className="h-4 w-4" />} />
}

export function OrganizationSettingsCards() {
  return <SettingsCard title="Organization settings" description="Manage organization name, branding, and defaults." />
}

export function OrganizationMembersCard() {
  return <SettingsCard title="Organization members" description="Invite, revoke, and manage member roles." />
}

export function AcceptInvitationCard() {
  return <SettingsCard title="Accept invitation" description="Review and accept pending organization invitations." />
}

export function AccountSettingsCards() {
  return <SettingsCard title="Account settings" description="Manage your profile, security, and session preferences." />
}

export function SecuritySettingsCards() {
  return <SettingsCard title="Security settings" description="Protect your account with passkeys, 2FA, and password controls." />
}

export function ChangeEmailCard() {
  return <SettingsCard title="Change email" description="Update your primary email address with verification." />
}

export function ChangePasswordCard() {
  return <SettingsCard title="Change password" description="Rotate your password and invalidate old sessions." />
}

export function DeleteAccountCard() {
  return <SettingsCard title="Delete account" description="Permanently delete your account and remove personal data." />
}

export function ProvidersCard() {
  return <SettingsCard title="Providers" description="View linked OAuth and identity providers." />
}

export function SessionsCard() {
  return <SettingsCard title="Sessions" description="View active sessions and revoke devices." />
}

export function TwoFactorCard() {
  return <SettingsCard title="Two-factor authentication" description="Enable app-based or OTP second factor authentication." />
}

export function PasskeysCard() {
  return <SettingsCard title="Passkeys" description="Register and manage WebAuthn passkeys." />
}

export function UpdateAvatarCard() {
  const session = useSession()
  const user = session.data?.user
  const previewSrc = user?.image || "/placeholder-user.jpg"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update avatar</CardTitle>
        <CardDescription>Upload a profile image to personalize your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={previewSrc} alt={user?.name || "Avatar preview"} />
            <AvatarFallback>{initials(user?.name)}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">Avatar upload is wired for the next API mutation step.</p>
        </div>
        <input aria-label="Upload avatar" type="file" accept="image/*" className="text-sm" />
      </CardContent>
    </Card>
  )
}

export function UpdateUsernameCard() {
  return <SettingsCard title="Update username" description="Set a unique public username for profile URLs." />
}

export function UpdateNameCard() {
  return <SettingsCard title="Update name" description="Update first and last name displayed across the platform." />
}

export function UpdateFieldCard() {
  return <SettingsCard title="Update custom field" description="Manage custom profile fields configured by your team." />
}

export function AccountsCard() {
  return <SettingsCard title="Connected accounts" description="Inspect linked account identities and sign-in methods." />
}

export function ApiKeysCard() {
  return <SettingsCard title="API keys" description="Issue and revoke personal access API keys." />
}

export function EmailTemplate({ subject, body }: { subject: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          {subject}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-muted-foreground">EmailTemplate</span>
      </CardFooter>
    </Card>
  )
}

export function useAuthMetadata() {
  const session = useSession()
  const user = session.data?.user

  return useMemo(
    () => ({
      profile: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        : null,
      modelNames: ["user", "session", "organization", "apiKey"] as ModelNames[],
    }),
    [user],
  )
}

export function UserSectionIntro() {
  return <InfoCard title="User" description="Account overview and session management controls." icon={<User className="h-4 w-4" />} />
}

export function OrganizationSectionIntro() {
  return <InfoCard title="Organizations" description="Workspace access, members, and invitations." icon={<Users className="h-4 w-4" />} />
}

export function SettingsSectionIntro() {
  return <InfoCard title="Settings" description="Password, 2FA, passkeys, and profile update cards." icon={<Settings className="h-4 w-4" />} />
}

export function SecuritySectionIntro() {
  return <InfoCard title="Security" description="Security hardening controls and authentication providers." icon={<Shield className="h-4 w-4" />} />
}

export function ApiSectionIntro() {
  return <InfoCard title="API keys" description="Create API credentials for automation and integrations." icon={<KeyRound className="h-4 w-4" />} />
}
