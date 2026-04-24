import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute =
    url.pathname === '/login' ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/forgot-password')

  // Invite-only protection logic
  if (!user && !isAuthRoute) {
    // If it's an API route, return 401 instead of redirecting so frontend fetches don't break with HTML payloads.
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // TRAP: If they are forced to set a password from an invite trap cookie
  if (user && request.cookies.get('must_set_password') && url.pathname !== '/update-password' && !url.pathname.startsWith('/auth')) {
    url.pathname = '/update-password'
    return NextResponse.redirect(url)
  }

  if (user && url.pathname === '/login') {
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
