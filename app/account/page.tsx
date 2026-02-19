"use client"

import {
  AccountSettingsCards,
  AccountsCard,
  ApiKeysCard,
  ApiSectionIntro,
  AcceptInvitationCard,
  AuthLoading,
  AuthView,
  ChangeEmailCard,
  ChangePasswordCard,
  DeleteAccountCard,
  OrganizationMembersCard,
  OrganizationSectionIntro,
  OrganizationSettingsCards,
  OrganizationSwitcher,
  PasskeysCard,
  ProvidersCard,
  RedirectToSignIn,
  SecuritySectionIntro,
  SecuritySettingsCards,
  SettingsSectionIntro,
  SessionsCard,
  SignedIn,
  SignedOut,
  TwoFactorCard,
  UpdateAvatarCard,
  UpdateFieldCard,
  UpdateNameCard,
  UpdateUsernameCard,
  UserButton,
  UserSectionIntro,
} from "@/components/auth/auth-ui"

export default function AccountPage() {
  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <RedirectToSignIn />

      <AuthLoading>
        <p className="text-sm text-muted-foreground">Loading your account...</p>
      </AuthLoading>

      <SignedOut>
        <p className="text-sm text-muted-foreground">Redirecting to sign-in...</p>
      </SignedOut>

      <SignedIn>
        <section className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <h1 className="text-xl font-semibold">Account Center</h1>
            <p className="text-sm text-muted-foreground">Improved user account with avatar upload and auth building blocks.</p>
          </div>
          <UserButton />
        </section>

        <AuthView />

        <div className="grid gap-4 md:grid-cols-2">
          <UserSectionIntro />
          <OrganizationSectionIntro />
          <SecuritySectionIntro />
          <SettingsSectionIntro />
          <ApiSectionIntro />
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <UpdateAvatarCard />
          <AccountSettingsCards />
          <ChangeEmailCard />
          <ChangePasswordCard />
          <UpdateNameCard />
          <UpdateUsernameCard />
          <UpdateFieldCard />
          <DeleteAccountCard />
          <SecuritySettingsCards />
          <ProvidersCard />
          <SessionsCard />
          <TwoFactorCard />
          <PasskeysCard />
          <AccountsCard />
          <ApiKeysCard />
          <OrganizationSwitcher />
          <OrganizationSettingsCards />
          <OrganizationMembersCard />
          <AcceptInvitationCard />
        </section>
      </SignedIn>
    </main>
  )
}
