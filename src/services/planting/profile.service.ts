import { supabase } from '../../features/auth'

const PROFILE_AVATAR_BUCKET = 'avatars'

export type UpdateUserProfileInput = {
  userId: string
  fullName: string
  avatarUrl: string | null
  avatarFile?: File | null
}

export type UpdateUserProfileResult = {
  userId: string
  fullName: string
  avatarUrl: string | null
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : ''
  const safeExtension = fileExtension ? `.${sanitizeFileName(fileExtension)}` : ''
  const storagePath = `${userId}/${crypto.randomUUID()}${safeExtension}`

  const { error: uploadError } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

export async function updateUserProfile({
  userId,
  fullName,
  avatarUrl,
  avatarFile,
}: UpdateUserProfileInput): Promise<UpdateUserProfileResult> {
  const normalizedUserId = userId.trim()
  const normalizedFullName = fullName.trim()
  const normalizedAvatarUrl = avatarUrl?.trim() || null

  if (!normalizedUserId) {
    throw new Error('User id is required')
  }

  if (!normalizedFullName) {
    throw new Error('Full name is required')
  }

  const uploadedAvatarUrl = avatarFile ? await uploadAvatarImage(normalizedUserId, avatarFile) : normalizedAvatarUrl

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: normalizedUserId,
      full_name: normalizedFullName,
      avatar_url: uploadedAvatarUrl,
    },
    {
      onConflict: 'id',
    },
  )

  if (profileError) {
    throw profileError
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: normalizedFullName,
      avatar_url: uploadedAvatarUrl ?? undefined,
    },
  })

  if (authError) {
    console.warn('Profile saved, but auth metadata could not be updated.', authError.message)
  }

  return {
    userId: normalizedUserId,
    fullName: normalizedFullName,
    avatarUrl: uploadedAvatarUrl,
  }
}