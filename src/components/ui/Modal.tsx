import { useEffect } from 'react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="plantera-modal-backdrop pointer-events-auto fixed inset-0 z-50 bg-[rgba(8,12,18,0.38)] backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="presentation"
    >
      <section className="plantera-modal-sheet absolute left-1/2 bottom-0 z-[60] w-[min(100vw-1rem,56rem)] max-h-[82vh] -translate-x-1/2 overflow-hidden rounded-t-3xl border-t border-[rgba(28,35,16,0.14)] bg-[var(--surface)] shadow-[0_-18px_40px_rgba(17,24,39,0.28)] sm:w-[min(100vw-1.5rem,56rem)]">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-[rgba(44,44,44,0.22)]" />
        <div className="max-h-[calc(82vh-28px)] overflow-y-auto">{children}</div>
      </section>
    </div>
  )
}
