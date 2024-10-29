import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createBrowserClient = () => {
  return createClientComponentClient()
}