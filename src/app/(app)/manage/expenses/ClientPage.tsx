'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Plus, Edit2, Trash2, Printer } from 'lucide-react'

type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

const CATEGORIES = [
  { value: 'consumables', label: '소모품(세제, 자재 등)' },
  { value: 'maintenance', label: '유지비(전기, 가스, 물 등)' },
  { value: 'repair', label: '수리비(기기수리, 부품 등)' },
  { value: 'damage', label: '파손대환비(수건, 가운 파손 등)' },
  { value: 'other', label: '기타 비용' }
]

export default function ClientPage({ initialData, userId }: { initialData: Expense[], userId: string }) {
  const [data, setData] = useState<Expense[]>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Expense | null>(null)
  const [todayDate, setTodayDate] = useState('')

  // Filters State
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    setTodayDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])
  
  const supabase = createClient()

  // Generate unique years from data for filter
  const years = useMemo(() => {
    const allYears = data.map(item => new Date(item.date).getFullYear())
    const uniqueYears = Array.from(new Set(allYears)).sort((a, b) => b - a)
    return uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()]
  }, [data])

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.date)
      const isYearMatch = filterYear === 'all' || itemDate.getFullYear().toString() === filterYear
      const isMonthMatch = filterMonth === 'all' || (itemDate.getMonth() + 1).toString() === filterMonth
      const isCategoryMatch = filterCategory === 'all' || item.category === filterCategory
      return isYearMatch && isMonthMatch && isCategoryMatch
    })
  }, [data, filterYear, filterMonth, filterCategory])

  // Calculate sum of filtered items
  const totalAmount = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.amount, 0)
  }, [filteredData])

  const handleOpenModal = (item?: Expense) => {
    if (item) {
      setEditingItem(item)
    } else {
      setEditingItem(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const handleDelete = async (item: Expense) => {
    if (!window.confirm(`'${item.description}' 지출 내역을 정말 삭제하시겠습니까?\n(이 작업은 취소할 수 없습니다)`)) return

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', item.id)

    if (!error) {
      setData(data.filter(d => d.id !== item.id))
      alert('지출 내역이 삭제되었습니다.')
    } else {
      alert('삭제에 실패했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      date: formData.get('date') as string,
      category: formData.get('category') as string,
      amount: parseInt(formData.get('amount') as string, 10),
      description: formData.get('description') as string,
      created_by: userId
    }

    if (editingItem) {
      const { data: updated, error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editingItem.id)
        .select()
        .single()
        
      if (!error && updated) {
        setData(data.map(item => item.id === updated.id ? updated : item).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        handleCloseModal()
      } else {
        alert('저장에 실패했습니다.')
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .single()

      if (!error && inserted) {
        setData([inserted, ...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        handleCloseModal()
      } else {
        alert('저장에 실패했습니다.')
      }
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; padding: 0; }
          .content { padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-2xl font-bold">소모품 및 비용 관리</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} /> 프린트
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={16} /> 비용 내역 등록
          </Button>
        </div>
      </div>

      {/* Print Title (Only visible on print) */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>소모품 및 지출 비용 명세서</h1>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          출력일자: {format(new Date(), 'yyyy-MM-dd HH:mm')} | 
          필터링 조건: {filterYear === 'all' ? '전체 연도' : `${filterYear}년`} {filterMonth === 'all' ? '전체 월' : `${filterMonth}월`} {filterCategory === 'all' ? '전체 카테고리' : CATEGORIES.find(c => c.value === filterCategory)?.label}
        </p>
      </div>

      {/* Filters (Hidden on print) */}
      <div className="no-print" style={{ 
        display: 'flex', 
        gap: '1rem', 
        padding: '1rem', 
        backgroundColor: 'var(--surface-50)', 
        borderRadius: 'var(--radius-lg)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>연도 필터</label>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            <option value="all">전체 연도</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y}년</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>월 필터</label>
          <select 
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            <option value="all">전체 월</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m.toString()}>{m}월</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>카테고리 필터</label>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style={{ width: '15%', textAlign: 'center' }}>날짜</TableHead>
            <TableHead style={{ width: '25%', textAlign: 'center' }}>항목분류</TableHead>
            <TableHead style={{ width: '35%', textAlign: 'center' }}>내용</TableHead>
            <TableHead style={{ width: '15%', textAlign: 'right' }}>금액</TableHead>
            <TableHead className="no-print" style={{ width: '10%', textAlign: 'center' }}>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} style={{ textAlign: 'center', color: 'var(--surface-500)', padding: '2rem' }}>
                검색된 비용 내역이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell style={{ textAlign: 'center' }}>{item.date}</TableCell>
                <TableCell style={{ textAlign: 'center' }}>{CATEGORIES.find(c => c.value === item.category)?.label || item.category}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell className="font-medium text-danger" style={{ textAlign: 'right' }}>{item.amount.toLocaleString()}원</TableCell>
                <TableCell className="no-print">
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
                      <Edit2 size={16} /> 수정
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} /> 삭제
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
          {/* Total Row */}
          {filteredData.length > 0 && (
            <TableRow style={{ backgroundColor: 'var(--surface-50)', fontWeight: 'bold' }}>
              <TableCell style={{ textAlign: 'center' }}>합계</TableCell>
              <TableCell style={{ textAlign: 'center' }}>{filteredData.length}건</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-danger" style={{ textAlign: 'right', fontSize: '1rem' }}>
                {totalAmount.toLocaleString()}원
              </TableCell>
              <TableCell className="no-print"></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingItem ? '비용 내역 수정' : '신규 비용 등록'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>날짜</label>
            <input 
              type="date" 
              name="date"
              required
              defaultValue={editingItem?.date || todayDate}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>항목 분류</label>
            <select 
              name="category"
              required
              defaultValue={editingItem?.category || 'consumables'}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <Input 
            label="내용 (상세 설명)" 
            name="description" 
            required 
            defaultValue={editingItem?.description} 
            placeholder="예: 세제 20L 구매"
          />

          <Input 
            label="금액" 
            name="amount" 
            type="number"
            required 
            defaultValue={editingItem?.amount} 
            placeholder="0"
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={handleCloseModal}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
