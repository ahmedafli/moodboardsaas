'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function resetPassword(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    const isRateLimited = error.message.toLowerCase().includes('rate limit')
    if (isRateLimited) {
      cookieStore.set(
        'forgot_password_error',
        'Too many reset attempts. Please try again in 1 hour.',
        { path: '/forgot-password', maxAge: 60 }
      )
      return redirect('/forgot-password')
    }

    cookieStore.set('forgot_password_error', 'Unable to send reset link. Please try again.', {
      path: '/forgot-password',
      maxAge: 60,
    })
    return redirect('/forgot-password')
  }

  cookieStore.set('forgot_password_message', 'Check your email for the reset link', {
    path: '/forgot-password',
    maxAge: 60,
  })
  return redirect('/forgot-password')
}

export async function updatePassword(formData: FormData) {
  const cookieStore = await cookies()
  const isInviteFlow = Boolean(cookieStore.get('must_set_password'))
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const displayName = formData.get('displayName') as string
  const phone = formData.get('phone') as string

  if (!isInviteFlow && password !== confirmPassword) {
    return redirect('/update-password?error=' + encodeURIComponent('Passwords do not match'))
  }

  const updatePayload: {
    password: string
    data?: {
      display_name: string
      phone_number: string
    }
  } = {
    password: password,
  }

  if (isInviteFlow) {
    // Note: Providing 'phone' at the root might trigger an SMS provider error if SMS is not configured in Supabase.
    // Storing it in metadata is safer and still visible in profile data.
    updatePayload.data = {
      display_name: displayName,
      phone_number: phone,
    }
  }

  const { error } = await supabase.auth.updateUser(updatePayload)

  if (error) {
    return redirect('/update-password?error=' + encodeURIComponent(error.message))
  }

  // Clear the trap cookie after successful password setup.
  cookieStore.delete('must_set_password')

  // Invite + reset: sign out so /login shows the real form (proxy sends logged-in
  // users from /login to /home).
  await supabase.auth.signOut()
  return redirect('/login')
}
