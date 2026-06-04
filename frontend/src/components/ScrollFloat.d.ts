import type { ComponentType, ReactNode, RefObject } from 'react'

export interface ScrollFloatProps {
  children?: ReactNode
  scrollContainerRef?: RefObject<HTMLElement | null>
  containerClassName?: string
  textClassName?: string
  animationDuration?: number
  ease?: string
  scrollStart?: string
  scrollEnd?: string
  stagger?: number
}

declare const ScrollFloat: ComponentType<ScrollFloatProps>
export default ScrollFloat
