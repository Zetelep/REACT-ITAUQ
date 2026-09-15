import imageCompression from 'browser-image-compression'
import { supabase } from './supabaseClient'

const BUCKET_NAME = 'ITAUQ'
const MAX_SIZE_KB = 500

export async function uploadQuestionnaireImage(file) {
  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_KB / 1024,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  })

  const ext = compressed.name?.split('.').pop() || 'jpg'
  const path = `questionnaires/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, compressed, { contentType: compressed.type, upsert: false })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return data.publicUrl
}
