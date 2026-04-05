import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  // 1. Handle OAuth (Google)
  const code = searchParams.get('code')
  // 2. Handle Email Links (Invite, Reset Password)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const next = searchParams.get('next') ?? '/home'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) return NextResponse.redirect(`${origin}${next}`)
      else if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
      else return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })
    if (!error) {
      let response = NextResponse.redirect(`${origin}${next}`)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (!isLocalEnv && forwardedHost) {
        response = NextResponse.redirect(`https://${forwardedHost}${next}`)
      }

      if (type === 'invite') {
        response.cookies.set('must_set_password', 'true', {
          maxAge: 3600,
          path: '/',
        })
      }
      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+link`)
}
