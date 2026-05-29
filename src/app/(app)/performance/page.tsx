import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
  const supabase = await createClient()
  
  // Verify access (admin & laundry_manager)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role !== 'admin' && profile?.role !== 'laundry_manager') {
    redirect('/dashboard')
  }

  // Fetch accommodations
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Fetch laundry items
  const { data: items } = await supabase
    .from('items')
    .select('id, name, unit')
    .order('name')

  // Fetch daily records with items
  const { data: records } = await supabase
    .from('daily_records')
    .select(`
      id,
      date,
      accommodation_id,
      daily_record_items (
        item_id,
        quantity
      )
    `)

  return (
    <ClientPage 
      accommodations={accommodations || []} 
      items={items || []} 
      records={records || []} 
    />
  )
}
