import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { updateUserProfile } from '../../services/planting'

type ProfileEditModalProps = {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string | null
  avatarFallbackUrl: string
  onClose: () => void
  onSaved: (profile: { name: string; avatarUrl: string | null }) => void
}

export default function ProfileEditModal({
  userId,
  email,
  initialName,
  initialAvatarUrl,
  avatarFallbackUrl,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(initialName)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(initialAvatarUrl ?? avatarFallbackUrl)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setFullName(initialName)
    setSelectedAvatarFile(null)
    setAvatarPreviewUrl(initialAvatarUrl ?? avatarFallbackUrl)
  }, [initialAvatarUrl, initialName])

  useEffect(() => {
    if (!selectedAvatarFile) return

    const nextPreviewUrl = URL.createObjectURL(selectedAvatarFile)
    setAvatarPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [selectedAvatarFile])

  const emailDisplayValue = useMemo(() => email.trim(), [email])

  const handleAvatarPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.')
      event.target.value = ''
      return
    }

    setErrorMessage('')
    setSelectedAvatarFile(file)
    event.target.value = ''
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    const trimmedName = fullName.trim()

    if (!trimmedName) {
      setErrorMessage('Full name is required.')
      return
    }

    setSubmitting(true)

    try {
      const result = await updateUserProfile({
        userId,
        fullName: trimmedName,
        avatarUrl: initialAvatarUrl,
        avatarFile: selectedAvatarFile,
      })

      onSaved({
        name: result.fullName,
        avatarUrl: result.avatarUrl,
      })
      onClose()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update profile right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-4 pb-6 sm:px-6 sm:py-6 sm:pb-8">
      <div className="flex items-start justify-between gap-4">
        <header className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--earth-green-700)]">Profile Settings</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--earth-green-900)]">Edit Profile</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Keep your identity current with a new avatar and updated profile details.
          </p>
        </header>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[rgba(28,35,16,0.14)] bg-white px-3 py-2 text-sm font-semibold text-[var(--earth-green-900)] transition hover:bg-[rgba(245,245,220,0.85)]"
        >
          Close
        </button>
      </div>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-[rgba(28,35,16,0.12)] bg-[linear-gradient(180deg,rgba(245,245,220,0.62),rgba(255,255,255,0.88))] px-4 py-6 shadow-[0_14px_40px_rgba(28,35,16,0.08)] sm:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarPickerChange}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-28 w-28 overflow-hidden rounded-full border-2 border-[rgba(53,84,39,0.18)] shadow-[0_18px_40px_rgba(53,84,39,0.22)] transition hover:scale-[1.02] hover:border-[rgba(53,84,39,0.36)] focus:outline-none focus:ring-2 focus:ring-[var(--earth-green-700)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
            aria-label="Change avatar"
          >
            <img
              src={avatarPreviewUrl}
              alt={fullName.trim() || emailDisplayValue}
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = avatarFallbackUrl
              }}
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-[rgba(13,24,17,0.52)] text-xs font-bold uppercase tracking-[0.22em] text-[var(--earth-sand-100)] opacity-0 transition group-hover:opacity-100">
              Change avatar
            </span>
          </button>

          <p className="text-center text-xs leading-relaxed text-[var(--text-secondary)]">
            Click the avatar to upload a new image. PNG, JPG, or WEBP work best.
          </p>
        </section>

        <section className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your display name"
              className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Email address</span>
            <input
              value={emailDisplayValue}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-[rgba(28,35,16,0.12)] bg-[rgba(245,245,220,0.45)] px-4 py-3 text-sm text-[var(--earth-stone-700)] outline-none"
            />
          </label>
        </section>

        {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--earth-green-700)_32%,transparent)] bg-white px-5 py-3 text-sm font-semibold text-[var(--earth-green-700)] transition hover:bg-[rgba(245,245,220,0.85)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--earth-green-300)_0%,var(--earth-green-500)_52%,var(--earth-green-700)_100%)] px-5 py-3 text-sm font-semibold text-[var(--earth-sand-100)] shadow-[0_8px_22px_rgba(53,84,39,0.48)] transition hover:shadow-[0_12px_30px_rgba(53,84,39,0.62)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </article>
  )
}