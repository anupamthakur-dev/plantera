import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PlantSidebarData } from '../../services/planting'
import { PlantImageViewerModal } from './PlantImageViewerModal'

const DEFAULT_AVATAR_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74d8b1"/><stop offset="1" stop-color="#2f8f6f"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><circle cx="32" cy="24" r="10" fill="#e9fff4"/><path d="M14 54c2-9 10-15 18-15s16 6 18 15" fill="#e9fff4"/></svg>',
)}`

const DEFAULT_PLANT_IMAGE_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7f5df"/><stop offset="1" stop-color="#bde6c7"/></linearGradient></defs><rect width="320" height="200" fill="url(#bg)"/><path d="M100 146c8-30 27-45 58-45s50 15 58 45" fill="none" stroke="#2f8f6f" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="90" r="24" fill="#74d8b1"/></svg>',
)}`

type PlantSidebarProps = {
  open: boolean
  loading: boolean
  errorMessage: string
  data: PlantSidebarData | null
  onClose: () => void
}

function formatPlantDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown date'
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PlantSidebar({ open, loading, errorMessage, data, onClose }: PlantSidebarProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerTitle, setViewerTitle] = useState('Plant image')
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState<string[]>([])

  const activePlantImages = useMemo(() => {
    if (!data?.plant) return [DEFAULT_PLANT_IMAGE_DATA_URI]
    return data.plant.imageUrls.length ? data.plant.imageUrls : [DEFAULT_PLANT_IMAGE_DATA_URI]
  }, [data?.plant])

  const openViewer = useCallback((images: string[], startIndex: number, title: string) => {
    setViewerImages(images.length ? images : [DEFAULT_PLANT_IMAGE_DATA_URI])
    setViewerIndex(startIndex)
    setViewerTitle(title)
    setViewerOpen(true)
  }, [])

  return (
    <aside className="pointer-events-none absolute inset-0 z-20" aria-hidden={!open}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close plant details"
        className={[
          'absolute inset-0 bg-[color:var(--earth-stone-900)]/35 transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      <div
        className={[
          'absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-2xl transition-transform duration-300 ease-out',
          'md:w-[min(460px,44vw)]',
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-[color:var(--surface)]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--earth-green-700)]">Plant Story</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)] transition hover:bg-[color:var(--earth-sand-200)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--earth-sand-100)] px-4 py-5 text-sm text-[color:var(--text-secondary)]">
              Loading plant details...
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {!loading && !errorMessage && data ? (
            <div className="space-y-4">
              <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--earth-sand-100)] p-3">
                <Link to={`/profile/${data.user.id}`} onClick={onClose} className="flex items-center gap-3">
                  <img
                    src={data.user.avatarUrl || DEFAULT_AVATAR_DATA_URI}
                    alt={data.user.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = DEFAULT_AVATAR_DATA_URI
                    }}
                    className="h-12 w-12 rounded-2xl border border-[color:var(--border)] object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{data.user.name}</div>
                    <div className="truncate text-xs text-[color:var(--text-secondary)]">@{data.user.id}</div>
                  </div>
                </Link>
              </section>

              <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                <h3 className="mb-2 text-sm font-semibold text-[color:var(--earth-green-700)]">Plant Details</h3>
                <div className="mb-2 text-lg font-bold text-[color:var(--text-primary)]">{data.plant.name}</div>
                <div className="mb-2 text-xs text-[color:var(--text-secondary)]">Type: {data.plant.type}</div>
                <div className="mb-2 text-xs text-[color:var(--text-secondary)]">Planted on: {formatPlantDate(data.plant.plantedAt)}</div>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--earth-sand-100)] px-3 py-2 text-sm leading-relaxed text-[color:var(--text-primary)]">
                  {data.plant.quote?.trim() || 'No quote shared for this plant yet.'}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[color:var(--earth-green-700)]">Pictures</h3>
                <div className="plantera-modern-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                  {activePlantImages.map((url, index) => (
                    <button
                      type="button"
                      key={`${url}-${index}`}
                      onClick={() => openViewer(activePlantImages, index, data.plant.name)}
                      className="h-40 w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-[color:var(--border)]"
                    >
                      <img
                        src={url}
                        alt={`${data.plant.name} ${index + 1}`}
                        onError={(event) => {
                          event.currentTarget.onerror = null
                          event.currentTarget.src = DEFAULT_PLANT_IMAGE_DATA_URI
                        }}
                        className="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
                      />
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[color:var(--earth-green-700)]">People In Same Region</h3>
                {data.regionalUsers.length ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {data.regionalUsers.map((regionalUser) => (
                      <Link
                        key={regionalUser.id}
                        to={`/profile/${regionalUser.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 transition hover:bg-[color:var(--earth-sand-100)]"
                      >
                        <img
                          src={regionalUser.avatarUrl || DEFAULT_AVATAR_DATA_URI}
                          alt={regionalUser.name}
                          onError={(event) => {
                            event.currentTarget.onerror = null
                            event.currentTarget.src = DEFAULT_AVATAR_DATA_URI
                          }}
                          className="h-11 w-11 shrink-0 rounded-xl border border-[color:var(--border)] object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{regionalUser.name}</div>
                          <div className="text-xs text-[color:var(--text-secondary)]">@{regionalUser.id}</div>
                          <div className="text-[11px] text-[color:var(--earth-green-700)]">
                            {regionalUser.plantCountInRegion} plant{regionalUser.plantCountInRegion > 1 ? 's' : ''} nearby
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--earth-sand-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
                    No nearby users found in this region yet.
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <PlantImageViewerModal
        open={viewerOpen}
        images={viewerImages}
        currentIndex={viewerIndex}
        title={viewerTitle}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </aside>
  )
}
