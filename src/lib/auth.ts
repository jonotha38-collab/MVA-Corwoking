/** Contas locais (demonstração). Em produção, troque por um backend de autenticação. */
import type { UserAccount } from '../types'

type Stored = UserAccount & { passwordHash?: string }
const KEY = 'mva:accounts'
const read = (): Stored[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (l: Stored[]) => localStorage.setItem(KEY, JSON.stringify(l))
const pub = ({ passwordHash: _p, ...u }: Stored): UserAccount => u
const mail = (e: string) => e.trim().toLowerCase()
const avatar = (s: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s)}&backgroundColor=0a192f`

async function sha256(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('')
}

export const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(mail).filter(Boolean)
export const isAdmin = (u: UserAccount | null) => !!u && ADMIN_EMAILS.includes(mail(u.email))

export async function registerAccount(p: { name: string; email: string; password: string; accountType: UserAccount['accountType']; brand?: string }) {
  const list = read()
  if (list.some(u => u.email === mail(p.email))) throw new Error('Este e-mail já tem conta. Entre para continuar.')
  const u: Stored = { id: crypto.randomUUID(), name: p.name.trim(), email: mail(p.email), avatar: avatar(p.name), accountType: p.accountType, coworkingBrandName: p.brand?.trim() || undefined, provider: 'email', passwordHash: await sha256(p.password) }
  save([...list, u])
  return pub(u)
}

export async function loginAccount(email: string, password: string) {
  const u = read().find(x => x.email === mail(email))
  if (!u || u.passwordHash !== (await sha256(password))) throw new Error('E-mail ou senha incorretos.')
  return pub(u)
}

export function googleAccount(credential: string, accountType: UserAccount['accountType']) {
  const raw = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const g = JSON.parse(decodeURIComponent(atob(raw).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))) as { name: string; email: string; picture?: string }
  const list = read()
  const found = list.find(x => x.email === mail(g.email))
  const u: Stored = found ? { ...found, name: g.name, avatar: g.picture || found.avatar } : { id: crypto.randomUUID(), name: g.name, email: mail(g.email), avatar: g.picture || avatar(g.name), accountType, provider: 'google' }
  save(found ? list.map(x => (x.id === u.id ? u : x)) : [...list, u])
  return pub(u)
}

/** Reduz e comprime a foto antes de salvar. */
export function fileToDataUrl(file: File, max = 1200, q = 0.8): Promise<string> {
  return new Promise((res, rej) => {
    if (!file.type.startsWith('image/')) return rej(new Error('Envie apenas imagens.'))
    const url = URL.createObjectURL(file), img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q))
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não foi possível ler a imagem.')) }
    img.src = url
  })
}
