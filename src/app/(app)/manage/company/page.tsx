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

  // Fetch company info singleton (take latest row to prevent maybeSingle() errors if duplicates occur)
  const { data: companyInfoRows } = await supabase
    .from('company_info')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  let companyInfo = companyInfoRows?.[0] || null

  // If table was created but has no rows yet, insert the default '153-클린' row
  if (!companyInfo) {
    try {
      const { data: inserted, error } = await supabase
        .from('company_info')
        .insert({ name: '153-클린' })
        .select()
      if (!error && inserted?.[0]) {
        companyInfo = inserted[0]
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
    <ClientPage key={fallbackInfo.id || 'company-info'} companyInfo={fallbackInfo} />
  )
}
