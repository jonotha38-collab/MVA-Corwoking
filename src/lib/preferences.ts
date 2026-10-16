import { useSyncExternalStore } from 'react';
import catalog from './translations.json';
export type Language = 'pt' | 'en' | 'es';
export type Theme = 'light' | 'dark';
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
let language: Language = (['pt','en','es'].includes(read('mva-language') || '') ? read('mva-language') : 'pt') as Language;
let theme: Theme = (read('mva-theme') === 'light' || read('mva-theme') === 'dark' ? read('mva-theme') : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as Theme;
const listeners = new Set<() => void>();
function apply() { document.documentElement.dataset.theme = theme; document.documentElement.lang = language === 'pt' ? 'pt-BR' : language; document.documentElement.style.colorScheme = theme; }
apply();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function usePreferences() { useSyncExternalStore(subscribe, () => `${language}:${theme}`); return { language, theme, setLanguage, setTheme }; }
export function setLanguage(value: Language) { language = value; save(); }
export function setTheme(value: Theme) { theme = value; save(); }
function save() { try { localStorage.setItem('mva-language', language); localStorage.setItem('mva-theme', theme); } catch { /* Private browsing still supports session preferences. */ } apply(); listeners.forEach(fn => fn()); }
window.addEventListener('storage', e => { if (e.key === 'mva-language' && ['pt','en','es'].includes(e.newValue || '')) language = e.newValue as Language; if(e.key === 'mva-theme' && ['light','dark'].includes(e.newValue || '')) theme=e.newValue as Theme; apply(); listeners.forEach(fn=>fn()); });
/** Translate presentation strings only. Database values and user content remain untouched. */
export function t<T>(value: T): T {
 if (language === 'pt' || typeof value !== 'string') return value;
 const key = value.replace(/\s+/g, ' ').trim();
 const entry = (catalog as Record<string, string[]>)[key];
 if (entry) return value.replace(value.trim(), entry[language === 'en' ? 0 : 1]) as T;
 return value;
}
