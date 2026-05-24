import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const classNames = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ');
    
    return (
      <button ref={ref} className={classNames} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
