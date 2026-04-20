import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../AuthProvider'

export default function AuthPanel() {
  const { user, loading, isSupabaseConfigured, signInWithEmail, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage('')
    setErrorMessage('')
    setSubmitting(true)

    const { error } = await signInWithEmail(email)

    if (error) {
      setErrorMessage(error.message)
    } else {
      setStatusMessage('Check your email for the sign-in link.')
      setEmail('')
    }

    setSubmitting(false)
  }

  const handleSignOut = async () => {
    setErrorMessage('')
    setStatusMessage('')
    const { error } = await signOut()

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage('Signed out successfully.')
  }

  if (loading) {
    return (
      <div className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/80 p-6 text-center text-[var(--earth-stone-700)] shadow-[0_12px_40px_rgba(28,35,16,0.08)]">
        Loading authentication...
      </div>
    )
  }

  if (user) {
    return (
      <section className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/80 p-6 shadow-[0_12px_40px_rgba(28,35,16,0.08)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--earth-green-700)]">Signed In</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--earth-green-900)]">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex rounded-xl bg-[var(--earth-green-700)] px-5 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)]"
          >
            Sign out
          </button>
        </div>

        {statusMessage ? <p className="mt-4 text-sm text-[var(--earth-green-700)]">{statusMessage}</p> : null}
        {errorMessage ? <p className="mt-4 text-sm text-red-700">{errorMessage}</p> : null}
      </section>
    )
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-2xl rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/80 p-6 shadow-[0_12px_40px_rgba(28,35,16,0.08)]">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--earth-green-700)]">Protected Globe</p>
      <h2 className="mt-2 text-2xl font-bold text-[var(--earth-green-900)]">Sign in to access the globe</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
        The landing page stays public, but the interactive globe is protected. Use your email to receive a magic link.
      </p>

      {!isSupabaseConfigured ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Configure <span className="font-semibold">VITE_SUPABASE_URL</span> and <span className="font-semibold">VITE_SUPABASE_PUBLISHABLE_KEY</span> in <span className="font-semibold">.env.local</span>, then restart the dev server.
        </div>
      ) : null}

      <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="min-w-0 flex-1 rounded-xl border border-[rgba(28,35,16,0.15)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex justify-center rounded-xl bg-[var(--earth-green-700)] px-5 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Sending...' : 'Send magic link'}
        </button>
      </form>

      {statusMessage ? <p className="mt-4 text-sm text-[var(--earth-green-700)]">{statusMessage}</p> : null}
      {errorMessage ? <p className="mt-4 text-sm text-red-700">{errorMessage}</p> : null}
    </section>
  )
}
