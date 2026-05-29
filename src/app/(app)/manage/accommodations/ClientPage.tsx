'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Plus, Edit2, Trash2 } from 'lucide-react'

type Accommodation = {
  id: string;
  name: string;
  business_number: string;
  owner_name: string;
  phone: string;
  address: string;
  is_active: boolean;
}

export default function ClientPage({ initialData }: { initialData: Accommodation[] }) {
  const [data, setData] = useState<Accommodation[]>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Accommodation | null>(null)
  
  const supabase = createClient()

  const handleOpenModal = (item?: Accommodation) => {
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

  const handleDelete = async (item: Accommodation) => {
    if (!window.confirm(`'${item.name}' 업소를 정말 삭제(비활성화)하시겠습니까?\n(거래 종료 상태로 변경됩니다)`)) return

    const { error } = await supabase
      .from('accommodations')
      .update({ is_active: false })
      .eq('id', item.id)

    if (!error) {
      setData(data.map(d => d.id === item.id ? { ...d, is_active: false } : d))
      alert('비활성화 처리되었습니다.')
    } else {
      alert('비활성화 처리에 실패했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      name: formData.get('name') as string,
      business_number: formData.get('business_number') as string,
      owner_name: formData.get('owner_name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      is_active: formData.get('is_active') === 'on'
    }

    if (editingItem) {
      // Update
      const { data: updated, error } = await supabase
        .from('accommodations')
        .update(payload)
        .eq('id', editingItem.id)
        .select()
        .single()
        
      if (!error && updated) {
        setData(data.map(item => item.id === updated.id ? updated : item))
        handleCloseModal()
      } else {
        alert('저장에 실패했습니다.')
      }
    } else {
      // Create
      const { data: inserted, error } = await supabase
        .from('accommodations')
        .insert(payload)
        .select()
        .single()

      if (!error && inserted) {
        setData([inserted, ...data])
        handleCloseModal()
      } else {
        alert('저장에 실패했습니다.')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-2xl font-bold">거래처 (숙박업소) 관리</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={16} /> 업체 등록
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>업체명</TableHead>
            <TableHead>대표자</TableHead>
            <TableHead>연락처</TableHead>
            <TableHead style={{ width: '25%' }}>주소</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} style={{ textAlign: 'center', color: 'var(--surface-500)' }}>
                등록된 업체가 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.owner_name}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell style={{ fontSize: '0.85rem', color: 'var(--surface-600)' }}>{item.address || '-'}</TableCell>
                <TableCell>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem',
                    backgroundColor: item.is_active ? 'var(--success-light)' : 'var(--surface-200)',
                    color: item.is_active ? 'var(--success)' : 'var(--surface-500)'
                  }}>
                    {item.is_active ? '거래중' : '종료'}
                  </span>
                </TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
        </TableBody>
      </Table>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingItem ? '업체 정보 수정' : '신규 업체 등록'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="업체명" 
            name="name" 
            required 
            defaultValue={editingItem?.name} 
          />
          <Input 
            label="사업자등록번호" 
            name="business_number" 
            defaultValue={editingItem?.business_number} 
          />
          <Input 
            label="대표자명" 
            name="owner_name" 
            defaultValue={editingItem?.owner_name} 
          />
          <Input 
            label="연락처" 
            name="phone" 
            defaultValue={editingItem?.phone} 
          />
          <Input 
            label="주소" 
            name="address" 
            defaultValue={editingItem?.address} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="is_active" 
              name="is_active"
              defaultChecked={editingItem ? editingItem.is_active : true}
            />
            <label htmlFor="is_active" style={{ fontSize: '0.875rem' }}>거래 활성화 상태</label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={handleCloseModal}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
