import { createContext, lazy, type ReactNode, Suspense, useCallback, useMemo, useState } from 'react'

const PostModal = lazy(() => import('../../features/post/PostModal'))

export const ModalType = {
  POST_PLANT: 'POST_PLANT',
  VIEW_POST: 'VIEW_POST',
  PROFILE: 'PROFILE',
  SETTINGS: 'SETTINGS',
} as const

export type ModalType = (typeof ModalType)[keyof typeof ModalType]

type ModalData = Record<string, unknown> | null

type ModalContextValue = {
  modalType: ModalType | null
  modalData: ModalData
  modalNode: ReactNode
  openModal: (type: ModalType, data?: ModalData) => void
  closeModal: () => void
}

export const ModalContext = createContext<ModalContextValue | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalType, setModalType] = useState<ModalType | null>(null)
  const [modalData, setModalData] = useState<ModalData>(null)

  const openModal = useCallback((type: ModalType, data?: ModalData) => {
    setModalType(type)
    setModalData(data ?? null)
  }, [])

  const closeModal = useCallback(() => {
    setModalType(null)
    setModalData(null)
  }, [])

  // Keep modal content selection centralized for scalable modal growth.
  const modalNode = useMemo(() => {
    if (!modalType) return null

    if (modalType === ModalType.POST_PLANT) {
      return (
        <Suspense fallback={<div className="p-6 text-sm text-[var(--text-secondary)]">Loading...</div>}>
          <PostModal data={modalData} onClose={closeModal} />
        </Suspense>
      )
    }

    return (
      <div className="p-6">
        <h3 className="text-xl font-bold text-[var(--earth-green-900)]">Coming Soon</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">This panel is under construction.</p>
      </div>
    )
  }, [closeModal, modalData, modalType])

  const value = useMemo(
    () => ({
      modalType,
      modalData,
      modalNode,
      openModal,
      closeModal,
    }),
    [closeModal, modalData, modalNode, modalType, openModal],
  )

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}
