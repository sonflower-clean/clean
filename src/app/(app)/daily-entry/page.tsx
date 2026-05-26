import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DailyEntryPage() {
  const supabase = await createClient()
  
  // Verify access (admin or laundry_manager)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profile?.role === 'accommodation_manager') {
    redirect('/dashboard')
  }

  // Fetch necessary data
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, name, business_number, owner_name, phone, address')
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

  let { data: companyInfo } = await supabase
    .from('company_info')
    .select('*')
    .maybeSingle()

  if (!companyInfo) {
    companyInfo = {
      name: '153-클린',
      business_number: '',
      owner_name: '',
      phone: '',
      address: ''
    }
  }

  return (
    <ClientPage 
      accommodations={accommodations || []} 
      items={items || []} 
      prices={prices || []} 
      userId={user.id}
      companyInfo={companyInfo}
    />
  )
}
