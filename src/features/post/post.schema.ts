import { z } from 'zod'
import type { PlantType } from '../../components/Globe/plants'

const plantTypeValues = ['tree', 'bush', 'flower', 'desert'] as const satisfies readonly PlantType[]

function isFileList(value: unknown): value is FileList {
  return typeof FileList !== 'undefined' && value instanceof FileList
}

const imageFileSchema = z
  .custom<FileList>(isFileList, 'Please select at least one image.')
  .refine((files) => files.length > 0, 'Please select at least one image.')
  .refine((files) => files.length <= 5, 'You can upload up to 5 images.')
  .refine(
    (files) => Array.from(files).every((file) => file.type.startsWith('image/')),
    'Only image files are allowed.',
  )
  .refine(
    (files) => Array.from(files).every((file) => file.size <= 5 * 1024 * 1024),
    'Each image must be 5 MB or smaller.',
  )

export const plantPostSchema = z.object({
  name: z.string().trim().min(2, 'Plant name is required.').max(80, 'Plant name is too long.'),
  type: z.enum(plantTypeValues),
  lat: z.coerce.number().finite('Latitude must be a valid number.').min(-90, 'Latitude must be between -90 and 90.').max(90, 'Latitude must be between -90 and 90.'),
  lng: z.coerce.number().finite('Longitude must be a valid number.').min(-180, 'Longitude must be between -180 and 180.').max(180, 'Longitude must be between -180 and 180.'),
  locationLabel: z.string().trim().min(3, 'Select a location before publishing.'),
  quote: z
    .string()
    .trim()
    .max(240, 'Quote must be 240 characters or fewer.')
    .optional()
    .or(z.literal('')),
  images: imageFileSchema,
})

export type PlantPostFormValues = z.infer<typeof plantPostSchema>
export const plantTypeOptions = plantTypeValues
