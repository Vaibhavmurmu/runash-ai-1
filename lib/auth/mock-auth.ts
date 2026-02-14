interface MockUser {
  id: string
  email: string
  user_metadata: {
    full_name?: string
    phone?: string
    country_code?: string
    preferred_language?: string
  }
}

interface MockSession {
  user: MockUser
  access_token: string
  refresh_token: string
  expires_at: number
}

class MockAuthService {
  private users: Map<string, { email: string; password: string; metadata: any }> = new Map()
  private sessions: Map<string, MockSession> = new Map()
  private listeners: Array<(event: string, session: MockSession | null) => void> = []

  constructor() {
    // Load from localStorage if available
    if (typeof window !== "undefined") {
      const savedUsers = localStorage.getItem("mock_users")
      const savedSessions = localStorage.getItem("mock_sessions")

      if (savedUsers) {
        this.users = new Map(JSON.parse(savedUsers))
      }
      if (savedSessions) {
        this.sessions = new Map(JSON.parse(savedSessions))
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      localStorage.setItem("mock_users", JSON.stringify(Array.from(this.users.entries())))
      localStorage.setItem("mock_sessions", JSON.stringify(Array.from(this.sessions.entries())))
    }
  }

  private generateId() {
    return Math.random().toString(36).substr(2, 9)
  }

  private createSession(email: string): MockSession {
    const user = this.users.get(email)
    if (!user) throw new Error("User not found")

    const session: MockSession = {
      user: {
        id: this.generateId(),
        email,
        user_metadata: user.metadata,
      },
      access_token: this.generateId(),
      refresh_token: this.generateId(),
      expires_at: Date.now() + 3600000, // 1 hour
    }

    this.sessions.set(email, session)
    this.saveToStorage()
    return session
  }

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: any } }) {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network delay

    if (this.users.has(email)) {
      return { data: null, error: { message: "User already registered" } }
    }

    this.users.set(email, {
      email,
      password,
      metadata: options?.data || {},
    })

    const session = this.createSession(email)
    this.saveToStorage()

    // Notify listeners
    this.listeners.forEach((listener) => listener("SIGNED_UP", session))

    return { data: { user: session.user, session }, error: null }
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate network delay

    const user = this.users.get(email)
    if (!user || user.password !== password) {
      return { data: null, error: { message: "Invalid login credentials" } }
    }

    const session = this.createSession(email)

    // Notify listeners
    this.listeners.forEach((listener) => listener("SIGNED_IN", session))

    return { data: { user: session.user, session }, error: null }
  }

  async signInWithOAuth({ provider }: { provider: string }) {
    await new Promise((resolve) => setTimeout(resolve, 1200)) // Simulate OAuth flow

    const mockEmail = `user@${provider}.com`
    const mockUser = {
      email: mockEmail,
      password: "oauth_user",
      metadata: {
        full_name: `${provider} User`,
        provider,
      },
    }

    this.users.set(mockEmail, mockUser)
    const session = this.createSession(mockEmail)

    // Notify listeners
    this.listeners.forEach((listener) => listener("SIGNED_IN", session))

    return { data: { user: session.user, session }, error: null }
  }

  async signOut() {
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Clear all sessions
    this.sessions.clear()
    this.saveToStorage()

    // Notify listeners
    this.listeners.forEach((listener) => listener("SIGNED_OUT", null))

    return { error: null }
  }

  async getSession() {
    const sessions = Array.from(this.sessions.values())
    const validSession = sessions.find((session) => session.expires_at > Date.now())

    return { data: { session: validSession || null }, error: null }
  }

  async resetPasswordForEmail({ email }: { email: string }) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (!this.users.has(email)) {
      return { data: null, error: { message: "User not found" } }
    }

    // In a real app, this would send an email
    console.log(`Password reset email sent to ${email}`)
    return { data: {}, error: null }
  }

  async updateUser({ data }: { data: any }) {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const sessions = Array.from(this.sessions.entries())
    const [email, session] = sessions.find(([_, s]) => s.expires_at > Date.now()) || []

    if (!email || !session) {
      return { data: null, error: { message: "Not authenticated" } }
    }

    const user = this.users.get(email)
    if (user) {
      user.metadata = { ...user.metadata, ...data }
      this.users.set(email, user)

      // Update session
      session.user.user_metadata = { ...session.user.user_metadata, ...data }
      this.sessions.set(email, session)
      this.saveToStorage()
    }

    return { data: { user: session.user }, error: null }
  }

  onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
    this.listeners.push(callback)

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.listeners.indexOf(callback)
            if (index > -1) {
              this.listeners.splice(index, 1)
            }
          },
        },
      },
    }
  }
}

export const mockAuth = process.env.NODE_ENV === "test" ? new MockAuthService() : null
