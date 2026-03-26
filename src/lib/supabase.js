import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://uglpdknnakxmptrjfxte.supabase.co"
const supabaseKey = "sb_publishable_6n_5h9pF3oxYM9mJxgWN_g_UQuBvNXX"

export const supabase = createClient(supabaseUrl, supabaseKey)