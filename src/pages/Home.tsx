import GlobeView from '../components/Globe/GlobeView'
import LandingPage from './LandingPage'
import { useUser } from '../features/auth'
import { ModalProvider } from '../components/ui/ModalProvider'
import UIOverlay from '../components/ui/UIOverlay'

function Home() {
  const { isUser, loading } = useUser()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--earth-stone-900)]">
        Loading Plantera...
      </main>
    )
  }

  if (isUser) {
    return (
      <ModalProvider>
        <main className="relative h-screen w-screen overflow-hidden bg-[var(--background)] text-zinc-100">
          <GlobeView />
          <UIOverlay />
        </main>
      </ModalProvider>
    )
  }

  return <LandingPage />
}

export default Home;
