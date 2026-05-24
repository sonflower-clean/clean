'use client'

import { useState } from 'react'
import { login } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import styles from './login.module.css'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle className="text-2xl text-center">153-클린</CardTitle>
          <CardDescription className="text-center">세탁 관리 시스템 로그인</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input 
              label="아이디" 
              name="username" 
              type="text" 
              required 
              placeholder="예: admin"
            />
            <Input 
              label="비밀번호" 
              name="password" 
              type="password" 
              required 
            />
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
            
            <Button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
