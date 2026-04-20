import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabaseClient'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  isSupabaseConfigured: boolean
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) return

      if (error) {
        console.error('Failed to read Supabase session', error)
      }

      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    syncSession()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      session,
      loading,
      isSupabaseConfigured,
      signInWithEmail: async (email: string) => {
        const normalizedEmail = email.trim()
        if (!normalizedEmail) {
          return { error: new Error('Email is required') }
        }

        const redirectTo = `${window.location.origin}`
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        return { error: error ?? null }
      },
      signInWithPassword: async (email: string, password: string) => {
        const normalizedEmail = email.trim()
        if (!normalizedEmail || !password.trim()) {
          return { error: new Error('Email and password are required') }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        return { error: error ?? null }
      },
      signUpWithPassword: async (email: string, password: string, fullName?: string) => {
        const normalizedEmail = email.trim()
        if (!normalizedEmail || !password.trim()) {
          return { error: new Error('Email and password are required') }
        }

        const redirectTo = `${window.location.origin}`
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: fullName?.trim() ? { full_name: fullName.trim() } : undefined,
          },
        })

        return { error: error ?? null }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return { error: error ?? null }
      },
    }
  }, [loading, session, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
