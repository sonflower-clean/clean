import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from './Sidebar'
import styles from './layout.module.css'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to get role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('--- User ID:', user.id)
  console.log('--- Profile Fetch:', profile, error)

  if (profile && profile.is_active === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
        <h2 className="text-2xl font-bold">계정이 비활성화되었습니다.</h2>
        <p>시스템 관리자에게 문의해주세요.</p>
        <form action="/api/auth/logout" method="post">
          <button 
            type="submit" 
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: 'var(--primary-600)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.375rem', 
              cursor: 'pointer' 
            }}
          >
            돌아가기 (로그아웃)
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      {/* Client Component Sidebar handles both mobile responsive header, overlay and panel */}
      <Sidebar profile={profile} email={user.email || null} />

      {/* Main Content Area */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
