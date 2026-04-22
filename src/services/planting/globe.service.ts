import { supabase, isSupabaseConfigured } from '../../features/auth'
import type { GlobeViewportBounds, PlantType, PlantedPlant } from '../../components/Globe/plants'

type PlantTableRow = {
  id?: string
  name?: string
  type?: string
  lat?: number | string
  lng?: number | string
  user_id?: string
  scale?: number | string | null
  quote?: string | null
  planted_at?: string | number | null
  created_at?: string | number | null
}

type ProfileRow = {
  id?: string
  avatar_url?: string | null
  full_name?: string | null
  created_at?: string | null
  email?:string | null
}

type PlantImageRow = {
  plant_id?: string
  image_url?: string | null
}

export type SidebarPlantDetail = PlantedPlant & {
  imageUrls: string[]
}

export type SidebarUserPlantCard = {
  id: string
  name: string
  type: PlantType
  imageUrl: string | null
}

export type SidebarRegionalUserCard = {
  id: string
  name: string
  avatarUrl: string | null
  plantCountInRegion: number
}

export type PlantSidebarData = {
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
  plant: SidebarPlantDetail
  regionalUsers: SidebarRegionalUserCard[]
}

export type UserProfilePlantPost = {
  id: string
  name: string
  type: PlantType
  quote: string | null
  plantedAt: number
  lat: number
  lng: number
  imageUrl: string | null
  imageUrls: string[]
}

export type UserProfilePageData = {
  userId: string
  email:string
  name: string
  avatarUrl: string | null
  joinedAt: number | null
  postCount: number
  posts: UserProfilePlantPost[]
}

export type PlantPostDetails = {
  id: string
  name: string
  type: PlantType
  quote: string | null
  plantedAt: number
  lat: number
  lng: number
  imageUrls: string[]
  user: {
    id: string
    name: string
    avatarUrl: string | null
    email: string
  }
}

let isProfilesAvatarLookupAvailable = true

function isPlantType(type: string): type is PlantType {
  return type === 'tree' || type === 'bush' || type === 'flower' || type === 'desert'
}

function normalizePlantRow(row: PlantTableRow): PlantedPlant {
  const plantedAtSource = row.planted_at ?? row.created_at
  const lat = typeof row.lat === 'string' ? Number(row.lat) : row.lat
  const lng = typeof row.lng === 'string' ? Number(row.lng) : row.lng
  const scale = typeof row.scale === 'string' ? Number(row.scale) : row.scale
  const plantedAtValue = typeof plantedAtSource === 'string' ? Date.parse(plantedAtSource) : plantedAtSource
  const rowType = row.type ?? ''
  const normalizedType: PlantType = isPlantType(rowType) ? rowType : 'tree'
  const normalizedLat = typeof lat === 'number' && Number.isFinite(lat) ? lat : 0
  const normalizedLng = typeof lng === 'number' && Number.isFinite(lng) ? lng : 0
  const normalizedScale = typeof scale === 'number' && Number.isFinite(scale) ? scale : undefined

  return {
    id: row.id ?? crypto.randomUUID(),
    name: row.name ?? 'Planted plant',
    type: normalizedType,
    lat: normalizedLat,
    lng: normalizedLng,
    scale: normalizedScale,
    userId: row.user_id ?? 'unknown',
    quote: typeof row.quote === 'string' ? row.quote : null,
    userAvatarUrl: null,
    plantedAt: typeof plantedAtValue === 'number' && Number.isFinite(plantedAtValue)
      ? plantedAtValue
      : Date.now(),
  }
}

async function fetchAvatarByUserId(userIds: string[]): Promise<Map<string, string>> {
  if (!isProfilesAvatarLookupAvailable || userIds.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,avatar_url')
    .in('id', userIds)

  if (error) {
    isProfilesAvatarLookupAvailable = false
    console.warn('Profiles avatar lookup is unavailable. Falling back to default avatar.', error.message)
    return new Map<string, string>()
  }

  const avatarMap = new Map<string, string>()
  const rows = (data ?? []) as ProfileRow[]

  for (const row of rows) {
    if (!row.id || !row.avatar_url) continue
    avatarMap.set(row.id, row.avatar_url)
  }

  return avatarMap
}

async function fetchPlantImagesByIds(plantIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (plantIds.length === 0) return map

  const { data, error } = await supabase
    .from('plant_images')
    .select('plant_id,image_url')
    .in('plant_id', plantIds)

  if (error) {
    console.warn('Could not load plant images for sidebar', error.message)
    return map
  }

  const rows = (data ?? []) as PlantImageRow[]
  for (const row of rows) {
    if (!row.plant_id || !row.image_url) continue
    const existing = map.get(row.plant_id)
    if (existing) {
      existing.push(row.image_url)
    } else {
      map.set(row.plant_id, [row.image_url])
    }
  }

  return map
}

async function fetchUserProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,avatar_url,created_at,email')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Could not load user profile for plant sidebar', error.message)
    return null
  }

  return (data ?? null) as ProfileRow | null
}

function toTimestamp(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeLng(lng: number): number {
  if (lng > 180) return lng - 360
  if (lng < -180) return lng + 360
  return lng
}

function pickRandomSubset<T>(items: T[], minCount: number, maxCount: number): T[] {
  if (items.length === 0) return []

  const randomized = [...items]
  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temp = randomized[index]
    randomized[index] = randomized[randomIndex]
    randomized[randomIndex] = temp
  }

  const targetCount = Math.min(
    randomized.length,
    minCount + Math.floor(Math.random() * Math.max(1, maxCount - minCount + 1)),
  )

  return randomized.slice(0, targetCount)
}

async function fetchRegionalUsersForPlant(
  selectedPlant: PlantedPlant,
  selectedUserId: string,
): Promise<SidebarRegionalUserCard[]> {
  const regionLatSpan = 2.6
  const regionLngSpan = 2.6
  const minLat = Math.max(-90, selectedPlant.lat - regionLatSpan / 2)
  const maxLat = Math.min(90, selectedPlant.lat + regionLatSpan / 2)
  const minLng = normalizeLng(selectedPlant.lng - regionLngSpan / 2)
  const maxLng = normalizeLng(selectedPlant.lng + regionLngSpan / 2)

  const baseQuery = supabase
    .from('plants_planted')
    .select('user_id,lat,lng')
    .gte('lat', minLat)
    .lte('lat', maxLat)

  const fetchRows = async (query: typeof baseQuery) => {
    const { data, error } = await query
    if (error) {
      console.warn('Could not load regional users for sidebar', error.message)
      return [] as Array<{ user_id?: string }>
    }
    return (data ?? []) as Array<{ user_id?: string }>
  }

  const rows = minLng <= maxLng
    ? await fetchRows(baseQuery.gte('lng', minLng).lte('lng', maxLng))
    : [
        ...(await fetchRows(baseQuery.gte('lng', minLng))),
        ...(await fetchRows(baseQuery.lte('lng', maxLng))),
      ]

  const countsByUser = new Map<string, number>()
  for (const row of rows) {
    const userId = row.user_id?.trim()
    if (!userId || userId === selectedUserId) continue

    countsByUser.set(userId, (countsByUser.get(userId) ?? 0) + 1)
  }

  const regionalUserIds = [...countsByUser.keys()]
  if (regionalUserIds.length === 0) return []

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id,full_name,avatar_url')
    .in('id', regionalUserIds)

  if (profilesError) {
    console.warn('Could not load regional profile data for sidebar', profilesError.message)
  }

  const profileById = new Map<string, ProfileRow>()
  for (const row of (profileRows ?? []) as ProfileRow[]) {
    if (!row.id) continue
    profileById.set(row.id, row)
  }

  const cards = regionalUserIds.map((userId) => {
    const profile = profileById.get(userId)

    return {
      id: userId,
      name: profile?.full_name?.trim() || userId,
      avatarUrl: profile?.avatar_url || null,
      plantCountInRegion: countsByUser.get(userId) ?? 0,
    }
  })

  return pickRandomSubset(cards, 5, 6)
}

function isLngInsideBounds(lng: number, minLng: number, maxLng: number): boolean {
  if (minLng <= maxLng) return lng >= minLng && lng <= maxLng
  return lng >= minLng || lng <= maxLng
}

function isPlantInsideViewport(plant: PlantedPlant, viewport: GlobeViewportBounds): boolean {
  const insideLat = plant.lat >= viewport.minLat && plant.lat <= viewport.maxLat
  if (!insideLat) return false

  return isLngInsideBounds(plant.lng, viewport.minLng, viewport.maxLng)
}

async function fetchViewportPlantsChunk(viewport: GlobeViewportBounds): Promise<PlantedPlant[]> {
  const baseQuery = supabase
    .from('plants_planted')
    .select('*')
    .gte('lat', viewport.minLat)
    .lte('lat', viewport.maxLat)

  const fetchRows = async (query: typeof baseQuery) => {
    const { data, error } = await query

    if (error) {
      throw error
    }

    return (data ?? []) as PlantTableRow[]
  }

  const rows = viewport.minLng <= viewport.maxLng
    ? await fetchRows(baseQuery.gte('lng', viewport.minLng).lte('lng', viewport.maxLng))
    : [
        ...(await fetchRows(baseQuery.gte('lng', viewport.minLng))),
        ...(await fetchRows(baseQuery.lte('lng', viewport.maxLng))),
      ]

  const viewportPlants = rows
    .map(normalizePlantRow)
    .filter((plant) => isPlantInsideViewport(plant, viewport))

  const userIds = Array.from(new Set(viewportPlants.map((plant) => plant.userId).filter(Boolean)))
  const avatarByUserId = await fetchAvatarByUserId(userIds)

  return viewportPlants.map((plant) => ({
    ...plant,
    userAvatarUrl: avatarByUserId.get(plant.userId) ?? null,
  }))
}

export async function fetchPlantsInViewport(viewport: GlobeViewportBounds): Promise<PlantedPlant[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  return fetchViewportPlantsChunk(viewport)
}

export async function fetchPlantSidebarData(
  plantId: string,
  fallbackUserId?: string,
): Promise<PlantSidebarData | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data: plantData, error: plantError } = await supabase
    .from('plants_planted')
    .select('*')
    .eq('id', plantId)
    .maybeSingle()

  if (plantError) {
    throw plantError
  }

  if (!plantData) {
    return null
  }

  const selectedPlant = normalizePlantRow(plantData as PlantTableRow)
  const userId = selectedPlant.userId || fallbackUserId || 'unknown'

  const [profile, imagesByPlantId, regionalUsers] = await Promise.all([
    fetchUserProfile(userId),
    fetchPlantImagesByIds([selectedPlant.id]),
    fetchRegionalUsersForPlant(selectedPlant, userId),
  ])

  return {
    user: {
      id: userId,
      name: profile?.full_name?.trim() || userId,
      avatarUrl: profile?.avatar_url || selectedPlant.userAvatarUrl || null,
    },
    plant: {
      ...selectedPlant,
      imageUrls: imagesByPlantId.get(selectedPlant.id) ?? [],
    },
    regionalUsers,
  }
}

export async function fetchUserProfilePageData(userId: string): Promise<UserProfilePageData | null> {
  if (!isSupabaseConfigured || !userId.trim()) {
    return null
  }

  const normalizedUserId = userId.trim()

  const [profile, plantsResult] = await Promise.all([
    fetchUserProfile(normalizedUserId),
    supabase
      .from('plants_planted')
      .select('*')
      .eq('user_id', normalizedUserId)
      .order('planted_at', { ascending: false }),
  ])

  if (plantsResult.error) {
    throw plantsResult.error
  }

  const plantRows = (plantsResult.data ?? []) as PlantTableRow[]
  const normalizedPlants = plantRows.map(normalizePlantRow)
  const imagesByPlantId = await fetchPlantImagesByIds(normalizedPlants.map((plant) => plant.id))

  return {
    userId: normalizedUserId,
    name: profile?.full_name?.trim() || normalizedUserId,
    email:profile?.email || "",
    avatarUrl: profile?.avatar_url || null,
    joinedAt: toTimestamp(profile?.created_at),
    postCount: normalizedPlants.length,
    posts: normalizedPlants.map((plant) => ({
      id: plant.id,
      name: plant.name,
      type: plant.type,
      quote: plant.quote ?? null,
      plantedAt: plant.plantedAt,
      lat: plant.lat,
      lng: plant.lng,
      imageUrl: (imagesByPlantId.get(plant.id) ?? [])[0] ?? null,
      imageUrls: imagesByPlantId.get(plant.id) ?? [],
    })),
  }
}

export async function fetchPlantPostDetailsById(plantId: string): Promise<PlantPostDetails | null> {
  if (!isSupabaseConfigured || !plantId.trim()) {
    return null
  }

  const normalizedPlantId = plantId.trim()

  const { data: plantData, error: plantError } = await supabase
    .from('plants_planted')
    .select('*')
    .eq('id', normalizedPlantId)
    .maybeSingle()

  if (plantError) {
    throw plantError
  }

  if (!plantData) {
    return null
  }

  const normalizedPlant = normalizePlantRow(plantData as PlantTableRow)
  const [profile, imagesByPlantId] = await Promise.all([
    fetchUserProfile(normalizedPlant.userId),
    fetchPlantImagesByIds([normalizedPlant.id]),
  ])

  return {
    id: normalizedPlant.id,
    name: normalizedPlant.name,
    type: normalizedPlant.type,
    quote: normalizedPlant.quote ?? null,
    plantedAt: normalizedPlant.plantedAt,
    lat: normalizedPlant.lat,
    lng: normalizedPlant.lng,
    imageUrls: imagesByPlantId.get(normalizedPlant.id) ?? [],
    user: {
      id: normalizedPlant.userId,
      name: profile?.full_name?.trim() || normalizedPlant.userId,
      avatarUrl: profile?.avatar_url || null,
      email: profile?.email || '',
    },
  }
}