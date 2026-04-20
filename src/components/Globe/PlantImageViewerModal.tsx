import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type PlantImageViewerModalProps = {
  open: boolean
  images: string[]
  currentIndex: number
  title: string
  onClose: () => void
  onIndexChange: (nextIndex: number) => void
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  const wrapped = index % length
  return wrapped < 0 ? wrapped + length : wrapped
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function PlantImageViewerModal({
  open,
  images,
  currentIndex,
  title,
  onClose,
  onIndexChange,
}: PlantImageViewerModalProps) {
  const activeIndex = clampIndex(currentIndex, images.length)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const resetPan = useCallback(() => {
    setPanX(0)
    setPanY(0)
  }, [])

  const getPanLimits = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const width = viewport.clientWidth
    const height = viewport.clientHeight
    const maxX = ((zoom - 1) * width) / 2
    const maxY = ((zoom - 1) * height) / 2

    return {
      minX: -maxX,
      maxX,
      minY: -maxY,
      maxY,
    }
  }, [zoom])

  const changeZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const nextZoom = clampZoom(prev + delta)
      if (nextZoom <= MIN_ZOOM) {
        setPanX(0)
        setPanY(0)
      }
      return nextZoom
    })
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(MIN_ZOOM)
    resetPan()
  }, [resetPan])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        onIndexChange(clampIndex(currentIndex + 1, images.length))
      }
      if (event.key === 'ArrowLeft' && images.length > 1) {
        onIndexChange(clampIndex(currentIndex - 1, images.length))
      }
      if ((event.key === '+' || event.key === '=' || event.key === 'Add') && open) {
        event.preventDefault()
        changeZoom(ZOOM_STEP)
      }
      if ((event.key === '-' || event.key === '_' || event.key === 'Subtract') && open) {
        event.preventDefault()
        changeZoom(-ZOOM_STEP)
      }
      if (event.key === '0' && open) {
        event.preventDefault()
        resetZoom()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [changeZoom, currentIndex, images.length, onClose, onIndexChange, open, resetZoom])

  useEffect(() => {
    if (!open) return
    setZoom(MIN_ZOOM)
    resetPan()
    setIsPanning(false)
    panStartRef.current = null
  }, [activeIndex, open, resetPan])

  if (!open || images.length === 0) {
    return null
  }

  const activeImage = images[activeIndex]

  const modalNode = (
    <div
      className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-[color:var(--earth-stone-900)]/72 px-3 py-4 backdrop-blur-md sm:px-6"
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="relative flex h-full w-full max-w-6xl flex-col rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_18px_60px_rgba(10,16,20,0.38)]"
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <header className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{title || 'Plant image'}</h3>
            <div className="text-xs text-[color:var(--text-secondary)]">
              {activeIndex + 1} / {images.length}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)] transition hover:bg-[color:var(--earth-sand-200)]"
          >
            Close
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[color:var(--earth-sand-100)]">
          <div
            className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/94 px-2 py-1 shadow-sm"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <button
              type="button"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="h-7 w-7 rounded-full border border-[color:var(--border)] text-sm font-semibold text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--text-secondary)]"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="h-7 w-7 rounded-full border border-[color:var(--border)] text-sm font-semibold text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>

          <div
            ref={viewportRef}
            className={[
              'flex h-full w-full items-center justify-center',
              zoom > MIN_ZOOM ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
            ].join(' ')}
            style={{ touchAction: zoom > MIN_ZOOM ? 'none' : 'auto' }}
            onWheel={(event) => {
              event.preventDefault()
              event.stopPropagation()
              if (event.deltaY < 0) {
                changeZoom(ZOOM_STEP)
              } else {
                changeZoom(-ZOOM_STEP)
              }
            }}
            onPointerDown={(event) => {
              event.stopPropagation()
              event.preventDefault()
              if (zoom <= MIN_ZOOM) return

              setIsPanning(true)
              panStartRef.current = {
                x: event.clientX,
                y: event.clientY,
                panX,
                panY,
              }
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!isPanning || !panStartRef.current) return
              event.stopPropagation()
              event.preventDefault()

              const deltaX = event.clientX - panStartRef.current.x
              const deltaY = event.clientY - panStartRef.current.y
              const limits = getPanLimits()

              setPanX(clamp(panStartRef.current.panX + deltaX, limits.minX, limits.maxX))
              setPanY(clamp(panStartRef.current.panY + deltaY, limits.minY, limits.maxY))
            }}
            onPointerUp={(event) => {
              event.stopPropagation()
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
              setIsPanning(false)
              panStartRef.current = null
            }}
            onPointerCancel={(event) => {
              event.stopPropagation()
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }
              setIsPanning(false)
              panStartRef.current = null
            }}
          >
            <img
              src={activeImage}
              alt={`${title || 'Plant image'} ${activeIndex + 1}`}
              draggable={false}
              onDragStart={(event) => {
                event.preventDefault()
              }}
              className={[
                'pointer-events-none max-h-full max-w-full select-none object-contain',
                isPanning ? 'transition-none' : 'transition-transform duration-150',
              ].join(' ')}
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                WebkitUserDrag: 'none',
              }}
            />
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onIndexChange(clampIndex(activeIndex - 1, images.length))}
                className="absolute left-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/92 px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition hover:bg-[color:var(--earth-sand-100)]"
                aria-label="Previous image"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => onIndexChange(clampIndex(activeIndex + 1, images.length))}
                className="absolute right-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/92 px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] shadow-sm transition hover:bg-[color:var(--earth-sand-100)]"
                aria-label="Next image"
              >
                Next
              </button>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <footer className="border-t border-[color:var(--border)] px-3 py-3 sm:px-4">
            <div className="plantera-modern-scrollbar flex gap-2 overflow-x-auto pb-1">
              {images.map((imageUrl, index) => (
                <button
                  type="button"
                  key={`${imageUrl}-${index}`}
                  onClick={() => onIndexChange(index)}
                  className={[
                    'h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition',
                    index === activeIndex
                      ? 'border-[color:var(--earth-green-700)] ring-2 ring-[color:var(--earth-green-300)]/60'
                      : 'border-[color:var(--border)]',
                  ].join(' ')}
                >
                  <img
                    src={imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  )

  return createPortal(modalNode, document.body)
}
