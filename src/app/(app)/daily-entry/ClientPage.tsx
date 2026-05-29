'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Printer, Save } from 'lucide-react'

type Accommodation = { 
  id: string; 
  name: string;
  business_number?: string;
  owner_name?: string;
  phone?: string;
  address?: string;
}
type Item = { id: string; name: string }
type Price = { id: string; accommodation_id: string; item_id: string; price: number }

type CompanyInfo = {
  name: string
  business_number: string | null
  owner_name: string | null
  phone: string | null
  address: string | null
}

export default function ClientPage({ 
  accommodations, 
  items, 
  prices,
  userId,
  companyInfo
}: { 
  accommodations: Accommodation[], 
  items: Item[],
  prices: Price[],
  userId: string,
  companyInfo: CompanyInfo
}) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedAcc, setSelectedAcc] = useState<string>('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()

  const handleQuantityChange = (itemId: string, value: string) => {
    const num = parseInt(value, 10)
    setQuantities(prev => ({
      ...prev,
      [itemId]: isNaN(num) ? 0 : num
    }))
  }

  const handleSave = async () => {
    if (!selectedAcc) {
      alert('숙박업소를 선택해주세요.')
      return
    }

    // Filter out 0 quantities
    const itemsToSave = Object.entries(quantities).filter(([_, q]) => q > 0)
    if (itemsToSave.length === 0) {
      alert('입력된 수량이 없습니다.')
      return
    }

    setSaving(true)

    try {
      // 1. Create or get daily_record
      const { data: record, error: recordError } = await supabase
        .from('daily_records')
        .upsert({
          date: selectedDate,
          accommodation_id: selectedAcc,
          created_by: userId
        }, { onConflict: 'date,accommodation_id' })
        .select()
        .single()

      if (recordError) throw recordError

      // 2. Prepare items with current prices
      const recordItems = itemsToSave.map(([itemId, quantity]) => {
        const currentPrice = prices.find(p => p.accommodation_id === selectedAcc && p.item_id === itemId)?.price || 0
        return {
          record_id: record.id,
          item_id: itemId,
          quantity,
          applied_price: currentPrice
        }
      })

      // 3. Delete existing items for this record (to handle updates cleanly)
      await supabase.from('daily_record_items').delete().eq('record_id', record.id)

      // 4. Insert new items
      const { error: itemsError } = await supabase
        .from('daily_record_items')
        .insert(recordItems)

      if (itemsError) throw itemsError

      alert('저장되었습니다.')
      
      // Optionally reset form
      // setQuantities({})
    } catch (error: any) {
      console.error(error)
      alert(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Load existing data when date or accommodation changes
  const loadExistingData = async () => {
    if (!selectedAcc || !selectedDate) return
    
    const { data: record } = await supabase
      .from('daily_records')
      .select('id')
      .eq('date', selectedDate)
      .eq('accommodation_id', selectedAcc)
      .single()

    if (record) {
      const { data: items } = await supabase
        .from('daily_record_items')
        .select('item_id, quantity')
        .eq('record_id', record.id)
      
      if (items) {
        const loadedQs: Record<string, number> = {}
        items.forEach(i => {
          loadedQs[i.item_id] = i.quantity
        })
        setQuantities(loadedQs)
      }
    } else {
      setQuantities({})
    }
  }

  useEffect(() => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  useEffect(() => {
    loadExistingData()
  }, [selectedAcc, selectedDate])


  const selectedAccObj = accommodations.find(a => a.id === selectedAcc)
  const selectedAccName = selectedAccObj?.name || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hide controls during printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; padding: 0; }
          .content { padding: 0; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-2xl font-bold">일별 업무 입력</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} /> 프린트
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardContent style={{ paddingTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>날짜</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 2, minWidth: '300px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>숙박업소</label>
            <select 
              value={selectedAcc}
              onChange={(e) => setSelectedAcc(e.target.value)}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            >
              <option value="">-- 업체 선택 --</option>
              {accommodations.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedAcc && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-xl">세탁 수량 입력</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem' }}>{item.name}</label>
                <input 
                  type="number"
                  min="0"
                  value={quantities[item.id] || ''}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  placeholder="0"
                  style={{
                    height: '2.5rem',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--input-border)',
                    textAlign: 'right'
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Print View */}
      <div className="print-only" style={{ padding: '1.5rem', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            body { background: white; padding: 0; margin: 0; }
          }
          .print-title {
            text-align: center;
            font-size: 1.4rem;
            font-weight: bold;
            margin-bottom: 1rem;
            margin-top: 0;
          }
          .print-info-container {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 1rem;
          }
          .print-info-box {
            border: 1px solid #333;
            padding: 0.5rem;
            flex: 1;
            position: relative;
          }
          .print-stamp-box {
            position: absolute;
            right: 8px;
            bottom: 8px;
            width: 44px;
            height: 44px;
            border: 1px dashed #bbb;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #bbb;
            font-size: 10px;
            font-weight: 500;
            background: transparent;
          }
          .print-info-title {
            font-weight: bold;
            margin-bottom: 0.3rem;
            text-align: center;
            border-bottom: 1px solid #333;
            padding-bottom: 0.3rem;
            font-size: 0.85rem;
            background-color: #f5f5f5;
          }
          .print-info-row {
            display: flex;
            margin-bottom: 0.15rem;
            font-size: 0.75rem;
          }
          .print-info-label {
            width: 80px;
            font-weight: bold;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.75rem;
            font-size: 0.8rem;
          }
          .print-th, .print-td {
            border: 1px solid #333;
            padding: 0.5rem;
            text-align: center;
          }
          .print-th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
        `}} />

        <h1 className="print-title">세탁 일지 (납품서)</h1>
        
        {/* Supplier & Receiver Info */}
        <div className="print-info-container">
          <div className="print-info-box">
            <div className="print-info-title">공급받는 자</div>
            <div className="print-info-row"><div className="print-info-label">상호명:</div><div>{selectedAccObj?.name || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">사업자번호:</div><div>{selectedAccObj?.business_number || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">대표자명:</div><div>{selectedAccObj?.owner_name || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">연락처:</div><div>{selectedAccObj?.phone || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">주소:</div><div>{selectedAccObj?.address || ''}</div></div>
          </div>

          <div className="print-info-box">
            <div className="print-info-title">공급자</div>
            <div className="print-info-row"><div className="print-info-label">상호명:</div><div>{companyInfo.name}</div></div>
            <div className="print-info-row"><div className="print-info-label">사업자번호:</div><div>{companyInfo.business_number || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">대표자명:</div><div>{companyInfo.owner_name || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">연락처:</div><div>{companyInfo.phone || ''}</div></div>
            <div className="print-info-row"><div className="print-info-label">주소:</div><div>{companyInfo.address || ''}</div></div>
            <div className="print-stamp-box">직인</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          <p><strong>납품일자:</strong> {selectedDate}</p>
        </div>

        {/* Data Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-th" style={{ width: '35%' }}>품목</th>
              <th className="print-th" style={{ width: '15%' }}>수량</th>
              <th className="print-th" style={{ width: '20%' }}>단가</th>
              <th className="print-th" style={{ width: '20%' }}>가격</th>
              <th className="print-th" style={{ width: '10%' }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(item => (quantities[item.id] || 0) > 0).map(item => {
              const qty = quantities[item.id] || 0
              const unitPrice = prices.find(p => p.accommodation_id === selectedAcc && p.item_id === item.id)?.price || 0
              const totalPrice = qty * unitPrice
              return (
                <tr key={item.id}>
                  <td className="print-td">{item.name}</td>
                  <td className="print-td" style={{ textAlign: 'right' }}>{qty.toLocaleString()}개</td>
                  <td className="print-td" style={{ textAlign: 'right' }}>{unitPrice.toLocaleString()}원</td>
                  <td className="print-td" style={{ textAlign: 'right', fontWeight: 'bold' }}>{totalPrice.toLocaleString()}원</td>
                  <td className="print-td"></td>
                </tr>
              )
            })}
            {/* Grand Total Row */}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
              <td className="print-td">합계</td>
              <td className="print-td" style={{ textAlign: 'right' }}>
                {items.reduce((acc, item) => acc + (quantities[item.id] || 0), 0).toLocaleString()}개
              </td>
              <td className="print-td" style={{ textAlign: 'right' }}>-</td>
              <td className="print-td" style={{ textAlign: 'right', color: 'var(--primary-600)' }}>
                {items.reduce((acc, item) => {
                  const qty = quantities[item.id] || 0
                  const unitPrice = prices.find(p => p.accommodation_id === selectedAcc && p.item_id === item.id)?.price || 0
                  return acc + (qty * unitPrice)
                }, 0).toLocaleString()}원
              </td>
              <td className="print-td"></td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end', gap: '3rem', fontSize: '0.85rem' }}>
          <p>납품자: 153-클린 (서명)</p>
          <p>인수자: {selectedAccObj?.owner_name || selectedAccObj?.name || ''} (서명)</p>
        </div>
      </div>
    </div>
  )
}
