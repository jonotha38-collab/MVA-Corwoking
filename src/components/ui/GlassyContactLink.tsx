import type { ReactNode } from 'react';

type GlassyContactLinkProps = {
  href: string;
  variant: 'whatsapp' | 'email';
  label: string;
  children: ReactNode;
  newTab?: boolean;
};

export function GlassyContactLink({ href, variant, label, children, newTab = false }: GlassyContactLinkProps) {
  return (
    <a
      href={href}
      className={`mva-contact-glassy mva-contact-glassy--${variant}`}
      aria-label={label}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className="mva-contact-glassy__face">
        {children}
      </span>
    </a>
  );
}
