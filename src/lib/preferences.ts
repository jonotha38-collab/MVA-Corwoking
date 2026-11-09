import { useSyncExternalStore } from 'react'
import catalog from './translations.json'

export type Language = 'pt' | 'en' | 'es'
export type Theme = 'light' | 'dark'

const LANGUAGES: Language[] = ['pt', 'en', 'es']
const THEMES: Theme[] = ['light', 'dark']

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const storedLanguage = read('mva-language')
const storedTheme = read('mva-theme')

let language: Language = LANGUAGES.includes(storedLanguage as Language)
  ? (storedLanguage as Language)
  : 'pt'

let theme: Theme = THEMES.includes(storedTheme as Theme)
  ? (storedTheme as Theme)
  : matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

const listeners = new Set<() => void>()

function apply() {
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.lang = language === 'pt' ? 'pt-BR' : language
  document.documentElement.style.colorScheme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0b1320' : '#f6f7f9')
}

function notify() {
  listeners.forEach(listener => listener())
}

function save() {
  try {
    localStorage.setItem('mva-language', language)
    localStorage.setItem('mva-theme', theme)
  } catch {
    // Private browsing still supports in-memory preferences.
  }
  apply()
  notify()
}

apply()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function usePreferences() {
  useSyncExternalStore(subscribe, () => `${language}:${theme}`)
  return { language, theme, setLanguage, setTheme }
}

export function setLanguage(value: Language) {
  language = value
  save()
}

export function setTheme(value: Theme) {
  theme = value
  save()
}

window.addEventListener('storage', event => {
  if (event.key === 'mva-language' && LANGUAGES.includes(event.newValue as Language)) {
    language = event.newValue as Language
  }
  if (event.key === 'mva-theme' && THEMES.includes(event.newValue as Theme)) {
    theme = event.newValue as Theme
  }
  apply()
  notify()
})

/** Translate presentation strings only. Database values and user content remain untouched. */
export function t<T>(value: T): T {
  if (language === 'pt' || typeof value !== 'string') return value

  const key = value.replace(/\s+/g, ' ').trim()
  const entry = (catalog as Record<string, string[]>)[key]
  if (!entry) return value

  const translated = entry[language === 'en' ? 0 : 1]
  return value.replace(value.trim(), translated) as T
}
