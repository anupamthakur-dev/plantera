import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useUser } from '../features/auth'
import Modal from '../components/ui/Modal'
import {
  fetchUserProfilePageData,
  type UserProfilePageData,
} from '../services/planting'
import ProfileEditModal from '../features/profile/ProfileEditModal'

const DEFAULT_AVATAR_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74d8b1"/><stop offset="1" stop-color="#2f8f6f"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><circle cx="32" cy="24" r="10" fill="#e9fff4"/><path d="M14 54c2-9 10-15 18-15s16 6 18 15" fill="#e9fff4"/></svg>',
)}`

const DEFAULT_PLANT_IMAGE_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7f5df"/><stop offset="1" stop-color="#bde6c7"/></linearGradient></defs><rect width="320" height="200" fill="url(#bg)"/><path d="M100 146c8-30 27-45 58-45s50 15 58 45" fill="none" stroke="#2f8f6f" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="90" r="24" fill="#74d8b1"/></svg>',
)}`

function formatJoinedDate(joinedAt: number | null): string {
  if (!joinedAt || !Number.isFinite(joinedAt)) return 'Joined recently'

  return new Date(joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function formatPlantedDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown'

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { userId: routeUserId } = useParams<{ userId?: string }>()
  const { user, isUser, loading: authLoading } = useUser()
  const { isSupabaseConfigured, signOut } = useAuth()

  const resolvedUserId = useMemo(() => {
    const fromRoute = routeUserId?.trim()
    if (fromRoute) return fromRoute
    return user?.id ?? ''
  }, [routeUserId, user?.id])

  const isOwnProfile = Boolean(user?.id && resolvedUserId && user.id === resolvedUserId)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  const [profileData, setProfileData] = useState<UserProfilePageData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isUser) {
      navigate('/auth', { replace: true })
    }
  }, [authLoading, isUser, navigate])

  useEffect(() => {
    if (authLoading || !isUser || !resolvedUserId) return

    let cancelled = false
    setLoadingProfile(true)
    setError('')

    void fetchUserProfilePageData(resolvedUserId)
      .then((result) => {
        if (cancelled) return
        setProfileData(result)
        setLoadingProfile(false)
      })
      .catch((fetchError) => {
        if (cancelled) return
        console.error('Could not load profile page data', fetchError)
        setError('Could not load profile details right now.')
        setLoadingProfile(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, isUser, resolvedUserId])

  if (authLoading || loadingProfile) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
          Loading profile...
        </div>
      </main>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--text-secondary)]">
          Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-sm text-red-700">
          {error}
        </div>
      </main>
    )
  }

  if (!profileData) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-sm text-[var(--text-secondary)]">
          Profile not found.
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text-primary)] md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--earth-sand-200)]"
          >
            Back to globe
          </Link>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_50px_rgba(28,35,16,0.12)] md:p-8">
          <div className="text-center">
            <img
              src={profileData.avatarUrl || DEFAULT_AVATAR_DATA_URI}
              alt={profileData.name}
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = DEFAULT_AVATAR_DATA_URI
              }}
              className="mx-auto mb-6 h-28 w-28 rounded-full border-2 border-[color:color-mix(in_srgb,var(--earth-sand-100)_35%,transparent)] shadow-[0_16px_40px_rgba(53,84,39,0.28)] object-cover"
            />

            <h1 className="text-4xl font-black tracking-tight text-[var(--earth-green-900)] mb-2">
              {profileData.name}
            </h1>

            <p className="text-sm text-[var(--text-secondary)] mb-4">{profileData.email}</p>

            <div className="mb-6 space-y-1 text-xs text-[var(--text-secondary)]">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Member since</span> {formatJoinedDate(profileData.joinedAt)}
              </div>
            </div>

            {isOwnProfile ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--earth-green-300)_0%,var(--earth-green-500)_52%,var(--earth-green-700)_100%)] px-6 py-2.5 text-sm font-semibold text-[var(--earth-sand-100)] shadow-[0_8px_22px_rgba(53,84,39,0.48)] transition hover:shadow-[0_12px_30px_rgba(53,84,39,0.62)]"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--earth-green-700)_42%,transparent)] bg-[color:color-mix(in_srgb,var(--earth-green-900)_12%,transparent)] px-6 py-2.5 text-sm font-semibold text-[var(--earth-green-600)] transition hover:bg-[color:color-mix(in_srgb,var(--earth-green-700)_18%,transparent)]"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--earth-green-700)]">
            Plant Posts
          </div>

          {profileData.posts.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profileData.posts.map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_26px_rgba(28,35,16,0.08)]"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--earth-sand-100)]">
                    <img
                      src={post.imageUrl || DEFAULT_PLANT_IMAGE_DATA_URI}
                      alt={post.name}
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = DEFAULT_PLANT_IMAGE_DATA_URI
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="mb-1 text-base font-semibold text-[var(--earth-green-900)]">{post.name}</div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-secondary)]">{post.type}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Planted on {formatPlantedDate(post.plantedAt)}</div>
                    <div className="mt-2 line-clamp-3 text-sm text-[var(--text-primary)]/90">
                      {post.quote?.trim() || 'No quote shared for this post.'}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-sm text-[var(--text-secondary)]">
              No plant posts yet.
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)}>
        {profileData ? (
          <ProfileEditModal
            userId={profileData.userId}
            email={profileData.email}
            initialName={profileData.name}
            initialAvatarUrl={profileData.avatarUrl}
            avatarFallbackUrl={DEFAULT_AVATAR_DATA_URI}
            onClose={() => setIsEditProfileOpen(false)}
            onSaved={({ name, avatarUrl }) => {
              setProfileData((current) => {
                if (!current) return current

                return {
                  ...current,
                  name,
                  avatarUrl,
                }
              })
              setIsEditProfileOpen(false)
            }}
          />
        ) : null}
      </Modal>
    </main>
  )
}
