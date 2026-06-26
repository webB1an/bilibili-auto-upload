import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <section className={`glass-panel rounded-2xl p-5 shadow-card ${className}`}>
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h2 className="font-display text-lg font-semibold text-white">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  )
}
