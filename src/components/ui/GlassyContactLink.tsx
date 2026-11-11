import type { PointerEvent, ReactNode } from 'react';

type GlassyContactLinkProps = {
  href: string;
  variant: 'whatsapp' | 'email';
  label: string;
  children: ReactNode;
  newTab?: boolean;
};

/**
 * Glass button adapted to MVA: a real link for external WhatsApp/mailto.
 * Pointer parallax uses React event handlers rather than global DOM listeners.
 */
export function GlassyContactLink({ href, variant, label, children, newTab = false }: GlassyContactLinkProps) {
  const onPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset.a11yMotion === 'true') return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * -0.075;
    const y = (event.clientY - bounds.top - bounds.height / 2) * -0.075;
    event.currentTarget.style.setProperty('--_x-motion', `${Math.max(-6, Math.min(6, x)).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--_y-motion', `${Math.max(-4, Math.min(4, y)).toFixed(2)}px`);
  };

  const clearMotion = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.removeProperty('--_x-motion');
    event.currentTarget.style.removeProperty('--_y-motion');
  };

  return (
    <a
      href={href}
      className={`mva-contact-glassy mva-contact-glassy--${variant}`}
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={clearMotion}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className="mva-contact-glassy__face">
        {children}
      </span>
    </a>
  );
}
