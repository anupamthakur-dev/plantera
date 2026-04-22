import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../auth'
import { createPlantPost, updatePlantPost } from '../../services/planting'
import { plantPostCreateSchema, plantPostUpdateSchema, type PlantPostFormValues, type PlantPostUpdateFormValues } from './post.schema'

type PlantPostFormInput = Omit<z.input<typeof plantPostCreateSchema>, 'lat' | 'lng' | 'images'> & {
  lat: number
  lng: number
  images?: FileList
}

const DEFAULT_FORM_VALUES: PlantPostFormInput = {
  name: '',
  type: 'tree',
  lat: 0,
  lng: 0,
  locationLabel: '',
  quote: '',
}

type UseCreatePlantPostOptions = {
  mode?: 'create' | 'edit'
  plantId?: string
  existingImageCount?: number
  removedImageUrls?: string[]
  onSuccess?: () => void
  initialValues?: Partial<Omit<PlantPostFormValues, 'images'>> | Partial<PlantPostUpdateFormValues>
}

export function useCreatePlantPost(options?: UseCreatePlantPostOptions) {
  const { user } = useAuth()
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const mode = options?.mode ?? 'create'

  const defaultValues = useMemo(() => {
    return {
      ...DEFAULT_FORM_VALUES,
      ...options?.initialValues,
      images: undefined,
    }
  }, [options?.initialValues])

  const resolverSchema = mode === 'edit' ? plantPostUpdateSchema : plantPostCreateSchema

  const form = useForm<PlantPostFormInput>({
    resolver: zodResolver(resolverSchema) as any,
    defaultValues,
    mode: 'onTouched',
  })

  const submit = form.handleSubmit(async (values) => {
    setStatusMessage('')
    setErrorMessage('')

    if (!user) {
      setErrorMessage('Please sign in before posting a plant.')
      return
    }

    try {
      if (mode === 'edit') {
        if (!options?.plantId) {
          setErrorMessage('Missing plant id for update.')
          return
        }

        const selectedImageCount = values.images instanceof FileList ? values.images.length : 0
        const remainingExistingImageCount = Math.max(0, (options?.existingImageCount ?? 0) - (options?.removedImageUrls?.length ?? 0))

        if (selectedImageCount + remainingExistingImageCount === 0) {
          setErrorMessage('Please select at least one image.')
          return
        }

        await updatePlantPost({
          userId: user.id,
          plantId: options.plantId,
          removedImageUrls: options.removedImageUrls,
          values: values as PlantPostUpdateFormValues,
        })

        setStatusMessage('Your plant post has been updated.')
      } else {
        await createPlantPost({
          userId: user.id,
          values: values as PlantPostFormValues,
        })

        setStatusMessage('Your plant post has been published.')
      }

      form.reset(defaultValues)
      options?.onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : mode === 'edit' ? 'Failed to update plant post.' : 'Failed to create plant post.'
      setErrorMessage(message)
    }
  })

  return {
    ...form,
    submit,
    statusMessage,
    errorMessage,
    clearMessages: () => {
      setStatusMessage('')
      setErrorMessage('')
    },
  }
}
