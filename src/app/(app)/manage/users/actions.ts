'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  const supabaseServer = await createClient()
  
  // Verify admin
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabaseServer.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const role = formData.get('role') as string
  const accommodation_id = formData.get('accommodation_id') as string

  if (!username || !password || !full_name || !role) {
    return { error: '필수 항목이 누락되었습니다.' }
  }

  const email = `${username}@cleanapp.com`

  // Use a dummy client to sign up without affecting the current admin's session
  const tempClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
      }
    }
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  const newUserId = signUpData.user?.id
  if (!newUserId) {
    return { error: '계정 생성에 실패했습니다.' }
  }

  // Update profile with accommodation_id if necessary
  if (role === 'accommodation_manager' && accommodation_id) {
    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ accommodation_id })
      .eq('id', newUserId)

    if (updateError) {
      return { error: '계정은 생성되었으나 담당 업소 지정에 실패했습니다: ' + updateError.message }
    }
  }

  revalidatePath('/manage/users')
  return { success: true }
}
