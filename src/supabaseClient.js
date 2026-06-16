import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://deqchbqeajwrwdfwzxuc.supabase.co'
const supabaseAnonKey = 'sb_publishable_rkS7_vmCIWW9exv3TQ4Mqg_Oti1NSM2'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
