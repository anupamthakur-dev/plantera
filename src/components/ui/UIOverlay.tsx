import BottomActionBar from './BottomActionBar'
import Modal from './Modal'
import { useModal } from '../../hooks/useModal'

export default function UIOverlay() {
  const { modalType, modalNode, closeModal } = useModal()

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <BottomActionBar />
      <Modal isOpen={Boolean(modalType)} onClose={closeModal}>
        {modalNode}
      </Modal>
    </div>
  )
}
