export type PlantLocationSuggestion = {
  label: string
  area?: string
  city?: string
  state?: string
  country?: string
  lat: number
  lng: number
}

type NominatimPlace = {
  display_name: string
  lat: string
  lon: string
  address?: {
    suburb?: string
    village?: string
    town?: string
    city?: string
    county?: string
    state?: string
    country?: string
  }
}

function buildLocationLabel(place: NominatimPlace): PlantLocationSuggestion {
  const address = place.address ?? {}
  const area = address.suburb ?? address.village ?? address.county
  const city = address.city ?? address.town ?? address.village ?? address.county
  const state = address.state
  const country = address.country

  return {
    label: place.display_name,
    area,
    city,
    state,
    country,
    lat: Number(place.lat),
    lng: Number(place.lon),
  }
}

export async function searchPlantLocations(query: string): Promise<PlantLocationSuggestion[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to search locations right now.')
  }

  const data = (await response.json()) as NominatimPlace[]
  return data
    .filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)))
    .map(buildLocationLabel)
}

export async function getCurrentLocationCoordinates(): Promise<{ lat: number; lng: number }> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('Geolocation is not available in this browser.')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => reject(new Error('Unable to access your current location.')),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      },
    )
  })
}
