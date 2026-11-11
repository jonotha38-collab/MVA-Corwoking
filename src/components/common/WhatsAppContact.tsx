import { MessageCircle } from 'lucide-react';
import { usePreferences } from '../../lib/preferences';
import { getMvaWhatsAppUrl } from '../../lib/whatsapp';

/** Public, direct support channel. Does not initiate a phone call. */
export function WhatsAppContact() {
  const { language } = usePreferences();
  const label = {
    pt: 'Conversar com a equipe MVA pelo WhatsApp',
    en: 'Chat with the MVA team on WhatsApp',
    es: 'Conversar con el equipo MVA por WhatsApp'
  }[language];

  return (
    <a
      className="mva-whatsapp-contact no-print"
      href={getMvaWhatsAppUrl(language)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <MessageCircle size={21} strokeWidth={2} aria-hidden="true" />
      <span>WhatsApp</span>
      <span className="sr-only">{label}</span>
    </a>
  );
}
