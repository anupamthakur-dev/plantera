import BottomActionBar from './BottomActionBar'
import Modal from './Modal'
import { useModal } from '../../hooks/useModal'

export default function UIOverlay() {
  const { modalType, modalNode, closeModal } = useModal()
  const showBottomActionBar = typeof window !== 'undefined' && window.location.pathname === '/'

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {showBottomActionBar ? <BottomActionBar /> : null}
      <Modal isOpen={Boolean(modalType)} onClose={closeModal}>
        {modalNode}
      </Modal>
    </div>
  )
}
