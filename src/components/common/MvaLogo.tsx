import { useId, type CSSProperties } from 'react'
import './mva-logo.css'

export const MVA_INTRO_MS = 860

type MvaLogoProps = {
  animated?: boolean
  className?: string
  label?: string
  tone?: 'inverse' | 'surface'
}

export function MvaLogo({ animated = false, className = '', label, tone = 'inverse' }: MvaLogoProps) {
  const clipId = useId()
  const style = animated ? { '--mva-intro-duration': `${MVA_INTRO_MS}ms` } as CSSProperties : undefined

  return (
    <svg
      className={`mva-logo mva-logo--${tone}${animated ? ' mva-logo--animated' : ''} ${className}`}
      viewBox="0 0 285 90"
      width="285"
      height="90"
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {animated && (
        <defs>
          <clipPath id={clipId}>
            <rect className="mva-logo__m" x="90" width="195" height="90" />
          </clipPath>
        </defs>
      )}
      <g clipPath={animated ? `url(#${clipId})` : undefined}>
        <path className="mva-logo__v" d="M103 13h13l23 49 23-49h13l-30.5 64h-11z" />
        <path className="mva-logo__slash mva-logo__slash--first" d="M185 13h11l-30 64h-11z" />
        <path className="mva-logo__slash mva-logo__slash--second" d="M208 13h11l-30 64h-11z" />
        <path className="mva-logo__a" fillRule="evenodd" d="M232 13h12l31 64h-13.5L254 61h-32l-7.5 16H201zm-5 37h22l-11-24z" />
      </g>
      <path className="mva-logo__m" d="M10 77V13h12l28 36 28-36h12v64H78V34L53.5 66h-7L22 34v43z" />
    </svg>
  )
}
