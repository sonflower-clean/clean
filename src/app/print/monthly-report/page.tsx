import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientPage from './ClientPage'

export const dynamic = 'force-dynamic'

export default async function PrintMonthlyReportPage({
  searchParams
}: {
  searchParams: Promise<{ accId?: string; month?: string }>
}) {
  const supabase = await createClient()
  
  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const resolvedSearchParams = await searchParams
  const accId = resolvedSearchParams.accId
  const month = resolvedSearchParams.month // format: YYYY-MM

  if (!accId || !month) {
    return <div>잘못된 접근입니다. (숙박업소 및 월 정보 누락)</div>
  }

  // Fetch Accommodation details
  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('*')
    .eq('id', accId)
    .single()

  if (!accommodation) {
    return <div>해당 숙박업소를 찾을 수 없습니다.</div>
  }

  // Fetch Items
  const { data: items } = await supabase
    .from('items')
    .select('id, name')
    .order('name')

  // Fetch Daily Records for that month
  // date format is YYYY-MM-DD
  const startDate = `${month}-01`
  // Get last day of month
  const [yearStr, monthStr] = month.split('-')
  const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate()
  const endDate = `${month}-${lastDay}`

  const { data: records } = await supabase
    .from('daily_records')
    .select(`
      id, date,
      daily_record_items (
        item_id, quantity, applied_price
      )
    `)
    .eq('accommodation_id', accId)
    .gte('date', startDate)
    .lte('date', endDate)

  // Fetch Company Info details (bypass maybeSingle error)
  const { data: companyInfoRows } = await supabase
    .from('company_info')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  let companyInfo = companyInfoRows?.[0] || {
    name: '153-클린',
    business_number: '',
    owner_name: '',
    phone: '',
    address: ''
  }

  return (
    <ClientPage 
      accommodation={accommodation}
      items={items || []}
      records={records || []}
      month={month}
      companyInfo={companyInfo}
    />
  )
}
