import type { ComponentType, ReactNode } from 'react'

export interface FuzzyTextProps {
  children?: ReactNode
  fontSize?: string | number
  fontWeight?: string | number
  fontFamily?: string
  color?: string
  enableHover?: boolean
  baseIntensity?: number
  hoverIntensity?: number
  fuzzRange?: number
  fps?: number
  direction?: 'horizontal' | 'vertical' | 'both'
  transitionDuration?: number
  clickEffect?: boolean
  glitchMode?: boolean
  glitchInterval?: number
  glitchDuration?: number
  gradient?: string[] | null
  letterSpacing?: number
  className?: string
}

declare const FuzzyText: ComponentType<FuzzyTextProps>
export default FuzzyText
