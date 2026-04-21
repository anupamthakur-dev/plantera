import { ModalType } from './ModalProvider'
import { useModal } from '../../hooks/useModal'

export default function BottomActionBar() {
  const { openModal } = useModal()
  const buttonClassName =
    'group relative inline-flex h-full w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-[color:color-mix(in_srgb,var(--earth-sand-100)_32%,transparent)] bg-[linear-gradient(135deg,var(--earth-green-300)_0%,var(--earth-green-500)_52%,var(--earth-green-700)_100%)] px-7 py-3 text-sm font-extrabold tracking-[0.02em] text-[var(--earth-sand-100)] shadow-[0_8px_22px_rgba(53,84,39,0.48),inset_0_1px_0_rgba(245,245,220,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(53,84,39,0.62),inset_0_1px_0_rgba(245,245,220,0.34)] active:translate-y-0 active:scale-[0.99]'

  return (
    <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 flex h-12 min-w-[220px] -translate-x-1/2 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--earth-green-900)_85%,black)] p-0 shadow-[0_16px_35px_rgba(17,24,39,0.35)] ring-1 ring-[color:color-mix(in_srgb,var(--earth-accent-sky)_26%,transparent)] sm:bottom-8">
      <button
        type="button"
        onClick={() => openModal(ModalType.POST_PLANT)}
        className={buttonClassName}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_-30%,rgba(245,245,220,0.4),transparent_58%)] opacity-80" />
        <span className="transition group-hover:scale-110">🌱</span>
        <span className="relative">Plant a Sapling</span>
      </button>
    </div>
  )
}
