import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SettlementPage() {
  const supabase = await createClient()
  
  // Verify access (admin only)
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

  // Fetch accommodations
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // Fetch daily records with items
  const { data: records } = await supabase
    .from('daily_records')
    .select(`
      id,
      date,
      accommodation_id,
      daily_record_items (
        quantity,
        applied_price
      )
    `)

  // Fetch expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, date, amount')

  return (
    <ClientPage 
      accommodations={accommodations || []} 
      records={records || []} 
      expenses={expenses || []}
    />
  )
}
