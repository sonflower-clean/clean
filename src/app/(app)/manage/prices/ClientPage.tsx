'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Save } from 'lucide-react'

type Accommodation = { id: string; name: string }
type Item = { id: string; name: string }
type Price = { id: string; accommodation_id: string; item_id: string; price: number }

export default function ClientPage({ 
  accommodations, 
  items, 
  initialPrices 
}: { 
  accommodations: Accommodation[], 
  items: Item[],
  initialPrices: Price[] 
}) {
  const [prices, setPrices] = useState<Price[]>(initialPrices)
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()

  const getPrice = (accId: string, itemId: string) => {
    const key = `${accId}_${itemId}`
    if (editedPrices[key] !== undefined) return editedPrices[key]
    const found = prices.find(p => p.accommodation_id === accId && p.item_id === itemId)
    return found ? found.price : ''
  }

  const handlePriceChange = (accId: string, itemId: string, value: string) => {
    const key = `${accId}_${itemId}`
    const numValue = parseInt(value, 10)
    
    setEditedPrices(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    const updates = []
    for (const key in editedPrices) {
      const [accId, itemId] = key.split('_')
      const priceValue = editedPrices[key]
      
      const existing = prices.find(p => p.accommodation_id === accId && p.item_id === itemId)
      
      if (existing) {
        // Update
        if (existing.price !== priceValue) {
          updates.push(
            supabase.from('accommodation_item_prices').update({ price: priceValue }).eq('id', existing.id)
          )
        }
      } else {
        // Insert
        updates.push(
          supabase.from('accommodation_item_prices').insert({
            accommodation_id: accId,
            item_id: itemId,
            price: priceValue
          })
        )
      }
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates)
      const hasError = results.some(r => r.error)
      if (hasError) {
        alert('일부 가격 저장에 실패했습니다.')
      } else {
        alert('저장되었습니다.')
        // In a real app we'd refresh or update state properly here.
        // For simplicity, we can just clear editedPrices and maybe refetch via router.refresh()
        window.location.reload()
      }
    } else {
      alert('변경 사항이 없습니다.')
    }
    
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-2xl font-bold">거래 단가 관리</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? '저장 중...' : '변경사항 저장'}
        </Button>
      </div>
      
      <p style={{ color: 'var(--surface-500)', fontSize: '0.875rem' }}>
        단가를 변경해도 이전 거래 내역에는 영향을 미치지 않습니다. 새로 입력하는 수량부터 새로운 단가가 적용됩니다.
      </p>

      <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ minWidth: '150px' }}>숙박업소 / 품목</TableHead>
              {items.map(item => (
                <TableHead key={item.id} style={{ minWidth: '120px', textAlign: 'center' }}>
                  {item.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {accommodations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={items.length + 1} style={{ textAlign: 'center' }}>등록된 업소가 없습니다.</TableCell>
              </TableRow>
            ) : (
              accommodations.map(acc => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  {items.map(item => (
                    <TableCell key={item.id} style={{ padding: '0.5rem' }}>
                      <input
                        type="number"
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          border: '1px solid var(--input-border)',
                          borderRadius: 'var(--radius-sm)',
                          textAlign: 'right'
                        }}
                        value={getPrice(acc.id, item.id)}
                        onChange={(e) => handlePriceChange(acc.id, item.id, e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
