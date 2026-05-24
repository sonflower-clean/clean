'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function ClientPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      setError(`비밀번호 변경 실패: ${updateError.message}`)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setPassword('')
      setConfirmPassword('')
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: '100%', maxWidth: '400px' }}>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>현재 계정의 새 비밀번호를 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              label="새 비밀번호" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8자 이상 입력"
              required
            />
            <Input 
              label="새 비밀번호 확인" 
              type="password" 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 다시 입력"
              required
            />

            {error && (
              <div style={{ color: 'var(--danger-500)', fontSize: '0.875rem', fontWeight: 500 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ color: 'var(--success-500)', fontSize: '0.875rem', fontWeight: 500 }}>
                비밀번호가 성공적으로 변경되었습니다! 잠시 후 대시보드로 이동합니다.
              </div>
            )}

            <Button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
