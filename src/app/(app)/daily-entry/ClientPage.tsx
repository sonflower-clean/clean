'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Printer, Save } from 'lucide-react'

type Accommodation = { id: string; name: string }
type Item = { id: string; name: string }
type Price = { id: string; accommodation_id: string; item_id: string; price: number }

export default function ClientPage({ 
  accommodations, 
  items, 
  prices,
  userId
}: { 
  accommodations: Accommodation[], 
  items: Item[],
  prices: Price[],
  userId: string
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


  const selectedAccName = accommodations.find(a => a.id === selectedAcc)?.name || ''

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
      <div className="print-only" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '2rem' }}>세탁 일지 (납품서)</h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <p><strong>거래처:</strong> {selectedAccName}</p>
          <p><strong>날짜:</strong> {selectedDate}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', padding: '0.75rem', backgroundColor: '#f3f4f6' }}>품목</th>
              <th style={{ border: '1px solid black', padding: '0.75rem', backgroundColor: '#f3f4f6' }}>수량</th>
              <th style={{ border: '1px solid black', padding: '0.75rem', backgroundColor: '#f3f4f6' }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(item => (quantities[item.id] || 0) > 0).map(item => (
              <tr key={item.id}>
                <td style={{ border: '1px solid black', padding: '0.75rem', textAlign: 'center' }}>{item.name}</td>
                <td style={{ border: '1px solid black', padding: '0.75rem', textAlign: 'right' }}>{quantities[item.id]}</td>
                <td style={{ border: '1px solid black', padding: '0.75rem' }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'flex-end', gap: '2rem' }}>
          <p>인수자:</p>
          <p>(서명)</p>
        </div>
      </div>
    </div>
  )
}
