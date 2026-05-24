'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Plus, Edit2, Trash2 } from 'lucide-react'

type Item = {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ClientPage({ initialData }: { initialData: Item[] }) {
  const [data, setData] = useState<Item[]>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  
  const supabase = createClient()

  const handleOpenModal = (item?: Item) => {
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

  const handleDelete = async (item: Item) => {
    if (!window.confirm(`'${item.name}' 품목을 정말 삭제하시겠습니까?\n(과거 기록 보존을 위해 실제로는 비활성화 처리됩니다)`)) return

    const { error } = await supabase
      .from('items')
      .update({ is_active: false })
      .eq('id', item.id)

    if (!error) {
      setData(data.filter(d => d.id !== item.id))
      alert('삭제되었습니다.')
    } else {
      alert('삭제에 실패했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      name: formData.get('name') as string,
      is_active: formData.get('is_active') === 'on'
    }

    if (editingItem) {
      const { data: updated, error } = await supabase
        .from('items')
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
      const { data: inserted, error } = await supabase
        .from('items')
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
        <h1 className="text-2xl font-bold">세탁 품목 관리</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus size={16} /> 품목 등록
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>품목명</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} style={{ textAlign: 'center', color: 'var(--surface-500)' }}>
                등록된 품목이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            data.filter(item => item.is_active).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem',
                    backgroundColor: item.is_active ? 'var(--success-light)' : 'var(--danger-light)',
                    color: item.is_active ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {item.is_active ? '사용중' : '사용안함'}
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
        title={editingItem ? '품목 수정' : '신규 품목 등록'}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="품목명" 
            name="name" 
            required 
            defaultValue={editingItem?.name} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="is_active" 
              name="is_active"
              defaultChecked={editingItem ? editingItem.is_active : true}
            />
            <label htmlFor="is_active" style={{ fontSize: '0.875rem' }}>사용 여부</label>
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
