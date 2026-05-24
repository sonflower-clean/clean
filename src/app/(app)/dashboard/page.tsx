import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, accommodation_id')
    .eq('id', user.id)
    .single()
    
  const role = profile?.role || 'accommodation_manager'
  const userAccId = profile?.accommodation_id

  // Fetch Accommodations
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name')
    .order('name')

  // Fetch Items
  const { data: items } = await supabase
    .from('items')
    .select('id, name')
    .order('name')

  // Build query for daily records
  let recordsQuery = supabase
    .from('daily_records')
    .select(`
      id, date, accommodation_id,
      daily_record_items (
        item_id, quantity, applied_price
      )
    `)
    
  if (role === 'accommodation_manager' && userAccId) {
    recordsQuery = recordsQuery.eq('accommodation_id', userAccId)
  }

  const { data: records } = await recordsQuery

  // Fetch expenses (only relevant for admin/manager, but we can fetch it and filter in UI)
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })

  return (
    <ClientPage 
      role={role}
      userAccId={userAccId}
      accommodations={accommodations || []}
      items={items || []}
      records={records || []}
      expenses={expenses || []}
    />
  )
}
