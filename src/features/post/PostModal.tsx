import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PlantType } from '../../components/Globe/plants'
import { useCreatePlantPost } from './useCreatePlantPost'
import { plantTypeOptions } from './post.schema'
import { usePlantLocationSearch } from './usePlantLocationSearch'
import type { PlantLocationSuggestion } from '../../services/planting'

type PostModalPlant = {
  id: string
  name?: string
  type?: PlantType
  lat?: number | string
  lng?: number | string
  quote?: string | null
  imageUrl?: string | null
  imageUrls?: string[]
}

type PostModalData = {
  mode?: 'create' | 'edit'
  post?: PostModalPlant | null
  onSaved?: () => void
}

type PostModalProps = {
  data?: Record<string, unknown> | null
  onClose: () => void
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer()
  files.forEach((file) => dataTransfer.items.add(file))
  return dataTransfer.files
}

function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>()
  const unique: File[] = []

  files.forEach((file) => {
    const key = `${file.name}::${file.size}::${file.lastModified}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(file)
    }
  })

  return unique
}

export default function PostModal({ data, onClose }: PostModalProps) {
  const modalData = data as PostModalData | null
  const isEditMode = modalData?.mode === 'edit'
  const existingImageUrls = useMemo(() => {
    const urls = modalData?.post?.imageUrls?.map((url) => url.trim()).filter(Boolean) ?? []
    if (urls.length > 0) return [...new Set(urls)]

    const imageUrl = modalData?.post?.imageUrl?.trim()
    return imageUrl ? [imageUrl] : []
  }, [modalData?.post?.imageUrl, modalData?.post?.imageUrls])

  const initialValues = useMemo(() => {
    const lat = toNumber(modalData?.post?.lat)
    const lng = toNumber(modalData?.post?.lng)
    const type = plantTypeOptions.includes(modalData?.post?.type as PlantType) ? (modalData?.post?.type as PlantType) : 'tree'

    return {
      name: typeof modalData?.post?.name === 'string' ? modalData.post.name : '',
      type,
      lat: lat ?? 0,
      lng: lng ?? 0,
      locationLabel: lat !== undefined && lng !== undefined ? 'Selected location' : '',
      quote: typeof modalData?.post?.quote === 'string' ? modalData.post.quote : '',
    }
  }, [modalData?.post?.lat, modalData?.post?.lng, modalData?.post?.name, modalData?.post?.quote, modalData?.post?.type])

  const [removedExistingImageUrls, setRemovedExistingImageUrls] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<{ name: string; url: string }[]>(
    existingImageUrls.map((url, index) => ({
      name: `Current image ${index + 1}`,
      url,
    })),
  )

  const {
    register,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    submit,
    statusMessage,
    errorMessage,
    clearMessages,
  } = useCreatePlantPost({
    mode: isEditMode ? 'edit' : 'create',
    plantId: modalData?.post?.id,
    existingImageCount: existingImageUrls.length,
    removedImageUrls: removedExistingImageUrls,
    onSuccess: () => {
      modalData?.onSaved?.()
      onClose()
    },
    initialValues,
  })

  const {
    query,
    setQuery,
    results,
    hasResults,
    loading: locationLoading,
    errorMessage: locationError,
    runSearch,
    useCurrentLocation,
  } = usePlantLocationSearch({
    onLocationSelected: (location) => {
      setValue('lat', location.lat, { shouldValidate: true, shouldDirty: true })
      setValue('lng', location.lng, { shouldValidate: true, shouldDirty: true })
      setValue('locationLabel', location.label, { shouldValidate: true, shouldDirty: true })
      clearMessages()
    },
  })

  const lat = watch('lat')
  const lng = watch('lng')

  const visibleExistingImageUrls = useMemo(
    () => existingImageUrls.filter((url) => !removedExistingImageUrls.includes(url)),
    [existingImageUrls, removedExistingImageUrls],
  )

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewUrls([])
      return
    }

    const nextPreviews = selectedFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))

    setPreviewUrls(nextPreviews)

    return () => {
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [selectedFiles])

  useEffect(() => {
    setRemovedExistingImageUrls([])
    setSelectedFiles([])
  }, [modalData?.post?.id])

  const updateSelectedFiles = (nextFiles: File[]) => {
    const mergedFiles = dedupeFiles(nextFiles).slice(0, 5)
    setSelectedFiles(mergedFiles)

    setValue('images', mergedFiles.length ? toFileList(mergedFiles) : undefined, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearMessages()
    const incomingFiles = Array.from(event.target.files ?? [])
    if (incomingFiles.length === 0) {
      return
    }

    const mergedFiles = isEditMode ? [...selectedFiles, ...incomingFiles] : [...selectedFiles, ...incomingFiles]
    updateSelectedFiles(mergedFiles)

    // Clear the native input so selecting the same file again still triggers change.
    event.target.value = ''
  }

  const removeExistingImage = (imageUrl: string) => {
    clearMessages()
    setRemovedExistingImageUrls((current) => (current.includes(imageUrl) ? current : [...current, imageUrl]))
  }

  const restoreExistingImage = (imageUrl: string) => {
    clearMessages()
    setRemovedExistingImageUrls((current) => current.filter((url) => url !== imageUrl))
  }

  const removeSelectedImage = (indexToRemove: number) => {
    clearMessages()
    const nextFiles = selectedFiles.filter((_, index) => index !== indexToRemove)
    updateSelectedFiles(nextFiles)
  }

  const applyLocation = (location: PlantLocationSuggestion) => {
    setValue('lat', location.lat, { shouldValidate: true, shouldDirty: true })
    setValue('lng', location.lng, { shouldValidate: true, shouldDirty: true })
    setValue('locationLabel', location.label, { shouldValidate: true, shouldDirty: true })
    clearMessages()
  }

  return (
    <article className="mx-auto w-full min-w-0 max-w-3xl px-4 py-4 pb-6 sm:px-6 sm:py-6 sm:pb-8">
      <div className="flex items-start justify-between gap-4">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--earth-green-700)]">Plantera Action</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--earth-green-900)]">
            {isEditMode ? 'Edit Plant Post' : 'Plant a Sapling'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            {isEditMode
              ? 'Update the post details and location for this planting entry.'
              : 'Fill in the planting details, attach multiple image proofs, and publish your contribution to the globe.'}
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

      <form className="mt-6 space-y-6" onSubmit={submit}>
        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Plant name</span>
            <input
              {...register('name')}
              placeholder="e.g. Riverbank Sapling"
              className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />
            {errors.name ? <p className="text-xs text-red-700">{errors.name.message}</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Plant type</span>
            <select
              {...register('type')}
              className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            >
              {plantTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.type ? <p className="text-xs text-red-700">{errors.type.message}</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Latitude</span>
            <input
              type="number"
              step="any"
              {...register('lat')}
              placeholder="30.3165"
              className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />
            {errors.lat ? <p className="text-xs text-red-700">{errors.lat.message}</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-[var(--earth-green-900)]">Longitude</span>
            <input
              type="number"
              step="any"
              {...register('lng')}
              placeholder="78.0322"
              className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
            />
            {errors.lng ? <p className="text-xs text-red-700">{errors.lng.message}</p> : null}
          </label>
        </section>

        <section className="space-y-3 rounded-3xl border border-[rgba(28,35,16,0.12)] bg-[rgba(245,245,220,0.45)] p-4 sm:p-5">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--earth-green-900)]">Choose location</h3>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Search by area, city, state, or country, or use your current location. We’ll set the coordinates for you.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex-1 space-y-2">
              <label className="sr-only" htmlFor="plant-location-search">
                Search area, city, state, or country
              </label>
              <input
                id="plant-location-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  clearMessages()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void runSearch()
                  }
                }}
                placeholder="Search area, city, state, country"
                className="w-full rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
              />
            </div>

            <div className="flex gap-2 md:flex-none">
              <button
                type="button"
                onClick={() => {
                  void runSearch()
                }}
                disabled={locationLoading}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[var(--earth-green-700)] px-4 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)] disabled:cursor-not-allowed disabled:opacity-70 md:flex-none"
              >
                {locationLoading ? 'Searching...' : 'Search'}
              </button>

              <button
                type="button"
                onClick={() => {
                  void useCurrentLocation()
                }}
                disabled={locationLoading}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm font-semibold text-[var(--earth-green-900)] transition hover:bg-[rgba(245,245,220,0.85)] disabled:cursor-not-allowed disabled:opacity-70 md:flex-none"
              >
                Use current location
              </button>
            </div>
          </div>

          {locationError ? <p className="text-xs font-medium text-red-700">{locationError}</p> : null}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--earth-green-700)]">Selected coordinates</p>
            <div className="rounded-2xl border border-[rgba(28,35,16,0.12)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)]">
              <span className="font-semibold">Lat:</span> {Number.isFinite(lat) ? lat.toFixed(6) : '—'}{' '}
              <span className="ml-4 font-semibold">Lng:</span> {Number.isFinite(lng) ? lng.toFixed(6) : '—'}
            </div>
            {errors.locationLabel ? <p className="text-xs text-red-700">{errors.locationLabel.message}</p> : null}
          </div>

          {hasResults ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--earth-green-700)]">Results</p>
              <div className="grid gap-2">
                {results.map((location) => (
                  <button
                    key={`${location.lat}-${location.lng}-${location.label}`}
                    type="button"
                    onClick={() => applyLocation(location)}
                    className="rounded-2xl border border-[rgba(28,35,16,0.12)] bg-white px-4 py-3 text-left transition hover:border-[var(--earth-green-700)] hover:bg-[rgba(245,245,220,0.7)]"
                  >
                    <div className="text-sm font-semibold text-[var(--earth-green-900)]">{location.area || location.city || location.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
                      {[location.city, location.state, location.country].filter(Boolean).join(' • ')}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--earth-green-900)]">Quote</span>
          <textarea
            {...register('quote')}
            rows={4}
            placeholder="Share a small message about this planting action..."
            className="w-full resize-none rounded-2xl border border-[rgba(28,35,16,0.14)] bg-white px-4 py-3 text-sm text-[var(--earth-stone-900)] outline-none transition focus:border-[var(--earth-green-700)]"
          />
          {errors.quote ? <p className="text-xs text-red-700">{errors.quote.message}</p> : null}
        </label>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--earth-green-900)]">
                {isEditMode ? 'Manage images' : 'Upload images'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {isEditMode
                  ? 'Remove existing images or upload new ones to replace them.'
                  : 'Add one or more images to show the planting proof.'}
              </p>
            </div>
            <span className="text-xs font-medium text-[var(--earth-green-700)]">{isEditMode ? 'Editable' : 'Up to 5 images'}</span>
          </div>

          {isEditMode && visibleExistingImageUrls.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleExistingImageUrls.map((url, index) => (
                <figure key={url} className="overflow-hidden rounded-2xl border border-[rgba(28,35,16,0.12)] bg-white shadow-sm">
                  <div className="relative">
                    <img src={url} alt={`Current image ${index + 1}`} className="h-32 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-white"
                    >
                      Remove
                    </button>
                  </div>
                  <figcaption className="px-3 py-2 text-xs text-[var(--text-secondary)]">Current image {index + 1}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {isEditMode && removedExistingImageUrls.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--earth-green-900)]">Removed:</span>
              {removedExistingImageUrls.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => restoreExistingImage(url)}
                  className="rounded-full border border-[rgba(28,35,16,0.12)] bg-white px-3 py-1 text-xs font-medium text-[var(--earth-green-900)] transition hover:bg-[var(--earth-sand-100)]"
                >
                  Undo remove
                </button>
              ))}
            </div>
          ) : null}

          <label className="block cursor-pointer rounded-2xl border border-dashed border-[rgba(53,84,39,0.35)] bg-[rgba(245,245,220,0.55)] px-4 py-5 text-center transition hover:bg-[rgba(245,245,220,0.75)]">
            <input
              type="file"
              accept="image/*"
              multiple
              {...register('images')}
              onChange={onImageChange}
              className="hidden"
            />
            <p className="text-sm font-semibold text-[var(--earth-green-900)]">{isEditMode ? 'Add more images' : 'Choose image files'}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">JPEG, PNG, WEBP and similar image formats</p>
          </label>
          {!isEditMode && errors.images ? <p className="text-xs text-red-700">{errors.images.message}</p> : null}

          {previewUrls.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewUrls.map((preview, index) => (
                <figure key={preview.url} className="overflow-hidden rounded-2xl border border-[rgba(28,35,16,0.12)] bg-white shadow-sm">
                  <div className="relative">
                    <img src={preview.url} alt={preview.name} className="h-32 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(index)}
                      className="absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-white"
                    >
                      Remove
                    </button>
                  </div>
                  <figcaption className="px-3 py-2 text-xs text-[var(--text-secondary)]">{preview.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </section>

        <input type="hidden" {...register('lat')} />
        <input type="hidden" {...register('lng')} />
        <input type="hidden" {...register('locationLabel')} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            {isEditMode
              ? 'Changes will update the existing post on your profile.'
              : 'Posts are linked to your profile and can include multiple images.'}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[var(--earth-green-700)] px-6 py-3 text-sm font-semibold text-[var(--earth-sand-100)] transition hover:bg-[var(--earth-green-900)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Publishing...') : isEditMode ? 'Update Plant' : 'Publish Plant'}
          </button>
        </div>

        {statusMessage ? <p className="text-sm font-medium text-[var(--earth-green-700)]">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm font-medium text-red-700">{errorMessage}</p> : null}
      </form>
    </article>
  )
}
