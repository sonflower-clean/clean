'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Printer, TrendingUp, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'

type Accommodation = {
  id: string
  name: string
}

type Item = {
  id: string
  name: string
  unit: string
}

type RecordItem = {
  item_id: string
  quantity: number
}

type DailyRecord = {
  id: string
  date: string
  accommodation_id: string
  daily_record_items: RecordItem[]
}

interface ClientPageProps {
  accommodations: Accommodation[]
  items: Item[]
  records: DailyRecord[]
}

export default function ClientPage({ accommodations, items, records }: ClientPageProps) {
  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedAcc, setSelectedAcc] = useState<string>('all')

  // Generate unique years from records or fallback to current/prev years
  const availableYears = useMemo(() => {
    const years = records.map(r => new Date(r.date).getFullYear())
    const unique = Array.from(new Set(years)).sort((a, b) => b - a)
    return unique.length > 0 ? unique.map(String) : [new Date().getFullYear().toString()]
  }, [records])

  // Filter records based on selected year and accommodation
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const recDate = new Date(rec.date)
      const isYearMatch = recDate.getFullYear().toString() === selectedYear
      const isAccMatch = selectedAcc === 'all' || rec.accommodation_id === selectedAcc
      return isYearMatch && isAccMatch
    })
  }, [records, selectedYear, selectedAcc])

  // Get dynamic horizontal column list
  const cols = useMemo(() => {
    if (selectedMonth === 'all') {
      return Array.from({ length: 12 }, (_, i) => ({
        key: i + 1,
        label: `${i + 1}월`
      }))
    } else {
      const numDays = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate()
      return Array.from({ length: numDays }, (_, i) => ({
        key: i + 1,
        label: `${i + 1}일`
      }))
    }
  }, [selectedYear, selectedMonth])

  // Unified dynamic pivot calculation engine
  const pivotData = useMemo(() => {
    // Initialize data map: itemId -> colKey -> quantity
    const dataMap: Record<string, Record<number, number>> = {}
    
    items.forEach(item => {
      dataMap[item.id] = {}
      cols.forEach(col => {
        dataMap[item.id][col.key] = 0
      })
    })

    // Populate actual records quantity
    filteredRecords.forEach(rec => {
      const recDate = new Date(rec.date)
      const month = recDate.getMonth() + 1
      const day = recDate.getDate()

      if (selectedMonth === 'all') {
        // Monthly pivot
        rec.daily_record_items?.forEach(item => {
          if (dataMap[item.item_id] && dataMap[item.item_id][month] !== undefined) {
            dataMap[item.item_id][month] += item.quantity
          }
        })
      } else {
        // Daily pivot for selected month
        if (month.toString() === selectedMonth) {
          rec.daily_record_items?.forEach(item => {
            if (dataMap[item.item_id] && dataMap[item.item_id][day] !== undefined) {
              dataMap[item.item_id][day] += item.quantity
            }
          })
        }
      }
    })

    // Calculate rows with totals
    const rows = items.map(item => {
      const colValues = dataMap[item.id] || {}
      const rowSum = Object.values(colValues).reduce((sum, val) => sum + val, 0)
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        values: colValues,
        total: rowSum
      }
    }).filter(row => row.total > 0 || selectedMonth !== 'all') // Hide items with 0 total in annual view to keep table clean

    // Calculate column totals
    const colSums: Record<number, number> = {}
    let grandTotal = 0
    cols.forEach(col => {
      colSums[col.key] = items.reduce((sum, item) => sum + (dataMap[item.id]?.[col.key] || 0), 0)
      grandTotal += colSums[col.key]
    })

    return {
      rows,
      colSums,
      grandTotal
    }
  }, [items, filteredRecords, cols, selectedMonth])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; padding: 0; color: black; }
          .content { padding: 0; }
          .print-table-container { overflow: visible !important; width: 100% !important; }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            table-layout: fixed !important;
            page-break-inside: avoid; 
          }
          th, td { 
            border: 1px solid #333 !important; 
            padding: 4px 2px !important; 
            font-size: 8px !important; 
            word-break: break-all !important;
            white-space: normal !important;
          }
          .print-sticky { 
            position: static !important; 
            background: transparent !important; 
            border: 1px solid #333 !important; 
            box-shadow: none !important; 
          }
        }
        .print-only { display: none; }
        .sticky-left {
          position: sticky !important;
          left: 0;
          background-color: var(--surface-card);
          z-index: 10;
          box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
        }
        th.sticky-left {
          background-color: var(--surface-50) !important;
          z-index: 11;
        }
      `}</style>

      {/* Title Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp className="text-primary" size={28} />
          <h1 className="text-2xl font-bold">거래처별 세탁 실적</h1>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={16} /> 프린트 출력
        </Button>
      </div>

      {/* Print view Title */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>거래처별 세탁 수량 실적표</h1>
        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
          조회기준: {selectedYear}년 {selectedMonth === 'all' ? '전체 월' : `${selectedMonth}월`} | 
          거래처: {selectedAcc === 'all' ? '전체 숙박업소' : accommodations.find(a => a.id === selectedAcc)?.name}
        </p>
      </div>

      {/* Interactive Filter Widget */}
      <div className="no-print" style={{ 
        display: 'flex', 
        gap: '1rem', 
        padding: '1rem', 
        backgroundColor: 'var(--surface-50)', 
        borderRadius: 'var(--radius-lg)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>조회 연도</label>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '120px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>조회 월</label>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            <option value="all">전체 월 (연간)</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m.toString()}>{m}월</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--surface-600)' }}>거래처 (숙박업소)</label>
          <select 
            value={selectedAcc}
            onChange={(e) => setSelectedAcc(e.target.value)}
            style={{
              height: '2.5rem',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white'
            }}
          >
            <option value="all">전체 숙박업소 합산</option>
            {accommodations.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pivot Grid Table Card */}
      <Card className="print-table-container">
        <CardHeader className="no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 className="text-primary" size={20} />
            <CardTitle className="text-base font-bold">
              {selectedAcc === 'all' ? '전체 거래처' : accommodations.find(a => a.id === selectedAcc)?.name} 세탁 품목별 실적 표
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <Table style={{ borderCollapse: 'collapse', minWidth: selectedMonth === 'all' ? '900px' : '1500px', tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky-left print-sticky" style={{ width: '150px', fontWeight: 'bold', backgroundColor: 'var(--surface-50)', textAlign: 'center', left: 0 }}>
                    세탁 품목
                  </TableHead>
                  {cols.map(col => (
                    <TableHead key={col.key} style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 4px' }}>
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead style={{ width: '100px', textAlign: 'right', fontWeight: 'bold', backgroundColor: 'var(--primary-50)', color: 'var(--primary-900)', padding: '8px 4px' }}>
                    총 수량
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotData.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={cols.length + 2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--surface-400)' }}>
                      해당 기간에 등록된 세탁물 납품 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Item Rows */}
                    {pivotData.rows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="sticky-left print-sticky font-medium" style={{ backgroundColor: 'var(--surface-card)', textAlign: 'center', left: 0, borderRight: '1px solid var(--border-color)' }}>
                          {row.name} ({row.unit})
                        </TableCell>
                        {cols.map(col => {
                          const val = row.values[col.key] || 0
                          return (
                            <TableCell key={col.key} style={{ textAlign: 'right', padding: '6px 4px' }}>
                              {val > 0 ? `${val.toLocaleString()}` : '-'}
                            </TableCell>
                          )
                        })}
                        <TableCell className="font-bold" style={{ textAlign: 'right', backgroundColor: 'var(--primary-50)/10', color: 'var(--primary-700)', padding: '6px 4px' }}>
                          {row.total > 0 ? `${row.total.toLocaleString()}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Column Totals bottom row */}
                    <TableRow style={{ fontWeight: 'bold', backgroundColor: 'var(--surface-50)' }}>
                      <TableCell className="sticky-left print-sticky" style={{ backgroundColor: 'var(--surface-100)', textAlign: 'center', left: 0, borderRight: '1px solid var(--border-color)' }}>
                        합계 수량
                      </TableCell>
                      {cols.map(col => {
                        const sum = pivotData.colSums[col.key] || 0
                        return (
                          <TableCell key={col.key} style={{ textAlign: 'right', color: 'var(--primary-700)', padding: '6px 4px' }}>
                            {sum > 0 ? `${sum.toLocaleString()}` : '-'}
                          </TableCell>
                        )
                      })}
                      <TableCell style={{ textAlign: 'right', backgroundColor: 'var(--primary-100)', color: 'var(--primary-900)', fontSize: '0.9rem', padding: '6px 4px' }}>
                        {pivotData.grandTotal.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
