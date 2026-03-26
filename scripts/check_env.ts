import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

console.log("Has NEXT_PUBLIC_SUPABASE_URL?", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("Has NEXT_PUBLIC_SUPABASE_ANON_KEY?", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
console.log("Has SUPABASE_SERVICE_ROLE_KEY?", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
