import { Link } from 'react-router-dom'
import RotatingEarth from '../components/Earth/RotatingEarth'

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden text-[var(--text-primary)]">

      <section className="relative z-10 mx-auto md:h-[50vh] w-full max-w-7xl flex flex-col items-center justify-end gap-8 px-6 py-10 md:gap-12 md:px-12 md:py-14 lg:gap-16">
       
        <p className="mb-4 inline-flex rounded-full border border-[rgba(28,35,16,0.25)] bg-[rgba(245,245,220,0.5)] px-4 py-1 text-xs uppercase tracking-[0.2em] text-[var(--earth-green-700)]">
            Earth Day 2026
          </p>
        <div className="climate-crisis px-2 text-center text-[clamp(3.1rem,18vw,10.25rem)] leading-[0.85] text-[var(--earth-green-300)]">
          Plantera
        </div>
      </section>
        <section className="sticky top-[-50%] z-50 flex justify-center">
          <RotatingEarth className="relative mx-auto h-[340px] w-full max-w-[34rem] md:h-screen md:max-w-none" modelSize={3.8} cameraDistance={4.4} />
      </section>
      <section>
      <article className="w-full text-center flex flex-col items-center pb-12 px-6 md:px-12">
          

          <h1 className="text-balance text-4xl font-bold  text-[var(--earth-stone-900)] sm:text-5xl lg:text-6xl">
         Plant Virtually. Impact Reality.
          </h1>

          <p className="mt-5 max-w-xl text-base  text-[var(--text-secondary)] sm:text-lg">
            On the occasion of Earth Day, Plantera invites everyone to begin with one sapling. Small actions,
            repeated together, rebuild healthy ecosystems for generations.
          </p>
          <p className="mt-5 max-w-xl text-base  text-[var(--text-secondary)] sm:text-lg font-semibold">
            Start planting. Start changing.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <Link
              to="/auth"
              className="rounded-xl bg-[var(--earth-green-700)] px-6 py-3 text-sm font-semibold tracking-wide text-[var(--earth-sand-100)] transition hover:-translate-y-0.5 hover:bg-[var(--earth-green-900)]"
            >
             🌱 Start Planting
            </Link>
            <a
              href="https://www.earthday.org"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[rgba(59,47,47,0.25)] bg-[rgba(255,255,255,0.5)] px-6 py-3 text-sm font-semibold tracking-wide text-[var(--earth-brown-900)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Learn About Earth Day
            </a>
          </div>
        </article> 
      </section>

      <article className="mx-auto mt-8 w-full max-w-6xl px-6 pb-20 md:px-12 z-10">
        <section className="z-index-10 rounded-3xl border border-[rgba(28,35,16,0.15)] bg-[rgba(255,255,255,0.7)] p-7 shadow-[0_16px_55px_rgba(28,35,16,0.08)] backdrop-blur-sm md:p-10">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--earth-green-900)] md:text-4xl">What is Plantera?</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Plantera is a virtual Earth where users plant trees, create gardens, and share environmental actions.
            Every contribution grows the planet visually and inspires real-world change.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[rgba(59,47,47,0.14)] bg-[var(--earth-sand-100)]/70 p-5">
              <h3 className="text-xl font-semibold text-[var(--earth-green-700)]">1. Plant</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
                Choose a location on the virtual Earth and plant a tree.
              </p>
            </article>

            <article className="rounded-2xl border border-[rgba(59,47,47,0.14)] bg-[var(--earth-sand-100)]/70 p-5">
              <h3 className="text-xl font-semibold text-[var(--earth-green-700)]">2. Share</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">Post your real-world eco actions:</p>
              <ul className="mt-3 space-y-1 text-sm text-[var(--text-secondary)] md:text-base">
                <li>Planting trees</li>
                <li>Cleaning areas</li>
                <li>Gardening</li>
                <li>Saving water</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-[rgba(59,47,47,0.14)] bg-[var(--earth-sand-100)]/70 p-5">
              <h3 className="text-xl font-semibold text-[var(--earth-green-700)]">3. Grow</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
                Watch Earth become greener as users contribute together.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/75 p-7 shadow-[0_12px_35px_rgba(28,35,16,0.08)] md:p-8">
            <h2 className="text-2xl font-bold text-[var(--earth-green-900)]">A Planet That Evolves</h2>
            <ul className="mt-4 space-y-2 text-[var(--text-secondary)]">
              <li>Trees appear across the world</li>
              <li>Gardens grow in communities</li>
              <li>Global impact increases</li>
            </ul>
            <p className="mt-4 font-medium text-[var(--earth-brown-700)]">Every user = one more patch of green.</p>
          </article>

          <article className="rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/75 p-7 shadow-[0_12px_35px_rgba(28,35,16,0.08)] md:p-8">
            <h3 className="text-2xl font-bold text-[var(--earth-green-900)]">Why Plantera?</h3>
            <ul className="mt-4 space-y-2 text-[var(--text-secondary)]">
              <li>Make environmental action visual</li>
              <li>Collaborate with global users</li>
              <li>Track your impact</li>
              <li>Inspire real-world change</li>
              <li>Fun, gamified experience</li>
            </ul>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-[rgba(28,35,16,0.12)] bg-[linear-gradient(145deg,rgba(245,245,220,0.9),rgba(232,224,200,0.85))] p-7 shadow-[0_12px_40px_rgba(28,35,16,0.08)] md:p-10">
          <h2 className="text-3xl font-bold text-[var(--earth-green-900)]">Features</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-2xl bg-white/80 p-4">
              <h3 className="font-semibold text-[var(--earth-green-700)]">Interactive Globe</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Explore and plant anywhere on Earth.</p>
            </article>
            <article className="rounded-2xl bg-white/80 p-4">
              <h3 className="font-semibold text-[var(--earth-green-700)]">Virtual Planting</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Grow trees and gardens digitally.</p>
            </article>
            <article className="rounded-2xl bg-white/80 p-4">
              <h3 className="font-semibold text-[var(--earth-green-700)]">Post Your Impact</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Share your real-world eco actions.</p>
            </article>
            <article className="rounded-2xl bg-white/80 p-4">
              <h3 className="font-semibold text-[var(--earth-green-700)]">Gamified Experience</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Earn badges, streaks, and rewards.</p>
            </article>
            <article className="rounded-2xl bg-white/80 p-4 sm:col-span-2 lg:col-span-2">
              <h3 className="font-semibold text-[var(--earth-green-700)]">Global Community</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Collaborate with people worldwide.</p>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[rgba(28,35,16,0.15)] bg-[rgba(28,35,16,0.92)] p-7 text-[var(--earth-sand-100)] shadow-[0_20px_50px_rgba(28,35,16,0.28)] md:p-10">
          <h3 className="text-2xl font-bold md:text-3xl">The Vision</h3>
          <p className="mt-4 text-[var(--earth-sand-200)]">
            Imagine opening Plantera and seeing countries turning greener, cities filling with gardens, and
            communities competing to plant more.
          </p>
          <p className="mt-4 text-lg font-semibold">Not just a platform. A living planet.</p>
        </section>

        <article className="mt-8 rounded-3xl border border-[rgba(28,35,16,0.12)] bg-white/80 p-8 text-center shadow-[0_12px_40px_rgba(28,35,16,0.08)] md:p-10">
          <h2 className="text-3xl font-bold text-[var(--earth-green-900)]">Join the Movement</h2>
          <p className="mt-3 text-[var(--text-secondary)]">Small actions. Massive impact.</p>
          <p className="mt-1 text-[var(--text-secondary)]">Start planting today.</p>

          <div className="mt-6">
            <Link
              to="/auth"
              className="inline-flex rounded-xl bg-[var(--earth-green-700)] px-7 py-3 text-sm font-semibold tracking-wide text-[var(--earth-sand-100)] transition hover:-translate-y-0.5 hover:bg-[var(--earth-green-900)]"
            >
              Get Started
            </Link>
          </div>
        </article>
      </article>
    </main>
  )
}