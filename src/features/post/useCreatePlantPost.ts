import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../auth'
import { createPlantPost } from '../../services/planting'
import { plantPostSchema, type PlantPostFormValues } from './post.schema'

type PlantPostFormInput = Omit<z.input<typeof plantPostSchema>, 'lat' | 'lng'> & {
  lat: number
  lng: number
}
type PlantPostFormOutput = z.output<typeof plantPostSchema>

const DEFAULT_FORM_VALUES: PlantPostFormInput = {
  name: '',
  type: 'tree',
  lat: 0,
  lng: 0,
  locationLabel: '',
  quote: '',
  images: undefined as unknown as FileList,
}

type UseCreatePlantPostOptions = {
  onSuccess?: () => void
  initialValues?: Partial<PlantPostFormValues>
}

export function useCreatePlantPost(options?: UseCreatePlantPostOptions) {
  const { user } = useAuth()
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const defaultValues = useMemo(() => {
    return {
      ...DEFAULT_FORM_VALUES,
      ...options?.initialValues,
    }
  }, [options?.initialValues])

  const form = useForm<PlantPostFormInput, unknown, PlantPostFormOutput>({
    resolver: zodResolver(plantPostSchema) as unknown as ReturnType<typeof zodResolver<PlantPostFormInput, unknown, PlantPostFormOutput>>,
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
      await createPlantPost({
        userId: user.id,
        values,
      })

      setStatusMessage('Your plant post has been published.')
      form.reset(defaultValues)
      options?.onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create plant post.'
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
