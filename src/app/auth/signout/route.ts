import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { ROL_COOKIE } from '@/lib/rol-cookie'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = new URL(request.url).origin
  const response = NextResponse.redirect(`${origin}/login`, { status: 302 })
  response.cookies.delete(ROL_COOKIE)
  return response
}
