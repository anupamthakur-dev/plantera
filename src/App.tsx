import { RouterProvider } from 'react-router-dom'
import { ModalProvider } from './components/ui/ModalProvider'
import UIOverlay from './components/ui/UIOverlay'
import { router } from './routes/router'

function App() {
  return (
    <ModalProvider>
      <RouterProvider router={router} />
      <UIOverlay />
    </ModalProvider>
  )
}

export default App
