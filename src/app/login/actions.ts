'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  
  if (!username || !password) {
    return { error: 'ID and password are required' }
  }

  let { error } = await supabase.auth.signInWithPassword({
    email: `${username}@clean.local`,
    password,
  })

  if (error) {
    const fallbackResult = await supabase.auth.signInWithPassword({
      email: `${username}@cleanapp.com`,
      password,
    })
    error = fallbackResult.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
