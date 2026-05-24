import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientPage from './ClientPage'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  
  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ClientPage />
}
