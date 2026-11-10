import type { Language } from './preferences';

// Official MVA Coworking contact publicly listed as WhatsApp.
// Override in Vercel with VITE_MVA_WHATSAPP_NUMBER (Brazil: 55 + area code + number).
const publicBusinessNumber = '5579991546226';
const configuredNumber = String(import.meta.env.VITE_MVA_WHATSAPP_NUMBER || '').replace(/\D/g, '');
export const mvaWhatsAppNumber = /^55\d{10,11}$/.test(configuredNumber)
  ? configuredNumber
  : publicBusinessNumber;

export const mvaWhatsAppDisplay = (() => {
  const number = mvaWhatsAppNumber.slice(2);
  const area = number.slice(0, 2);
  const subscriber = number.slice(2);
  const last = subscriber.slice(-4);
  return `(${area}) ${subscriber.slice(0, -4)}-${last}`;
})();

const messages: Record<'general'|'fiscal', Record<Language,string>> = {
  general: {
    pt: 'Olá! Vim pelo site da MVA Coworking e gostaria de tirar algumas dúvidas sobre os serviços, planos e reservas. Podem me ajudar?',
    en: 'Hello! I came from the MVA Coworking website and have a few questions about your services, plans and room bookings. Could you help me?',
    es: '¡Hola! Vengo del sitio web de MVA Coworking y me gustaría resolver algunas dudas sobre los servicios, planes y reservas. ¿Podrían ayudarme?',
  },
  fiscal: {
    pt: 'Olá! Vim pelo site da MVA Coworking e gostaria de tirar dúvidas sobre os planos de endereço fiscal. Podem me ajudar?',
    en: 'Hello! I found MVA Coworking on your website and have a few questions about your registered address plans. Could you help me?',
    es: '¡Hola! Vengo del sitio web de MVA Coworking y me gustaría consultar sobre los planes de domicilio fiscal. ¿Podrían ayudarme?',
  }
};

export const mvaWhatsAppUrl = (language: Language = 'pt', topic: 'general'|'fiscal' = 'general') =>
  `https://wa.me/${mvaWhatsAppNumber}?text=${encodeURIComponent(messages[topic][language])}`;
