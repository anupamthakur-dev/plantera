import GlobeView from '../components/Globe/GlobeView'
import LandingPage from './LandingPage'
import { useUser } from '../features/auth'

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
      <main className="relative h-screen w-screen overflow-hidden bg-[var(--background)] text-zinc-100">
        <GlobeView />
      </main>
    )
  }

  return <LandingPage />
}

export default Home;
