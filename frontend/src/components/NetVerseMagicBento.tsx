import { useRef } from 'react'
import { cn } from '../lib/classNames'

interface NetVerseMagicBentoProps {
  children: React.ReactNode
  className?: string
  accent?: string
  active?: boolean
  as?: 'a' | 'aside' | 'div' | 'article' | 'section' | 'button'
  disabled?: boolean
  href?: string
  onClick?: () => void
  type?: 'button'
}

export function NetVerseMagicBento({
  children,
  className,
  accent = '#22d3ee',
  active = false,
  as = 'div',
  disabled,
  href,
  onClick,
  type,
}: NetVerseMagicBentoProps) {
  const ref = useRef<HTMLElement>(null)
  const Component = as

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const rotateX = ((y / rect.height) - 0.5) * -5
    const rotateY = ((x / rect.width) - 0.5) * 5

    element.style.setProperty('--magic-x', `${x}px`)
    element.style.setProperty('--magic-y', `${y}px`)
    element.style.setProperty('--magic-rotate-x', `${rotateX}deg`)
    element.style.setProperty('--magic-rotate-y', `${rotateY}deg`)
  }

  function handlePointerLeave() {
    const element = ref.current
    if (!element) return
    element.style.setProperty('--magic-rotate-x', '0deg')
    element.style.setProperty('--magic-rotate-y', '0deg')
  }

  return (
    <Component
      ref={ref as never}
      disabled={disabled as never}
      href={href as never}
      type={type as never}
      onClick={onClick as never}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn('magic-bento', active && 'magic-bento-active', className)}
      style={{ '--magic-accent': accent } as React.CSSProperties}
    >
      <span className="magic-bento-glow" aria-hidden="true" />
      <span className="magic-bento-border" aria-hidden="true" />
      <span className="magic-bento-sheen" aria-hidden="true" />
      <div className="magic-bento-content">{children}</div>
    </Component>
  )
}
