import { ModalType } from './ModalProvider'
import { useModal } from '../../hooks/useModal'

export default function BottomActionBar() {
  const { openModal } = useModal()
  const buttonClassName =
    'group inline-flex items-center gap-2 rounded-full bg-[var(--earth-green-500)] px-5 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition duration-100 hover:bg-(--earth-green-300)'

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-3 rounded-full bg-[var(--earth-green-700)] px-3 py-3 shadow-[0_16px_35px_rgba(17,24,39,0.35)] sm:bottom-8">
      <button
        type="button"
        onClick={() => openModal(ModalType.VIEW_POST)}
        className={buttonClassName}
      >
        <span>My plant</span>
      </button>

      <button
        type="button"
        onClick={() => openModal(ModalType.POST_PLANT)}
        className={buttonClassName}
      >
        <span className="transition group-hover:scale-110">🌱</span>
        <span>Plant a Sapling</span>
      </button>

      <button
        type="button"
        onClick={() => openModal(ModalType.PROFILE)}
        className={buttonClassName}
      >
        <span>Profile</span>
      </button>
    </div>
  )
}
