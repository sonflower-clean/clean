import { createClient } from '@/utils/supabase/server'
import ClientPage from './ClientPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CompanyInfoPage() {
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

  // Fetch company info singleton
  let { data: companyInfo } = await supabase
    .from('company_info')
    .select('*')
    .maybeSingle()

  // If table was created but has no rows yet, insert the default '153-클린' row
  if (!companyInfo) {
    try {
      const { data: inserted, error } = await supabase
        .from('company_info')
        .insert({ name: '153-클린' })
        .select()
        .single()
      if (!error && inserted) {
        companyInfo = inserted
      }
    } catch (e) {
      console.error('Could not initialize company_info row:', e)
    }
  }

  // Fallback to empty values if DB is not initialized yet or fails
  const fallbackInfo = companyInfo || {
    id: '',
    name: '153-클린',
    business_number: '',
    owner_name: '',
    phone: '',
    address: ''
  }

  return (
    <ClientPage companyInfo={fallbackInfo} />
  )
}
