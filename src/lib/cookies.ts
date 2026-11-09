export interface CookiePreferences {
  essential: boolean; // Sempre true (sessão, segurança, idioma, autenticação)
  analytics: boolean; // Métricas e desempenho
  marketing: boolean; // Comunicações e preferências de anúncios
  respondedAt: string; // Data da decisão ISO
  status: 'accepted' | 'rejected' | 'customized';
}

const COOKIE_STORAGE_KEY = 'mva:cookie-consent';

export function getCookieConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences: Omit<CookiePreferences, 'essential' | 'respondedAt'> & { status: CookiePreferences['status'] }): CookiePreferences {
  const finalPrefs: CookiePreferences = {
    essential: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    status: preferences.status,
    respondedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(finalPrefs));
    // Dispara evento customizado para outros componentes ou analytics reagirem imediatamente
    window.dispatchEvent(new CustomEvent('mva:cookie-consent-updated', { detail: finalPrefs }));
    
    // Se analytics for recusado, limpa trackers ou cookies não essenciais de terceiros
    if (!finalPrefs.analytics) {
      // Exemplo: se houver cookies de analítica salvos no documento
      document.cookie.split(';').forEach(c => {
        const name = c.split('=')[0].trim();
        if (name.startsWith('_ga') || name.startsWith('_gid')) {
          document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
      });
    }
  } catch {
    // Modo privado silencioso
  }

  return finalPrefs;
}

export function resetCookieConsent(): void {
  try {
    localStorage.removeItem(COOKIE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('mva:cookie-consent-updated', { detail: null }));
  } catch {
    // ignore
  }
}
