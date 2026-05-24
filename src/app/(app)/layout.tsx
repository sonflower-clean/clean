import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { 
  LayoutDashboard, 
  FileEdit, 
  Building2, 
  Package, 
  DollarSign, 
  CreditCard,
  Users,
  LogOut,
  Key
} from 'lucide-react'
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

  const role = profile?.role || 'accommodation_manager'
  
  const navItems = [
    { label: '대시보드', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'laundry_manager', 'accommodation_manager'] },
    { label: '일별 업무 입력', href: '/daily-entry', icon: FileEdit, roles: ['admin', 'laundry_manager'] },
    { label: '거래처 관리', href: '/manage/accommodations', icon: Building2, roles: ['admin'] },
    { label: '세탁 품목 관리', href: '/manage/items', icon: Package, roles: ['admin'] },
    { label: '단가 관리', href: '/manage/prices', icon: DollarSign, roles: ['admin'] },
    { label: '소모품 및 비용 관리', href: '/manage/expenses', icon: CreditCard, roles: ['admin'] },
    { label: '계정 관리', href: '/manage/users', icon: Users, roles: ['admin'] },
  ]

  const filteredNavItems = navItems.filter(item => item.roles.includes(role))

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span>153-클린</span>
        </div>
        
        <nav className={styles.nav}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={styles.navItem}
              >
                <Icon className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{profile?.full_name || user.email}</span>
            <span className={styles.userRole}>
              {role === 'admin' ? '관리자' : role === 'laundry_manager' ? '세탁담당자' : '숙박업소담당자'}
            </span>
            <Link 
              href="/change-password" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                fontSize: '0.75rem', 
                color: 'var(--primary-400)', 
                marginTop: '0.5rem',
                textDecoration: 'none'
              }}
            >
              <Key size={12} />
              <span>비밀번호 변경</span>
            </Link>
          </div>
          
          <form action="/api/auth/logout" method="post">
            <button className={styles.logoutBtn} type="submit">
              <LogOut className={styles.navIcon} />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
