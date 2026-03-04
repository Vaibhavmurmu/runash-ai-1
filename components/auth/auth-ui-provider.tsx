"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"

export type AuthViewPaths = {
  signIn: string
  signUp: string
  account: string
}

export type AuthLocalization = {
  loadingLabel?: string
  signedOutLabel?: string
}

export type AdditionalField = {
  key: string
  label: string
  value?: string
}

export type AdditionalFields = AdditionalField[]

type AuthUIContextValue = {
  paths: AuthViewPaths
  localization: AuthLocalization
  additionalFields: AdditionalFields
}

const defaultValue: AuthUIContextValue = {
  paths: {
    signIn: "/auth/better-signin",
    signUp: "/auth/better-signup",
    account: "/account",
  },
  localization: {
    loadingLabel: "Loading your authentication state...",
    signedOutLabel: "You are not signed in.",
  },
  additionalFields: [],
}

const AuthUIContext = createContext<AuthUIContextValue>(defaultValue)

interface AuthUIProviderProps {
  children: ReactNode
  paths?: Partial<AuthViewPaths>
  localization?: AuthLocalization
  additionalFields?: AdditionalFields
}

export function AuthUIProvider({ children, paths, localization, additionalFields }: AuthUIProviderProps) {
  return (
    <AuthUIContext.Provider
      value={{
        paths: {
          ...defaultValue.paths,
          ...paths,
        },
        localization: {
          ...defaultValue.localization,
          ...localization,
        },
        additionalFields: additionalFields ?? defaultValue.additionalFields,
      }}
    >
      {children}
    </AuthUIContext.Provider>
  )
}

export function useAuthUIContext() {
  return useContext(AuthUIContext)
}
