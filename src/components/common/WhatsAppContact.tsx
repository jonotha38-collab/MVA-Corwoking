import { Mail, MessageCircle } from 'lucide-react';
import { usePreferences } from '../../lib/preferences';
import { getMvaWhatsAppUrl } from '../../lib/whatsapp';

/** Two direct contact shortcuts, available without an account or phone call. */
export function WhatsAppContact() {
  const { language } = usePreferences();
  const labels = {
    pt: {
      whatsapp: 'Conversar com a equipe MVA pelo WhatsApp',
      email: 'Enviar um e-mail para a equipe MVA',
      subject: 'Contato pelo site MVA Coworking',
      body: 'Olá, equipe MVA! Gostaria de tirar algumas dúvidas sobre os serviços.'
    },
    en: {
      whatsapp: 'Chat with the MVA team on WhatsApp',
      email: 'Email the MVA team',
      subject: 'Contact via MVA Coworking website',
      body: 'Hello MVA team! I would like to ask about your services.'
    },
    es: {
      whatsapp: 'Conversar con el equipo MVA por WhatsApp',
      email: 'Enviar un correo al equipo MVA',
      subject: 'Contacto desde la web MVA Coworking',
      body: '¡Hola, equipo MVA! Quisiera resolver algunas dudas sobre sus servicios.'
    }
  }[language];
  const emailUrl = `mailto:contato@mvacoworking.com.br?subject=${encodeURIComponent(labels.subject)}&body=${encodeURIComponent(labels.body)}`;

  return (
    <nav className="mva-contact-shortcuts no-print" aria-label={language === 'pt' ? 'Contato com a MVA' : language === 'es' ? 'Contacto con MVA' : 'Contact MVA'}>
      <a
        className="mva-contact-shortcut mva-whatsapp-contact"
        href={getMvaWhatsAppUrl(language)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={labels.whatsapp}
        title={labels.whatsapp}
      >
        <MessageCircle size={21} strokeWidth={2} aria-hidden="true" />
        <span>WhatsApp</span>
      </a>
      <a
        className="mva-contact-shortcut mva-email-contact"
        href={emailUrl}
        aria-label={labels.email}
        title={labels.email}
      >
        <Mail size={20} strokeWidth={2} aria-hidden="true" />
        <span>E-mail</span>
      </a>
    </nav>
  );
}
