import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Atom, BookOpen, Network } from 'lucide-react'
import { cn } from '../lib/classNames'

export function HeroSignalTitle({ text }: { text: string }) {
  const words = text.split(' ')

  return (
    <h1 className="hero-signal-title font-display max-w-5xl text-5xl font-extrabold leading-tight text-white sm:text-7xl xl:text-8xl">
      <span className="sr-only">{text}</span>
      {words.map((word, wordIndex) => (
        <span
          key={`${word}-${wordIndex}`}
          className="hero-word hero-word-effect"
          data-text={word}
          style={{ '--word-delay': `${wordIndex * 90}ms` } as React.CSSProperties}
        >
          {word.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="hero-letter"
              style={{ '--letter-delay': `${wordIndex * 90 + index * 24}ms` } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
      ))}
    </h1>
  )
}

export function CircularSignalText({ text = 'DNS TCP ARP HTTP PACKET FLOW ' }: { text?: string }) {
  const letters = useMemo(() => text.split(''), [text])

  return (
    <div className="circular-signal" aria-hidden="true">
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          style={{ transform: `rotate(${(360 / letters.length) * index}deg)` }}
        >
          {letter}
        </span>
      ))}
      <div className="circular-signal-core" />
    </div>
  )
}

export function FadeContent({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div className={cn('fade-content', className)} style={{ '--fade-delay': `${delay}ms` } as React.CSSProperties}>
      {children}
    </div>
  )
}

export function GlowBorder({ children, active = false, className }: { children: React.ReactNode; active?: boolean; className?: string }) {
  return (
    <div className={cn('glow-border-shell', active && 'glow-border-active', className)}>
      <span className="border-glow-beam border-glow-beam-top" />
      <span className="border-glow-beam border-glow-beam-right" />
      <span className="border-glow-beam border-glow-beam-bottom" />
      <span className="border-glow-beam border-glow-beam-left" />
      {children}
    </div>
  )
}

export function ClickSpark({ children }: { children: React.ReactNode }) {
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([])
  const idRef = useRef(0)

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const id = idRef.current
    idRef.current += 1
    setSparks((items) => [...items.slice(-8), { id, x: event.clientX, y: event.clientY }])
    window.setTimeout(() => {
      setSparks((items) => items.filter((item) => item.id !== id))
    }, 760)
  }

  return (
    <div className="click-spark-root" onClick={handleClick}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[70]">
        {sparks.map((spark) => (
          <span key={spark.id} className="click-spark" style={{ left: spark.x, top: spark.y } as React.CSSProperties}>
            {Array.from({ length: 8 }).map((_, index) => (
              <i key={index} style={{ '--spark-rotate': `${index * 45}deg` } as React.CSSProperties} />
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}

const navItems = [
  { to: '/protocol-lab', label: 'Protocol Lab', icon: Atom },
  { to: '/scenario', label: 'Scenario', icon: Network },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
]

export function GooeyNav({ className }: { className?: string }) {
  const location = useLocation()

  return (
    <nav className={cn('gooey-nav', className)} aria-label="Primary modules">
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <filter id="gooey-nav-filter">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>
      <div className="gooey-nav-track">
        {navItems.map((item) => {
          const active = location.pathname === item.to
          const Icon = item.icon
          return (
            <Link key={item.to} to={item.to} className={cn('gooey-nav-item', active && 'gooey-nav-active')}>
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
