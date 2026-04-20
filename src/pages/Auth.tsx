import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '../features/auth'

type AuthMode = 'login' | 'create'

export default function AuthPage() {
  const navigate = useNavigate()
  const { isUser, loading } = useUser()
  const { isSupabaseConfigured, signInWithPassword, signUpWithPassword, signInWithEmail } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isUser) {
      navigate('/', { replace: true })
    }
  }, [isUser, loading, navigate])

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setSubmitting(true)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.')
      setSubmitting(false)
      return
    }

    if (mode === 'login') {
      const result = await signInWithPassword(trimmedEmail, trimmedPassword)
      if (result.error) {
        setError(result.error.message)
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      navigate('/', { replace: true })
      return
    }

    const result = await signUpWithPassword(trimmedEmail, trimmedPassword, fullName)
    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    setStatus('Account created successfully.')
    setPassword('')
    setSubmitting(false)
    navigate('/', { replace: true })
  }

  const handleMagicLink = async () => {
    setError('')
    setStatus('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Enter your email first to receive a magic link.')
      return
    }

    setSubmitting(true)
    const result = await signInWithEmail(trimmedEmail)

    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    setStatus('Magic link sent. Check your inbox to continue.')
    setSubmitting(false)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-[rgba(107,142,35,0.24)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-40px] top-[30%] h-72 w-72 rounded-full bg-[rgba(78,126,125,0.2)] blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="inline-flex rounded-full border border-[rgba(28,35,16,0.25)] bg-[rgba(245,245,220,0.6)] px-4 py-1 text-xs uppercase tracking-[0.24em] text-[var(--earth-green-700)]">
            Plantera Access
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-[var(--earth-green-900)] md:text-6xl">
            Enter The Living Planet
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Sign in to plant, grow, and track your environmental impact across the globe. Your contributions
            transform Plantera in real time and inspire a greener world.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(59,47,47,0.15)] bg-white/70 p-4">
              <p className="text-sm font-semibold text-[var(--earth-green-700)]">Protected Globe</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Only signed-in users can access planting actions.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(59,47,47,0.15)] bg-white/70 p-4">
              <p className="text-sm font-semibold text-[var(--earth-green-700)]">Personal Impact</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Track your journey and contributions over time.</p>
            </div>
          </div>

          <Link
            to="/"
            className="mt-8 inline-flex rounded-xl border border-[rgba(59,47,47,0.25)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--earth-brown-900)] transition hover:bg-white"
          >
            Back to Landing
          </Link>
        </section>

        <section className="rounded-3xl border border-[rgba(28,35,16,0.14)] bg-white/80 p-6 shadow-[0_20px_50px_rgba(28,35,16,0.12)] backdrop-blur-sm md:p-8">
          <div className="mb-6 flex rounded-xl bg-[rgba(245,245,220,0.8)] p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`w-1/2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-[var(--earth-green-700)] text-[var(--earth-sand-100)]'
                  : 'text-[var(--earth-brown-900)] hover:bg-white/70'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`w-1/2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === 'create'
                  ? 'bg-[var(--earth-green-700)] text-[var(--earth-sand-100)]'
                  : 'text-[var(--earth-brown-900)] hover:bg-white/70'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="text-2xl font-bold text-[var(--earth-green-900)]">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Plantera Account'}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {mode === 'login'
              ? 'Sign in and continue growing your virtual ecosystem.'
              : 'Join the movement and start planting your first tree today.'}
          </p>

          {!isSupabaseConfigured ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
            </div>
          ) : null}

          <form className="mt-5 space-y-3" onSubmit={handlePasswordSubmit}>
            {mode === 'create' ? (
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name (optional)"
                className="w-full rounded-xl border border-[rgba(28,35,16,0.15)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-[rgba(28,35,16,0.15)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-[rgba(28,35,16,0.15)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--earth-green-700)] px-5 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          <div className="my-4 h-px w-full bg-[rgba(59,47,47,0.12)]" />

          <button
            type="button"
            onClick={() => {
              void handleMagicLink()
            }}
            disabled={submitting}
            className="w-full rounded-xl border border-[rgba(59,47,47,0.22)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--earth-brown-900)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Send Magic Link Instead
          </button>

          {status ? <p className="mt-4 text-sm text-[var(--earth-green-700)]">{status}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </section>
      </div>
    </main>
  )
}
