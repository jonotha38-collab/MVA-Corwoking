import type { Language } from './preferences';

/**
 * Official MVA Coworking WhatsApp, already used by the team.
 * Vite env can override it in a future deployment. The fallback ensures
 * contact links do not silently disappear when the env variable is unset.
 */
const OFFICIAL_MVA_WHATSAPP = '5579991546226';

export function getMvaWhatsAppNumber(): string {
  const configured = String(import.meta.env.VITE_MVA_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const normalized = /^\d{10,11}$/.test(configured) ? `55${configured}` : configured;
  return /^55\d{10,11}$/.test(normalized) ? normalized : OFFICIAL_MVA_WHATSAPP;
}

export function getMvaWhatsAppDisplay(): string {
  const digits = getMvaWhatsAppNumber().slice(2);
  const area = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const split = subscriber.length === 9 ? 5 : 4;
  return `(${area}) ${subscriber.slice(0, split)}-${subscriber.slice(split)}`;
}

const prefilledMessages: Record<Language, string> = {
  pt: 'Olá! Vim pelo site da MVA Coworking e gostaria de tirar algumas dúvidas sobre os serviços, planos e reservas. Podem me ajudar?',
  en: 'Hello! I found MVA Coworking through your website and would like some information about your services, plans and room reservations. Can you help me?',
  es: '¡Hola! Llegué desde el sitio web de MVA Coworking y quisiera consultar sobre los servicios, planes y reservas de salas. ¿Me pueden ayudar?'
};

export function getMvaWhatsAppUrl(language: Language = 'pt'): string {
  return `https://wa.me/${getMvaWhatsAppNumber()}?text=${encodeURIComponent(prefilledMessages[language])}`;
}
