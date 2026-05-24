import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccommodationsPage() {
  const supabase = await createClient()
  
  // Verify admin access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin') {
    redirect('/dashboard') // Or some unauthorized page
  }

  // Fetch initial data
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('*')
    .order('created_at', { ascending: false })

  return <ClientPage initialData={accommodations || []} />
}
