import { supabase } from '../../features/auth'
import type { PlantPostFormValues, PlantPostUpdateFormValues } from '../../features/post/post.schema'

const PLANT_IMAGES_BUCKET = 'plant-images'

type UploadResult = {
  imageUrl: string
  storagePath: string
}

type PlantImageRow = {
  image_url?: string | null
  storage_path?: string | null
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildStoragePath(userId: string, plantId: string, index: number, file: File): string {
  const safeFileName = sanitizeFileName(file.name) || `image-${index + 1}.jpg`
  return `${userId}/${plantId}/${index + 1}-${safeFileName}`
}

async function uploadSingleImage(
  userId: string,
  plantId: string,
  file: File,
  index: number,
): Promise<UploadResult> {
  const storagePath = buildStoragePath(userId, plantId, index, file)

  const { error: uploadError } = await supabase.storage.from(PLANT_IMAGES_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(PLANT_IMAGES_BUCKET).getPublicUrl(storagePath)

  return {
    storagePath,
    imageUrl: data.publicUrl,
  }
}

async function removeStorageObjects(storagePaths: string[]): Promise<void> {
  const uniquePaths = [...new Set(storagePaths.map((path) => path.trim()).filter(Boolean))]
  if (uniquePaths.length === 0) return
  
  
  const { error } = await supabase.storage
    .from(PLANT_IMAGES_BUCKET)
    .remove(uniquePaths)

  if (error) {
    
    throw error
  }
  
  
}

async function fetchPlantImageRows(plantId: string): Promise<PlantImageRow[]> {
  const { data, error } = await supabase
    .from('plant_images')
    .select('image_url,storage_path')
    .eq('plant_id', plantId)

  if (error) {
    throw error
  }

  return (data ?? []) as PlantImageRow[]
}

function normalizeImageUrls(imageUrls: string[] | undefined): string[] {
  return [...new Set((imageUrls ?? []).map((url) => url.trim()).filter(Boolean))]
}

function getStoragePathFromRow(row: PlantImageRow): string | null {
  const storagePath = typeof row.storage_path === 'string' ? row.storage_path.trim() : ''
  return storagePath || null
}

export type CreatePlantPostInput = {
  userId: string
  values: PlantPostFormValues
}

export type CreatePlantPostResult = {
  plantId: string
  imageUrls: string[]
}

export type UpdatePlantPostInput = {
  userId: string
  plantId: string
  values: PlantPostUpdateFormValues
  removedImageUrls?: string[]
}

export type UpdatePlantPostResult = {
  plantId: string
}

export type DeletePlantPostInput = {
  userId: string
  plantId: string
}

async function insertPlantImages(rows: Array<{ plant_id: string; image_url: string; storage_path: string }>) {
  const { error } = await supabase.from('plant_images').insert(rows)
  if (error) {
    throw error
  }
}

export async function createPlantPost({ userId, values }: CreatePlantPostInput): Promise<CreatePlantPostResult> {
  const plantId = crypto.randomUUID()
  const quote = values.quote?.trim() || null
  const files = Array.from(values.images)
  const uploadedPaths: string[] = []

  const { error: plantError } = await supabase.from('plants_planted').insert({
    id: plantId,
    user_id: userId,
    name: values.name.trim(),
    type: values.type,
    lat: values.lat,
    lng: values.lng,
    quote,
  })

  if (plantError) {
    throw plantError
  }

  try {
    const uploads: UploadResult[] = []

    for (let index = 0; index < files.length; index += 1) {
      const upload = await uploadSingleImage(userId, plantId, files[index], index)
      uploadedPaths.push(upload.storagePath)
      uploads.push(upload)
    }

    await insertPlantImages(
      uploads.map((upload) => ({
        plant_id: plantId,
        image_url: upload.imageUrl,
        storage_path: upload.storagePath,
      })),
    )

    return {
      plantId,
      imageUrls: uploads.map((upload) => upload.imageUrl),
    }
  } catch (error) {
    await removeStorageObjects(uploadedPaths)
    await supabase.from('plant_images').delete().eq('plant_id', plantId)
    await supabase.from('plants_planted').delete().eq('id', plantId)
    throw error
  }
}

export async function updatePlantPost({ userId, plantId, values, removedImageUrls }: UpdatePlantPostInput): Promise<UpdatePlantPostResult> {
  const normalizedRemovedImageUrls = normalizeImageUrls(removedImageUrls)
  const incomingFiles = values.images instanceof FileList ? Array.from(values.images) : []
  const newFiles = incomingFiles.filter((file) => file.type.startsWith('image/'))
  const existingImageRows = await fetchPlantImageRows(plantId)
  const rowsMarkedForRemoval = existingImageRows.filter((row) => {
    const imageUrl = typeof row.image_url === 'string' ? row.image_url.trim() : ''
    return Boolean(imageUrl && normalizedRemovedImageUrls.includes(imageUrl))
  })
  const removedStoragePaths = rowsMarkedForRemoval
    .map((row) => getStoragePathFromRow(row))
    .filter((path): path is string => Boolean(path))
  const removedFallbackImageUrls = rowsMarkedForRemoval
    .map((row) => (typeof row.image_url === 'string' ? row.image_url.trim() : ''))
    .filter(Boolean)

  const uploadedPaths: string[] = []
  const uploadedImageRows: Array<{ plant_id: string; image_url: string; storage_path: string }> = []

  try {
    for (let index = 0; index < newFiles.length; index += 1) {
      const upload = await uploadSingleImage(userId, plantId, newFiles[index], existingImageRows.length + index)
      uploadedPaths.push(upload.storagePath)
      uploadedImageRows.push({
        plant_id: plantId,
        image_url: upload.imageUrl,
        storage_path: upload.storagePath,
      })
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('plants_planted')
      .update({
        name: values.name.trim(),
        type: values.type,
        lat: values.lat,
        lng: values.lng,
        quote: values.quote?.trim() || null,
      })
      .eq('id', plantId)
      .eq('user_id', userId)
      .select('id')

    if (updateError) {
      throw updateError
    }

    if (!updatedRows?.length) {
      throw new Error('Could not update plant post.')
    }

    if (uploadedImageRows.length > 0) {
      await insertPlantImages(uploadedImageRows)
    }

    if (removedStoragePaths.length > 0) {
      await removeStorageObjects(removedStoragePaths)
      const { error: deleteImagesError } = await supabase
        .from('plant_images')
        .delete()
        .eq('plant_id', plantId)
        .in('storage_path', removedStoragePaths)

      if (deleteImagesError) {
        throw deleteImagesError
      }
    }

    if (removedFallbackImageUrls.length > 0) {
      const { error: deleteFallbackError } = await supabase
        .from('plant_images')
        .delete()
        .eq('plant_id', plantId)
        .in('image_url', removedFallbackImageUrls)

      if (deleteFallbackError) {
        throw deleteFallbackError
      }
    }

    return { plantId }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removeStorageObjects(uploadedPaths)
    }

    if (uploadedImageRows.length > 0) {
      await supabase.from('plant_images').delete().eq('plant_id', plantId).in('storage_path', uploadedImageRows.map((row) => row.storage_path))
      await supabase.from('plant_images').delete().eq('plant_id', plantId).in('image_url', uploadedImageRows.map((row) => row.image_url))
    }

    throw error
  }
}

export async function deletePlantPost({ userId, plantId }: DeletePlantPostInput): Promise<void> {
  const imageRows = await fetchPlantImageRows(plantId)
  const storagePaths = imageRows
    .map((row) => getStoragePathFromRow(row))
    .filter((path): path is string => Boolean(path))

  if (storagePaths.length > 0) {
    await removeStorageObjects(storagePaths)
  }

  const { error: deleteImagesError } = await supabase.from('plant_images').delete().eq('plant_id', plantId)

  if (deleteImagesError) {
    throw deleteImagesError
  }

  const { error: deletePlantError } = await supabase
    .from('plants_planted')
    .delete()
    .eq('id', plantId)
    .eq('user_id', userId)

  if (deletePlantError) {
    throw deletePlantError
  }
}


