'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createUser } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { Edit2, Trash2 } from 'lucide-react'

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'laundry_manager' | 'accommodation_manager';
  accommodation_id: string | null;
  accommodations?: { name: string } | null;
  is_active?: boolean;
}
type Accommodation = { id: string; name: string }

const ROLES = [
  { value: 'admin', label: '관리자' },
  { value: 'laundry_manager', label: '세탁담당자' },
  { value: 'accommodation_manager', label: '숙박업소담당자' }
]

export default function ClientPage({ 
  initialData, 
  accommodations 
}: { 
  initialData: Profile[], 
  accommodations: Accommodation[] 
}) {
  const [data, setData] = useState<Profile[]>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Profile | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  const handleOpenEditModal = (item: Profile) => {
    setEditingItem(item)
    setIsCreating(false)
    setIsModalOpen(true)
  }

  const handleOpenCreateModal = () => {
    setEditingItem(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setIsCreating(false)
  }

  const handleDelete = async (item: Profile) => {
    if (!window.confirm(`'${item.full_name}' 계정을 정말 삭제하시겠습니까?\n(보안 및 기록 보존을 위해 실제로는 비활성화 처리됩니다)`)) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', item.id)

    if (!error) {
      setData(data.filter(d => d.id !== item.id))
      alert('계정이 비활성화(삭제) 되었습니다.')
    } else {
      alert('삭제에 실패했습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    if (isCreating) {
      const result = await createUser(formData)
      if (result.error) {
        alert(result.error)
      } else {
        alert('계정이 성공적으로 생성되었습니다. 새로고침을 진행합니다.')
        window.location.reload() // Or we could append to data, but reload is robust for now
      }
      setLoading(false)
      return
    }

    if (!editingItem) return
    
    const role = formData.get('role') as string
    const accommodation_id = formData.get('accommodation_id') as string

    const payload = {
      full_name: formData.get('full_name') as string,
      role: role as 'admin' | 'laundry_manager' | 'accommodation_manager',
      accommodation_id: role === 'accommodation_manager' ? (accommodation_id || null) : null
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editingItem.id)
      .select('*, accommodations(name)')
      .single()
      
    if (!error && updated) {
      setData(data.map(item => item.id === updated.id ? updated : item))
      handleCloseModal()
    } else {
      alert('저장에 실패했습니다.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-2xl font-bold">계정 관리</h1>
        <Button onClick={handleOpenCreateModal}>새 계정 추가</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>아이디</TableHead>
            <TableHead>권한</TableHead>
            <TableHead>담당 업소</TableHead>
            <TableHead>관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} style={{ textAlign: 'center', color: 'var(--surface-500)' }}>
                등록된 계정이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            data.filter(item => item.is_active !== false).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.full_name}</TableCell>
                <TableCell>{item.email.includes('@clean') ? item.email.split('@')[0] : item.email}</TableCell>
                <TableCell>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--primary-100)',
                    color: 'var(--primary-700)'
                  }}>
                    {ROLES.find(r => r.value === item.role)?.label || item.role}
                  </span>
                </TableCell>
                <TableCell>{item.accommodations?.name || '-'}</TableCell>
                <TableCell>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(item)}>
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
        title={isCreating ? "새 계정 생성" : "계정 권한 수정"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isCreating && (
            <>
              <Input 
                label="아이디" 
                name="username" 
                required 
                placeholder="영문/숫자 조합 아이디"
              />
              <Input 
                label="비밀번호" 
                name="password"
                type="password"
                required 
                placeholder="8자리 이상 비밀번호"
              />
            </>
          )}

          <Input 
            label="이름" 
            name="full_name" 
            required 
            defaultValue={editingItem?.full_name} 
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>권한</label>
            <select 
              name="role"
              required
              defaultValue={editingItem?.role || 'accommodation_manager'}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>담당 숙박업소 (숙박업소담당자인 경우 필수)</label>
            <select 
              name="accommodation_id"
              defaultValue={editingItem?.accommodation_id || ''}
              style={{
                height: '2.5rem',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--input-border)'
              }}
            >
              <option value="">-- 선택 안함 --</option>
              {accommodations.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={handleCloseModal}>취소</Button>
            <Button type="submit" disabled={loading}>{loading ? '처리 중...' : '저장'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
