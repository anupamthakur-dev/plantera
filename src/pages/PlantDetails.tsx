import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { useAuth, useUser } from '../features/auth'
import { deletePlantPost, fetchPlantPostDetailsById, type PlantPostDetails } from '../services/planting'
import { ModalType } from '../components/ui/ModalProvider'
import { useModal } from '../hooks/useModal'
import { PlantImageViewerModal } from '../components/Globe/PlantImageViewerModal'
import { PlantTypeModelBadge } from '../components/ui/PlantTypeModelBadge'

const DEFAULT_AVATAR_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74d8b1"/><stop offset="1" stop-color="#2f8f6f"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><circle cx="32" cy="24" r="10" fill="#e9fff4"/><path d="M14 54c2-9 10-15 18-15s16 6 18 15" fill="#e9fff4"/></svg>',
)}`

const DEFAULT_PLANT_IMAGE_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7f5df"/><stop offset="1" stop-color="#bde6c7"/></linearGradient></defs><rect width="640" height="420" fill="url(#bg)"/><path d="M200 280c16-60 54-90 120-90s104 30 120 90" fill="none" stroke="#2f8f6f" stroke-width="14" stroke-linecap="round"/><circle cx="320" cy="168" r="48" fill="#74d8b1"/></svg>',
)}`

function formatPlantedDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown'
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPlantType(type: PlantPostDetails['type']): string {
  if (type === 'desert') return 'Desert'
  if (type === 'flower') return 'Flower'
  if (type === 'bush') return 'Bush'
  return 'Tree'
}

export default function PlantDetailsPage() {
  const navigate = useNavigate()
  const { plantId = '' } = useParams<{ plantId: string }>()
  const { user, isUser, loading: authLoading } = useUser()
  const { isSupabaseConfigured } = useAuth()
  const { openModal } = useModal()

  const [loadingPlant, setLoadingPlant] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [plantData, setPlantData] = useState<PlantPostDetails | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)

  const loadPlantDetails = useCallback(async () => {
    const normalizedPlantId = plantId.trim()
    if (!normalizedPlantId) {
      setPlantData(null)
      setLoadingPlant(false)
      return
    }

    setLoadingPlant(true)
    setErrorMessage('')

    try {
      const data = await fetchPlantPostDetailsById(normalizedPlantId)
      setPlantData(data)
    } catch (error) {
      console.error('Could not load plant details', error)
      setErrorMessage('Could not load this plant right now.')
    } finally {
      setLoadingPlant(false)
    }
  }, [plantId])

  useEffect(() => {
    if (!authLoading && !isUser) {
      navigate('/auth', { replace: true })
    }
  }, [authLoading, isUser, navigate])

  useEffect(() => {
    if (authLoading || !isUser) return
    void loadPlantDetails()
  }, [authLoading, isUser, loadPlantDetails])

  const isOwnPlant = useMemo(
    () => Boolean(user?.id && plantData?.user.id && user.id === plantData.user.id),
    [plantData?.user.id, user?.id],
  )

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = () => {
      setMenuOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  const handleEdit = () => {
    if (!plantData) return

    openModal(ModalType.POST_PLANT, {
      mode: 'edit',
      post: {
        id: plantData.id,
        name: plantData.name,
        type: plantData.type,
        lat: plantData.lat,
        lng: plantData.lng,
        quote: plantData.quote,
        imageUrl: plantData.imageUrls[0] ?? null,
        imageUrls: plantData.imageUrls,
      },
      onSaved: () => {
        void loadPlantDetails()
      },
    })
  }

  const handleDelete = async () => {
    if (!plantData || !user?.id) return

    const confirmed = window.confirm(`Delete "${plantData.name}"? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await deletePlantPost({
        userId: user.id,
        plantId: plantData.id,
      })
      navigate(`/profile/${plantData.user.id}`)
    } catch (error) {
      console.error('Could not delete plant post', error)
      window.alert('Could not delete this post right now.')
      setDeleting(false)
    }
  }

  if (authLoading || loadingPlant) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
          Loading plant details...
        </div>
      </main>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-sm text-[var(--text-secondary)]">
          Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              void loadPlantDetails()
            }}
            className="mt-5 inline-flex rounded-full border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  if (!plantData) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--text-primary)] md:px-6">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
          <h1 className="text-2xl font-black text-[var(--earth-green-900)]">Plant Not Found</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">This plant card no longer exists or the link is invalid.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2 text-sm font-semibold text-[var(--earth-green-900)] transition hover:bg-[var(--earth-sand-100)]"
            >
              Back to globe
            </Link>
            <Link
              to="/profile"
              className="inline-flex rounded-full bg-[var(--earth-green-700)] px-5 py-2 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)]"
            >
              Go to profile
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const displayImageUrls = plantData.imageUrls.length ? plantData.imageUrls : [DEFAULT_PLANT_IMAGE_DATA_URI]

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--text-primary)] md:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-7">
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/profile/${plantData.user.id}`}
            className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--earth-sand-100)]"
          >
            Back to profile
          </Link>
          <div className="text-xs uppercase tracking-[0.16em] text-[var(--earth-green-700)]">Plant Details</div>
        </div>

        <section className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_24px_60px_rgba(28,35,16,0.12)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4 md:gap-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),rgba(222,244,230,0.8),rgba(197,232,208,0.75))] shadow-[0_10px_24px_rgba(31,59,34,0.18)] md:h-24 md:w-24">
                <PlantTypeModelBadge type={plantData.type} className="h-full w-full" />
              </div>

              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--earth-green-700)]">
                  {formatPlantType(plantData.type)}
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-[var(--earth-green-900)] md:text-3xl">
                  {plantData.name}
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Planted on {formatPlantedDate(plantData.plantedAt)}</p>
              </div>
            </div>

            {isOwnPlant ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMenuOpen((open) => !open)
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:bg-[var(--earth-sand-100)]"
                  aria-label="Post actions"
                  aria-expanded={menuOpen}
                >
                  <EllipsisVertical size={18} />
                </button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 top-12 z-10 w-40 rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[0_16px_40px_rgba(20,30,18,0.18)]"
                    onPointerDown={(event) => {
                      event.stopPropagation()
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        handleEdit()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--earth-green-900)] transition hover:bg-[var(--earth-sand-100)]"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setMenuOpen(false)
                        void handleDelete()
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Trash2 size={16} />
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(247,240,225,0.72),rgba(236,246,232,0.8))] px-5 py-5 text-center text-base font-semibold text-[var(--earth-green-900)]/90 md:px-8 md:text-lg">
            "{plantData.quote?.trim() || 'No quote shared for this plant yet.'}"
          </div>

          <Link
            to={`/profile/${plantData.user.id}`}
            className="flex w-fit items-center gap-3  bg-white px-3 py-2.5"
          >
            <img
              src={plantData.user.avatarUrl || DEFAULT_AVATAR_DATA_URI}
              alt={plantData.user.name}
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = DEFAULT_AVATAR_DATA_URI
              }}
              className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
            />
            <p className="text-sm text-[var(--text-secondary)] md:text-base">
              planted by <span className="font-semibold text-[var(--earth-green-900)]">{plantData.user.name}</span>
            </p>
          </Link>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayImageUrls.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => {
                  setViewerIndex(index)
                  setViewerOpen(true)
                }}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--earth-sand-100)] text-left shadow-[0_14px_28px_rgba(27,40,20,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(27,40,20,0.16)]"
              >
                <img
                  src={imageUrl}
                  alt={`${plantData.name} ${index + 1}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = DEFAULT_PLANT_IMAGE_DATA_URI
                  }}
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </button>
            ))}
          </div>
        </section>
      </div>

      <PlantImageViewerModal
        open={viewerOpen}
        images={displayImageUrls}
        currentIndex={viewerIndex}
        title={plantData.name}
        onClose={() => {
          setViewerOpen(false)
        }}
        onIndexChange={(nextIndex) => {
          setViewerIndex(nextIndex)
        }}
      />
    </main>
  )
}