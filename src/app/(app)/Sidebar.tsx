'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileEdit, 
  Building2, 
  Package, 
  DollarSign, 
  CreditCard,
  Users,
  LogOut,
  Key,
  Menu,
  X
} from 'lucide-react'
import styles from './layout.module.css'

interface SidebarProps {
  profile: {
    full_name: string | null;
    role: string;
  } | null;
  email: string | null;
}

export default function Sidebar({ profile, email }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

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

  const handleToggle = () => setIsOpen(!isOpen)
  const handleClose = () => setIsOpen(false)

  return (
    <>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={handleToggle} aria-label="메뉴 열기">
          <Menu size={24} />
        </button>
        <span className={styles.mobileTitle}>153-클린</span>
        <div style={{ width: '40px' }}></div> {/* Spacer for symmetry */}
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div className={styles.backdrop} onClick={handleClose} />
      )}

      {/* Sidebar Panel */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span>153-클린</span>
          {/* Close button only visible on mobile inside sidebar */}
          <button 
            className={styles.menuBtn} 
            onClick={handleClose} 
            style={{ marginLeft: 'auto', display: 'var(--mobile-close-display, none)' }}
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className={styles.nav}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={handleClose} // Close sidebar on navigation (mobile)
              >
                <Icon className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{profile?.full_name || email}</span>
            <span className={styles.userRole}>
              {role === 'admin' ? '관리자' : role === 'laundry_manager' ? '세탁담당자' : '숙박업소담당자'}
            </span>
            <Link 
              href="/change-password" 
              onClick={handleClose}
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
    </>
  )
}
