'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Printer, Calculator, DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList
} from 'recharts'
import { format } from 'date-fns'

type Accommodation = {
  id: string
  name: string
}

type RecordItem = {
  quantity: number
  applied_price: number
}

type DailyRecord = {
  id: string
  date: string
  accommodation_id: string
  daily_record_items: RecordItem[]
}

type Expense = {
  id: string
  date: string
  amount: number
  category: string
}

export default function ClientPage({
  accommodations,
  records,
  expenses
}: {
  accommodations: Accommodation[]
  records: DailyRecord[]
  expenses: Expense[]
}) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Available Years dynamic detection
  const years = useMemo(() => {
    const recordYears = records.map(r => new Date(r.date).getFullYear())
    const expenseYears = expenses.map(e => new Date(e.date).getFullYear())
    const allYears = [...recordYears, ...expenseYears, new Date().getFullYear()]
    return Array.from(new Set(allYears)).sort((a, b) => b - a)
  }, [records, expenses])

  // Filter records & expenses for selected year
  const yearRecords = useMemo(() => {
    return records.filter(r => new Date(r.date).getFullYear() === selectedYear)
  }, [records, selectedYear])

  const yearExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.date).getFullYear() === selectedYear)
  }, [expenses, selectedYear])

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // Monthly Revenue by Accommodation: accommodationId -> month -> amount
  const accommodationMonthlyRevenue = useMemo(() => {
    const revMap: Record<string, Record<number, number>> = {}
    
    accommodations.forEach(acc => {
      revMap[acc.id] = {}
      months.forEach(m => {
        revMap[acc.id][m] = 0
      })
    })

    yearRecords.forEach(r => {
      const dateObj = new Date(r.date)
      const month = dateObj.getMonth() + 1
      const accId = r.accommodation_id
      if (revMap[accId]) {
        const dailyRev = r.daily_record_items.reduce((sum, item) => sum + (item.quantity * item.applied_price), 0)
        revMap[accId][month] += dailyRev
      }
    })

    return revMap
  }, [yearRecords, accommodations])

  // Monthly Total Revenue: month -> amount
  const monthlyTotalRevenue = useMemo(() => {
    const revMap: Record<number, number> = {}
    months.forEach(m => {
      revMap[m] = 0
    })

    accommodations.forEach(acc => {
      months.forEach(m => {
        revMap[m] += accommodationMonthlyRevenue[acc.id]?.[m] || 0
      })
    })

    return revMap
  }, [accommodationMonthlyRevenue, accommodations])

  // Monthly Total Expenses: month -> amount
  const monthlyTotalExpenses = useMemo(() => {
    const expMap: Record<number, number> = {}
    months.forEach(m => {
      expMap[m] = 0
    })

    yearExpenses.forEach(e => {
      const dateObj = new Date(e.date)
      const month = dateObj.getMonth() + 1
      if (expMap[month] !== undefined) {
        expMap[month] += e.amount
      }
    })

    return expMap
  }, [yearExpenses])

  // Extract unique expense categories
  const expenseCategories = useMemo(() => {
    const cats = yearExpenses.map(e => e.category || '기타 비용')
    return Array.from(new Set(cats)).sort()
  }, [yearExpenses])

  // Calculate monthly expenses by category: category -> month -> amount
  const monthlyExpensesByCategory = useMemo(() => {
    const catMap: Record<string, Record<number, number>> = {}
    
    expenseCategories.forEach(cat => {
      catMap[cat] = {}
      months.forEach(m => {
        catMap[cat][m] = 0
      })
    })

    yearExpenses.forEach(e => {
      const dateObj = new Date(e.date)
      const month = dateObj.getMonth() + 1
      const cat = e.category || '기타 비용'
      if (catMap[cat] && catMap[cat][month] !== undefined) {
        catMap[cat][month] += e.amount
      }
    })

    return catMap
  }, [yearExpenses, expenseCategories])

  // Calculate annual expenses by category: category -> totalAmount
  const annualExpensesByCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    expenseCategories.forEach(cat => {
      totals[cat] = months.reduce((sum, m) => sum + (monthlyExpensesByCategory[cat]?.[m] || 0), 0)
    })
    return totals
  }, [monthlyExpensesByCategory, expenseCategories])

  // Monthly Net Profit: month -> amount
  const monthlyNetProfit = useMemo(() => {
    const profitMap: Record<number, number> = {}
    months.forEach(m => {
      profitMap[m] = (monthlyTotalRevenue[m] || 0) - (monthlyTotalExpenses[m] || 0)
    })
    return profitMap
  }, [monthlyTotalRevenue, monthlyTotalExpenses])

  // Annual Totals
  const annualTotalRevenue = useMemo(() => {
    return Object.values(monthlyTotalRevenue).reduce((sum, val) => sum + val, 0)
  }, [monthlyTotalRevenue])

  const annualTotalExpenses = useMemo(() => {
    return Object.values(monthlyTotalExpenses).reduce((sum, val) => sum + val, 0)
  }, [monthlyTotalExpenses])

  const annualNetProfit = annualTotalRevenue - annualTotalExpenses

  // Recharts Chart Data
  const chartData = useMemo(() => {
    return months.map(m => ({
      name: `${m}월`,
      매출액: monthlyTotalRevenue[m] || 0,
      지출비용: monthlyTotalExpenses[m] || 0,
      순이익: monthlyNetProfit[m] || 0
    }))
  }, [monthlyTotalRevenue, monthlyTotalExpenses, monthlyNetProfit])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Print Specific CSS */}
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
      `}</style>

      {/* Header (Screen only) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator className="text-primary" size={28} />
          <h1 className="text-2xl font-bold">연간 및 월간 결산</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} /> 결산서 인쇄
          </Button>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            style={{
              height: '2.5rem',
              padding: '0 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--input-border)',
              backgroundColor: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}년 결산</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Header (Print only) */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{selectedYear}년도 세탁 손익 결산 보고서</h1>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          출력자: 관리자 | 출력일시: {format(new Date(), 'yyyy-MM-dd HH:mm')} | 업체명: 153-클린
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <Card style={{ borderLeft: '4px solid var(--primary)' }}>
          <CardContent style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--surface-500)', fontWeight: 500 }}>연간 총 매출액</p>
              <h3 className="text-2xl font-bold text-primary" style={{ marginTop: '0.25rem' }}>
                {annualTotalRevenue.toLocaleString()}원
              </h3>
            </div>
            <div style={{ backgroundColor: 'var(--primary-50)', padding: '0.75rem', borderRadius: '50%' }}>
              <TrendingUp className="text-primary" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderLeft: '4px solid var(--danger)' }}>
          <CardContent style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--surface-500)', fontWeight: 500 }}>연간 총 지출 비용</p>
              <h3 className="text-2xl font-bold text-danger" style={{ marginTop: '0.25rem' }}>
                {annualTotalExpenses.toLocaleString()}원
              </h3>
            </div>
            <div style={{ backgroundColor: 'var(--danger-50)', padding: '0.75rem', borderRadius: '50%' }}>
              <ArrowDownRight className="text-danger" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderLeft: '4px solid var(--success)' }}>
          <CardContent style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--surface-500)', fontWeight: 500 }}>연간 순 이익</p>
              <h3 className="text-2xl font-bold text-success" style={{ marginTop: '0.25rem' }}>
                {annualNetProfit.toLocaleString()}원
              </h3>
            </div>
            <div style={{ backgroundColor: 'var(--success-50)', padding: '0.75rem', borderRadius: '50%' }}>
              <ArrowUpRight className="text-success" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart (Screen and Print versions) */}
      <div className="no-print">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">월별 세탁 손익 추이 ({selectedYear}년)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: '350px', padding: '1rem 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `${(val / 10000).toLocaleString()}만`} />
                <Tooltip formatter={(value: any) => [`${value.toLocaleString()}원`]} />
                <Legend />
                <Bar dataKey="매출액" fill="#0066cc">
                  <LabelList 
                    dataKey="매출액" 
                    position="top" 
                    formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                    style={{ fontSize: '9px', fill: '#0066cc', fontWeight: 'bold' }} 
                  />
                </Bar>
                <Bar dataKey="지출비용" fill="#ef4444">
                  <LabelList 
                    dataKey="지출비용" 
                    position="top" 
                    formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                    style={{ fontSize: '9px', fill: '#ef4444', fontWeight: 'bold' }} 
                  />
                </Bar>
                <Bar dataKey="순이익" fill="#10b981">
                  <LabelList 
                    dataKey="순이익" 
                    position="top" 
                    formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                    style={{ fontSize: '9px', fill: '#10b981', fontWeight: 'bold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Print-only fixed-size Chart to ensure it prints perfectly without collapsing */}
      <div className="print-only" style={{ margin: '1rem 0 2rem 0', pageBreakInside: 'avoid' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
          월별 세탁 손익 추이 ({selectedYear}년)
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BarChart
            width={780}
            height={220}
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            style={{ fontSize: '9px' }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(val) => `${(val / 10000).toLocaleString()}만`} />
            <Bar dataKey="매출액" fill="#0066cc">
              <LabelList 
                dataKey="매출액" 
                position="top" 
                formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                style={{ fontSize: '7px', fill: '#0066cc', fontWeight: 'bold' }} 
              />
            </Bar>
            <Bar dataKey="지출비용" fill="#ef4444">
              <LabelList 
                dataKey="지출비용" 
                position="top" 
                formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                style={{ fontSize: '7px', fill: '#ef4444', fontWeight: 'bold' }} 
              />
            </Bar>
            <Bar dataKey="순이익" fill="#10b981">
              <LabelList 
                dataKey="순이익" 
                position="top" 
                formatter={(val: any) => val && Number(val) > 0 ? `${(Number(val) / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만` : ''} 
                style={{ fontSize: '7px', fill: '#10b981', fontWeight: 'bold' }} 
              />
            </Bar>
          </BarChart>
        </div>
      </div>

      {/* Table 1: Monthly Financial Summary */}
      <Card className="print-table-container">
        <CardHeader className="no-print">
          <CardTitle className="text-lg">월별 종합 결산표</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '12%', minWidth: '80px', textAlign: 'center', fontWeight: 'bold' }}>구분</TableHead>
                {months.map(m => (
                  <TableHead key={m} style={{ width: '6.5%', minWidth: '55px', textAlign: 'right', fontWeight: 'bold' }}>{m}월</TableHead>
                ))}
                <TableHead style={{ width: '10%', minWidth: '90px', textAlign: 'right', fontWeight: 'bold', backgroundColor: 'var(--surface-50)' }}>합계</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Revenue */}
              <TableRow>
                <TableCell style={{ textAlign: 'center', fontWeight: 600 }}>매출액 (A)</TableCell>
                {months.map(m => (
                  <TableCell key={m} className="text-primary" style={{ textAlign: 'right', padding: '6px 4px' }}>
                    {monthlyTotalRevenue[m] > 0 ? `${monthlyTotalRevenue[m].toLocaleString()}원` : '-'}
                  </TableCell>
                ))}
                <TableCell className="font-bold text-primary" style={{ textAlign: 'right', backgroundColor: 'var(--surface-50)', padding: '6px 4px' }}>
                  {annualTotalRevenue.toLocaleString()}원
                </TableCell>
              </TableRow>

              {/* Expenses */}
              <TableRow style={{ backgroundColor: 'var(--surface-50)', fontWeight: 'bold' }}>
                <TableCell style={{ textAlign: 'center', fontWeight: 600 }}>지출비용 (B)</TableCell>
                {months.map(m => (
                  <TableCell key={m} className="text-danger" style={{ textAlign: 'right', padding: '6px 4px' }}>
                    {monthlyTotalExpenses[m] > 0 ? `${monthlyTotalExpenses[m].toLocaleString()}원` : '-'}
                  </TableCell>
                ))}
                <TableCell className="font-bold text-danger" style={{ textAlign: 'right', backgroundColor: 'var(--surface-50)', padding: '6px 4px' }}>
                  {annualTotalExpenses.toLocaleString()}원
                </TableCell>
              </TableRow>

              {/* Net Profit */}
              <TableRow style={{ backgroundColor: 'var(--success-50)', fontWeight: 'bold' }}>
                <TableCell style={{ textAlign: 'center' }}>순이익 (A-B)</TableCell>
                {months.map(m => {
                  const profit = monthlyNetProfit[m]
                  return (
                    <TableCell key={m} className={profit >= 0 ? 'text-success' : 'text-danger'} style={{ textAlign: 'right', padding: '6px 4px' }}>
                      {profit !== 0 ? `${profit.toLocaleString()}원` : '-'}
                    </TableCell>
                  )
                })}
                <TableCell className={annualNetProfit >= 0 ? 'text-success' : 'text-danger'} style={{ textAlign: 'right', fontSize: '0.95rem', padding: '6px 4px' }}>
                  {annualNetProfit.toLocaleString()}원
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Table 2: Accommodation Monthly Revenue Pivot Table */}
      <Card className="print-table-container">
        <CardHeader className="no-print">
          <CardTitle className="text-lg">거래처별 월간 세탁 매출 집계표</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="print-sticky" style={{ 
                  width: '12%',
                  minWidth: '120px', 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: 'var(--surface-50)', 
                  zIndex: 10,
                  boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                  borderRight: '1px solid var(--surface-200)'
                }}>
                  거래처명
                </TableHead>
                {months.map(m => (
                  <TableHead key={m} style={{ width: '6.5%', minWidth: '65px', textAlign: 'right', fontWeight: 'bold' }}>{m}월</TableHead>
                ))}
                <TableHead style={{ width: '10%', minWidth: '90px', textAlign: 'right', fontWeight: 'bold', backgroundColor: 'var(--surface-50)' }}>합계</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accommodations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} style={{ textAlign: 'center', color: 'var(--surface-500)' }}>
                    등록된 거래처가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                accommodations.map(acc => {
                  const accTotal = months.reduce((sum, m) => sum + (accommodationMonthlyRevenue[acc.id]?.[m] || 0), 0)
                  return (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium print-sticky" style={{ 
                        position: 'sticky', 
                        left: 0, 
                        backgroundColor: 'white', 
                        zIndex: 5,
                        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                        borderRight: '1px solid var(--surface-200)',
                        wordBreak: 'break-all'
                      }}>
                        {acc.name}
                      </TableCell>
                      {months.map(m => {
                        const amt = accommodationMonthlyRevenue[acc.id]?.[m] || 0
                        return (
                          <TableCell key={m} style={{ textAlign: 'right', padding: '6px 4px' }}>
                            {amt > 0 ? `${amt.toLocaleString()}원` : '-'}
                          </TableCell>
                        )
                      })}
                      <TableCell className="font-semibold" style={{ textAlign: 'right', backgroundColor: 'var(--surface-50)', padding: '6px 4px' }}>
                        {accTotal.toLocaleString()}원
                      </TableCell>
                    </TableRow>
                  )
                })
              )}

              {/* Grand Total Row */}
              <TableRow style={{ backgroundColor: 'var(--surface-100)', fontWeight: 'bold' }}>
                <TableCell className="print-sticky" style={{ 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: 'var(--surface-100)', 
                  zIndex: 5,
                  boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                  borderRight: '1px solid var(--surface-200)'
                }}>
                  합계
                </TableCell>
                {months.map(m => (
                  <TableCell key={m} style={{ textAlign: 'right', padding: '6px 4px' }}>
                    {monthlyTotalRevenue[m] > 0 ? `${monthlyTotalRevenue[m].toLocaleString()}원` : '-'}
                  </TableCell>
                ))}
                <TableCell style={{ textAlign: 'right', fontSize: '0.95rem', color: 'var(--primary-600)', padding: '6px 4px' }}>
                  {annualTotalRevenue.toLocaleString()}원
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Table 3: Monthly Expenditure Categories Pivot Table */}
      <Card className="print-table-container">
        <CardHeader className="no-print">
          <CardTitle className="text-lg">월별 지출 비용 항목 집계표</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <Table style={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHeader>
              <TableRow>
                <TableHead className="print-sticky" style={{ 
                  width: '12%',
                  minWidth: '120px', 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: 'var(--surface-50)', 
                  zIndex: 10,
                  boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                  borderRight: '1px solid var(--surface-200)'
                }}>
                  지출 항목
                </TableHead>
                {months.map(m => (
                  <TableHead key={m} style={{ width: '6.5%', minWidth: '65px', textAlign: 'right', fontWeight: 'bold' }}>{m}월</TableHead>
                ))}
                <TableHead style={{ width: '10%', minWidth: '90px', textAlign: 'right', fontWeight: 'bold', backgroundColor: 'var(--surface-50)' }}>합계</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} style={{ textAlign: 'center', color: 'var(--surface-500)' }}>
                    등록된 지출 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                expenseCategories.map(cat => {
                  return (
                    <TableRow key={cat}>
                      <TableCell className="font-medium print-sticky" style={{ 
                        position: 'sticky', 
                        left: 0, 
                        backgroundColor: 'white', 
                        zIndex: 5,
                        boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                        borderRight: '1px solid var(--surface-200)',
                        wordBreak: 'break-all'
                      }}>
                        {cat}
                      </TableCell>
                      {months.map(m => {
                        const amt = monthlyExpensesByCategory[cat]?.[m] || 0
                        return (
                          <TableCell key={m} style={{ textAlign: 'right', padding: '6px 4px' }}>
                            {amt > 0 ? `${amt.toLocaleString()}원` : '-'}
                          </TableCell>
                        )
                      })}
                      <TableCell className="font-semibold" style={{ textAlign: 'right', backgroundColor: 'var(--surface-50)', padding: '6px 4px' }}>
                        {annualExpensesByCategory[cat] > 0 ? `${annualExpensesByCategory[cat].toLocaleString()}원` : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}

              {/* Grand Total Row */}
              <TableRow style={{ backgroundColor: 'var(--surface-100)', fontWeight: 'bold' }}>
                <TableCell className="print-sticky" style={{ 
                  position: 'sticky', 
                  left: 0, 
                  backgroundColor: 'var(--surface-100)', 
                  zIndex: 5,
                  boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)',
                  borderRight: '1px solid var(--surface-200)'
                }}>
                  합계
                </TableCell>
                {months.map(m => (
                  <TableCell key={m} style={{ textAlign: 'right', padding: '6px 4px' }}>
                    {monthlyTotalExpenses[m] > 0 ? `${monthlyTotalExpenses[m].toLocaleString()}원` : '-'}
                  </TableCell>
                ))}
                <TableCell style={{ textAlign: 'right', fontSize: '0.95rem', color: 'var(--danger)', padding: '6px 4px' }}>
                  {annualTotalExpenses.toLocaleString()}원
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
