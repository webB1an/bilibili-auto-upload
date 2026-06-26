import type { ReactNode } from 'react'

const variants = {
  primary:
    'bg-accent text-canvas hover:bg-accentDim disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50'
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
