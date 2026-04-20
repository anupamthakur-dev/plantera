import { useMemo, useState } from 'react'
import { getCurrentLocationCoordinates, searchPlantLocations, type PlantLocationSuggestion } from '../../services/planting'

type UsePlantLocationSearchOptions = {
  onLocationSelected?: (location: PlantLocationSuggestion) => void
}

export function usePlantLocationSearch(options?: UsePlantLocationSearchOptions) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlantLocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const hasResults = useMemo(() => results.length > 0, [results])

  const runSearch = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      setResults([])
      setErrorMessage('Type an area, city, state, or country.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const nextResults = await searchPlantLocations(trimmedQuery)
      setResults(nextResults)
    } catch (error) {
      setResults([])
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search locations.')
    } finally {
      setLoading(false)
    }
  }

  const useCurrentLocation = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const coordinates = await getCurrentLocationCoordinates()
      const location: PlantLocationSuggestion = {
        label: 'Current location',
        lat: coordinates.lat,
        lng: coordinates.lng,
      }
      options?.onLocationSelected?.(location)
      setResults([location])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to get your current location.')
    } finally {
      setLoading(false)
    }
  }

  return {
    query,
    setQuery,
    results,
    hasResults,
    loading,
    errorMessage,
    runSearch,
    useCurrentLocation,
  }
}
