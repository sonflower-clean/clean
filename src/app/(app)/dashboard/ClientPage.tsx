'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Printer } from 'lucide-react'

type Role = 'admin' | 'laundry_manager' | 'accommodation_manager'
type Accommodation = { id: string; name: string }
type Item = { id: string; name: string }
type RecordItem = { item_id: string; quantity: number; applied_price: number }
type DailyRecord = { id: string; date: string; accommodation_id: string; daily_record_items: RecordItem[] }
type Expense = { id: string; date: string; category: string; amount: number; description: string }

export default function ClientPage({
  role,
  userAccId,
  accommodations,
  items,
  records,
  expenses
}: {
  role: Role
  userAccId: string | null
  accommodations: Accommodation[]
  items: Item[]
  records: DailyRecord[]
  expenses: Expense[]
}) {
  const [selectedAccId, setSelectedAccId] = useState<string>(role === 'accommodation_manager' && userAccId ? userAccId : 'all')
  
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)

  const accOptions = role === 'accommodation_manager' 
    ? accommodations.filter(a => a.id === userAccId)
    : accommodations

  // Filter records by selected month and accommodation
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const isMatchAcc = selectedAccId === 'all' || r.accommodation_id === selectedAccId
      const isMatchMonth = r.date.startsWith(selectedMonth)
      return isMatchAcc && isMatchMonth
    })
  }, [records, selectedAccId, selectedMonth])

  // Filter expenses by selected month
  const filteredExpenses = useMemo(() => {
    if (role === 'accommodation_manager') return []
    return expenses.filter(e => e.date.startsWith(selectedMonth))
  }, [expenses, selectedMonth, role])

  // Calculate totals
  const totalRevenue = useMemo(() => {
    return filteredRecords.reduce((acc, record) => {
      const recordRevenue = record.daily_record_items.reduce((rAcc, item) => rAcc + (item.quantity * item.applied_price), 0)
      return acc + recordRevenue
    }, 0)
  }, [filteredRecords])

  const totalVolume = useMemo(() => {
    return filteredRecords.reduce((acc, record) => {
      const recordVolume = record.daily_record_items.reduce((rAcc, item) => rAcc + item.quantity, 0)
      return acc + recordVolume
    }, 0)
  }, [filteredRecords])

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0)
  }, [filteredExpenses])

  const totalProfit = totalRevenue - totalExpenses

  // Pivot Table Data: Accommodations vs Items
  const pivotData = useMemo(() => {
    const pData: Record<string, Record<string, number> & { totalRev: number }> = {}
    
    // Initialize
    accOptions.forEach(a => {
      pData[a.id] = { totalRev: 0 }
      items.forEach(i => pData[a.id][i.id] = 0)
    })

    filteredRecords.forEach(r => {
      if (!pData[r.accommodation_id]) return
      r.daily_record_items.forEach(item => {
        if (pData[r.accommodation_id][item.item_id] !== undefined) {
          pData[r.accommodation_id][item.item_id] += item.quantity
          pData[r.accommodation_id].totalRev += (item.quantity * item.applied_price)
        }
      })
    })

    return pData
  }, [filteredRecords, accOptions, items])

  // Chart Data: Daily Volume stacked
  const chartData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    if (!yearStr || !monthStr) return []
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate()
    
    const cData: Record<string, any> = {}
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = `${selectedMonth}-${String(i).padStart(2, '0')}`
      cData[dayStr] = { name: `${i}일` }
      items.forEach(item => cData[dayStr][item.name] = 0)
    }

    filteredRecords.forEach(r => {
      if (cData[r.date]) {
        r.daily_record_items.forEach(iRecord => {
          const itemDef = items.find(i => i.id === iRecord.item_id)
          if (itemDef) {
            cData[r.date][itemDef.name] += iRecord.quantity
          }
        })
      }
    })

    return Object.values(cData)
  }, [filteredRecords, selectedMonth, items])

  // Colors for stacked bar
  const colors = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#64748b']

  const handlePrint = () => {
    if (selectedAccId === 'all') {
      alert('출력할 숙박업소를 먼저 선택해주세요.')
      return
    }
    const url = `/print/monthly-report?accId=${selectedAccId}&month=${selectedMonth}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="text-2xl font-bold">대시보드</h1>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)'
            }}
          />

          {role !== 'accommodation_manager' && (
            <select 
              value={selectedAccId}
              onChange={e => setSelectedAccId(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            >
              <option value="all">전체 숙박업소</option>
              {accOptions.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          )}

          {selectedAccId !== 'all' && (
            <button 
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', background: 'var(--primary-600)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <Printer size={16} /> 월간 명세서 출력
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--surface-500)' }}>월간 총 세탁 수량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalVolume.toLocaleString()}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <CardTitle className="text-sm font-medium" style={{ color: 'var(--surface-500)' }}>월간 예상 매출액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}원</div>
          </CardContent>
        </Card>
        
        {role !== 'accommodation_manager' && (
          <>
            <Card>
              <CardHeader style={{ paddingBottom: '0.5rem' }}>
                <CardTitle className="text-sm font-medium" style={{ color: 'var(--surface-500)' }}>월간 총 비용</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">{totalExpenses.toLocaleString()}원</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader style={{ paddingBottom: '0.5rem' }}>
                <CardTitle className="text-sm font-medium" style={{ color: 'var(--surface-500)' }}>월간 예상 이익</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalProfit.toLocaleString()}원
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Cross-tab Table (Pivot) */}
      <Card>
        <CardHeader>
          <CardTitle>거래처별 세탁 품목 집계표 ({selectedMonth})</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ minWidth: '150px' }}>숙박업소</TableHead>
                  {items.map(item => (
                    <TableHead key={item.id} style={{ textAlign: 'center' }}>{item.name}</TableHead>
                  ))}
                  <TableHead style={{ textAlign: 'right' }}>예상 매출액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accOptions.map(acc => {
                  const rowData = pivotData[acc.id]
                  const hasData = rowData && Object.values(rowData).some(val => val > 0)
                  if (!hasData) return null

                  return (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      {items.map(item => (
                        <TableCell key={item.id} style={{ textAlign: 'center' }}>
                          {rowData[item.id] > 0 ? rowData[item.id].toLocaleString() : '-'}
                        </TableCell>
                      ))}
                      <TableCell style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {rowData.totalRev > 0 ? rowData.totalRev.toLocaleString() + '원' : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Total Row */}
                <TableRow style={{ backgroundColor: 'var(--surface-50)' }}>
                  <TableCell className="font-bold">합계</TableCell>
                  {items.map(item => {
                    const itemTotal = accOptions.reduce((acc, a) => acc + (pivotData[a.id]?.[item.id] || 0), 0)
                    return (
                      <TableCell key={item.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {itemTotal > 0 ? itemTotal.toLocaleString() : '-'}
                      </TableCell>
                    )
                  })}
                  <TableCell style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                    {totalRevenue > 0 ? totalRevenue.toLocaleString() + '원' : '-'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Chart: Daily Volume */}
      <Card style={{ height: '400px' }}>
        <CardHeader>
          <CardTitle>일별 품목 세탁량 추이</CardTitle>
        </CardHeader>
        <CardContent style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-200)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <RechartsTooltip />
              {items.map((item, index) => (
                <Bar 
                  key={item.id} 
                  dataKey={item.name} 
                  stackId="a" 
                  fill={colors[index % colors.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  )
}
