import { supabase } from '../../features/auth'
import type { PlantPostFormValues } from '../../features/post/post.schema'

const PLANT_IMAGES_BUCKET = 'plant-images'

type UploadResult = {
  imageUrl: string
  storagePath: string
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
  return `plants/${userId}/${plantId}/${index + 1}-${safeFileName}`
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

async function cleanupPlantPost(plantId: string, uploadedPaths: string[]) {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from(PLANT_IMAGES_BUCKET).remove(uploadedPaths)
  }

  await supabase.from('plant_images').delete().eq('plant_id', plantId)
  await supabase.from('plants_planted').delete().eq('id', plantId)
}

export type CreatePlantPostInput = {
  userId: string
  values: PlantPostFormValues
}

export type CreatePlantPostResult = {
  plantId: string
  imageUrls: string[]
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
    const uploads = [] as UploadResult[]

    for (let index = 0; index < files.length; index += 1) {
      const upload = await uploadSingleImage(userId, plantId, files[index], index)
      uploadedPaths.push(upload.storagePath)
      uploads.push(upload)
    }

    const { error: imageInsertError } = await supabase.from('plant_images').insert(
      uploads.map((upload) => ({
        plant_id: plantId,
        image_url: upload.imageUrl,
      })),
    )

    if (imageInsertError) {
      throw imageInsertError
    }

    return {
      plantId,
      imageUrls: uploads.map((upload) => upload.imageUrl),
    }
  } catch (error) {
    await cleanupPlantPost(plantId, uploadedPaths)
    throw error
  }
}
