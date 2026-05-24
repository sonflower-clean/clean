import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  
  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch initial data
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, accommodations(name)')
    .order('created_at', { ascending: false })

  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <ClientPage 
      initialData={profiles || []} 
      accommodations={accommodations || []} 
    />
  )
}
