import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing')
      throw new Error('Supabase credentials not configured')
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey)
  }
  return supabaseClient
}

