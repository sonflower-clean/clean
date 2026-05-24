import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PricesPage() {
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
    redirect('/dashboard')
  }

  // Fetch initial data
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const { data: items } = await supabase
    .from('items')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  const { data: prices } = await supabase
    .from('accommodation_item_prices')
    .select('*')

  return (
    <ClientPage 
      accommodations={accommodations || []} 
      items={items || []} 
      initialPrices={prices || []} 
    />
  )
}
