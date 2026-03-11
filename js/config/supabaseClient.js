const supabaseUrl = 'https://bhbbjvcoujxzqaqjqnti.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_C_OFBl6KdorQVKjnHFBUyg_DamW_LmK'; 
const clientInstance = supabase.createClient(supabaseUrl, supabaseAnonKey);
export { clientInstance as supabase };