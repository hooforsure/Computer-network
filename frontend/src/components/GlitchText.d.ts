import type { ComponentType, ReactNode } from 'react'

export interface GlitchTextProps {
  children?: ReactNode
  speed?: number
  enableShadows?: boolean
  enableOnHover?: boolean
  className?: string
}

declare const GlitchText: ComponentType<GlitchTextProps>
export default GlitchText
