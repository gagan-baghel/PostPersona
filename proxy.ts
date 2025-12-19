import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"


console.log(
  'SUPABASE URL:',
  process.env.NEXT_PUBLIC_SUPABASE_URL
)
console.log(
  'SUPABASE PUBLISHABLE DEFAULT KEY:',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

