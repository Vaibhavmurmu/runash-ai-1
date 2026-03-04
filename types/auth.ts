import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      username: string
      emailVerified: boolean
      ssoOrganization?: number
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    username: string
    emailVerified: boolean
    ssoOrganization?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    username: string
    emailVerified: boolean
    ssoOrganization?: number
  }
}

export interface UserRole {
  id: number
  name: string
  permissions: string[]
}

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

export interface AuthUser {
  id: number
  name: string
  username: string
  email: string
  role: string
  emailVerified: boolean
  avatarUrl?: string
  bio?: string
  location?: string
  website?: string
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  username: string
  email: string
  password: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordReset {
  token: string
  password: string
}

export interface EmailVerification {
  token: string
}
