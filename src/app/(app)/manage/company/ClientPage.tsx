'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Store, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type CompanyInfo = {
  id: string
  name: string
  business_number: string | null
  owner_name: string | null
  phone: string | null
  address: string | null
}

export default function ClientPage({ companyInfo }: { companyInfo: CompanyInfo }) {
  const [name, setName] = useState(companyInfo.name)
  const [businessNumber, setBusinessNumber] = useState(companyInfo.business_number || '')
  const [ownerName, setOwnerName] = useState(companyInfo.owner_name || '')
  const [phone, setPhone] = useState(companyInfo.phone || '')
  const [address, setAddress] = useState(companyInfo.address || '')
  
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        name,
        business_number: businessNumber,
        owner_name: ownerName,
        phone,
        address,
        updated_at: new Date().toISOString()
      }

      let error
      if (companyInfo.id) {
        // Update existing row
        const { error: err } = await supabase
          .from('company_info')
          .update(payload)
          .eq('id', companyInfo.id)
        error = err
      } else {
        // Insert new row if table was empty and fallback occurred
        const { error: err } = await supabase
          .from('company_info')
          .insert(payload)
        error = err
      }

      if (error) throw error

      alert('회사 정보가 안전하게 저장되었습니다.')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(`저장 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '650px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Store className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">회사 정보 관리</h1>
      </div>

      <p style={{ color: 'var(--surface-500)', fontSize: '0.875rem' }}>
        여기에서 설정하신 상호명, 대표자명, 주소 등의 사업자 정보는 **일별 세탁 납품서** 및 **월간 거래 명세서**의 공급자란에 자동으로 출력됩니다.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">공급자(153-클린) 정보 입력</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '1.5rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <Input 
              label="상호명 (업체명)" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder="예: 153-클린"
            />

            <Input 
              label="사업자등록번호" 
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              placeholder="예: 123-45-67890"
            />

            <Input 
              label="대표자 성명" 
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="예: 홍길동"
            />

            <Input 
              label="연락처 (전화번호)" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
            />

            <Input 
              label="사업장 소재지 (주소)" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="예: 서울시 중구 태평로..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button type="submit" disabled={saving} style={{ width: '100%', height: '2.75rem', gap: '0.5rem' }}>
                <Save size={16} /> {saving ? '회사 정보 저장 중...' : '회사 정보 저장'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
