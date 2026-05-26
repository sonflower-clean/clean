'use client'

import { useEffect, useMemo } from 'react'

type Accommodation = {
  id: string
  name: string
  business_number: string
  owner_name: string
  phone: string
  address: string
}

type Item = {
  id: string
  name: string
}

type RecordItem = {
  item_id: string
  quantity: number
  applied_price: number
}

type DailyRecord = {
  id: string
  date: string
  daily_record_items: RecordItem[]
}

type CompanyInfo = {
  name: string
  business_number: string | null
  owner_name: string | null
  phone: string | null
  address: string | null
}

export default function ClientPage({
  accommodation,
  items,
  records,
  month,
  companyInfo
}: {
  accommodation: Accommodation
  items: Item[]
  records: DailyRecord[]
  month: string
  companyInfo: CompanyInfo
}) {
  
  useEffect(() => {
    // Automatically trigger print dialog when page loads
    setTimeout(() => {
      window.print()
    }, 500)
  }, [])

  // Calculate days in the given month
  const [yearStr, monthStr] = month.split('-')
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Map data for easier access
  // dateMap[day][item_id] = quantity
  // revenueMap[day] = daily revenue
  const dataMap = useMemo(() => {
    const map: Record<number, Record<string, number>> = {}
    const revMap: Record<number, number> = {}

    days.forEach(d => {
      map[d] = {}
      revMap[d] = 0
      items.forEach(i => map[d][i.id] = 0)
    })

    records.forEach(r => {
      const day = parseInt(r.date.split('-')[2], 10)
      if (map[day]) {
        r.daily_record_items.forEach(item => {
          if (map[day][item.item_id] !== undefined) {
            map[day][item.item_id] += item.quantity
            revMap[day] += (item.quantity * item.applied_price)
          }
        })
      }
    })

    return { map, revMap }
  }, [records, days, items])

  // Calculate totals
  const totals = useMemo(() => {
    const itemTotals: Record<string, number> = {}
    items.forEach(i => itemTotals[i.id] = 0)
    let totalRevenue = 0

    days.forEach(d => {
      items.forEach(i => {
        itemTotals[i.id] += dataMap.map[d][i.id]
      })
      totalRevenue += dataMap.revMap[d]
    })

    return { itemTotals, totalRevenue }
  }, [dataMap, days, items])

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { size: A4; margin: 6mm 10mm; }
          .print-container { padding: 0 !important; }
        }
        .print-container {
          padding: 1.5rem;
          background-color: white;
          color: black;
          font-family: sans-serif;
        }
        .print-title {
          text-align: center;
          font-size: 1.4rem;
          font-weight: bold;
          margin-bottom: 0.8rem;
          margin-top: 0;
        }
        .info-container {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.8rem;
        }
        .info-box {
          border: 1px solid #333;
          padding: 0.5rem;
          flex: 1;
        }
        .info-title {
          font-weight: bold;
          margin-bottom: 0.3rem;
          text-align: center;
          border-bottom: 1px solid #333;
          padding-bottom: 0.3rem;
          font-size: 0.8rem;
        }
        .info-row {
          display: flex;
          margin-bottom: 0.15rem;
          font-size: 0.75rem;
        }
        .info-label {
          width: 70px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0.5rem;
          font-size: 0.72rem;
          line-height: 1.2;
        }
        th, td {
          border: 1px solid #999;
          padding: 3px 2px;
          text-align: center;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
      `}} />

      <div className="no-print" style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
        <button 
          onClick={() => window.print()}
          style={{ padding: '0.5rem 1rem', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          인쇄하기
        </button>
        <button 
          onClick={() => window.close()}
          style={{ padding: '0.5rem 1rem', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '0.5rem' }}
        >
          닫기
        </button>
      </div>

      <h1 className="print-title">
        거래 명세서 ({yearStr}년 {monthStr}월)
      </h1>

      {/* Supplier & Receiver Info */}
      <div className="info-container">
        <div className="info-box">
          <div className="info-title">공급받는 자</div>
          <div className="info-row"><div className="info-label">상호명:</div><div>{accommodation.name}</div></div>
          <div className="info-row"><div className="info-label">사업자번호:</div><div>{accommodation.business_number || ' '}</div></div>
          <div className="info-row"><div className="info-label">대표자명:</div><div>{accommodation.owner_name || ' '}</div></div>
          <div className="info-row"><div className="info-label">연락처:</div><div>{accommodation.phone || ' '}</div></div>
          <div className="info-row"><div className="info-label">주소:</div><div>{accommodation.address || ' '}</div></div>
        </div>

        <div className="info-box">
          <div className="info-title">공급자</div>
          <div className="info-row"><div className="info-label">상호명:</div><div>{companyInfo.name}</div></div>
          <div className="info-row"><div className="info-label">사업자번호:</div><div>{companyInfo.business_number || ' '}</div></div>
          <div className="info-row"><div className="info-label">대표자명:</div><div>{companyInfo.owner_name || ' '}</div></div>
          <div className="info-row"><div className="info-label">연락처:</div><div>{companyInfo.phone || ' '}</div></div>
          <div className="info-row"><div className="info-label">주소:</div><div>{companyInfo.address || ' '}</div></div>
        </div>
      </div>

      {/* Data Table */}
      <table>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '40px' }}>일자</th>
            <th colSpan={items.length}>품목별 세탁 수량</th>
            <th rowSpan={2} style={{ width: '90px' }}>합계 금액</th>
            <th rowSpan={2} style={{ width: '80px' }}>비고</th>
          </tr>
          <tr>
            {items.map(item => (
              <th key={item.id}>{item.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td style={{ fontWeight: 'bold' }}>{day}일</td>
              {items.map(item => {
                const qty = dataMap.map[day][item.id]
                return <td key={item.id}>{qty > 0 ? qty : ''}</td>
              })}
              <td style={{ textAlign: 'right' }}>
                {dataMap.revMap[day] > 0 ? dataMap.revMap[day].toLocaleString() + '원' : ''}
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
            <td>합계</td>
            {items.map(item => (
              <td key={item.id}>{totals.itemTotals[item.id].toLocaleString()}</td>
            ))}
            <td style={{ textAlign: 'right' }}>{totals.totalRevenue.toLocaleString()}원</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
