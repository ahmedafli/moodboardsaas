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
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    return redirect('/forgot-password?error=' + encodeURIComponent(error.message))
  }

  return redirect('/forgot-password?message=Check your email for the reset link')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  const phone = formData.get('phone') as string

  // Note: Providing 'phone' at the root might trigger an SMS provider error if SMS is not configured in Supabase.
  // Storing them in raw_user_meta_data is significantly safer and still visible in user profile data.
  const { error } = await supabase.auth.updateUser({
    password: password,
    data: {
      display_name: displayName,
      phone_number: phone,
    }
  })

  if (error) {
    return redirect('/update-password?error=' + encodeURIComponent(error.message))
  }

  // Clear the trap cookie!
  const cookieStore = await cookies()
  cookieStore.delete('must_set_password')

  return redirect('/home')
}
