import { useEffect, useRef, useState } from 'react';
import { Accessibility, X, RotateCcw, Plus, Minus } from 'lucide-react';
import { usePreferences } from '../../lib/preferences';

type Settings = { scale: number; contrast: boolean; underline: boolean; reduceMotion: boolean };
const defaults: Settings = { scale: 100, contrast: false, underline: false, reduceMotion: false };
const key = 'mva-accessibility-v1';
function load(): Settings {
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}') as Partial<Settings>;
    return {
      scale: [100, 110, 120, 130, 140, 150].includes(data.scale || 100) ? (data.scale || 100) : 100,
      contrast: data.contrast === true,
      underline: data.underline === true,
      reduceMotion: data.reduceMotion === true
    };
  } catch { return defaults; }
}
export function AccessibilityPanel() {
  const { language } = usePreferences();
  const [settings, setSettings] = useState<Settings>(load);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const labels = {
    pt: ['Acessibilidade', 'Configurações de acessibilidade', 'Tamanho do texto', 'Diminuir texto', 'Aumentar texto', 'Alto contraste', 'Sublinhar links', 'Reduzir animações', 'Restaurar padrões', 'Fechar configurações', 'Ativado', 'Desativado'],
    en: ['Accessibility', 'Accessibility settings', 'Text size', 'Decrease text', 'Increase text', 'High contrast', 'Underline links', 'Reduce animations', 'Reset settings', 'Close settings', 'On', 'Off'],
    es: ['Accesibilidad', 'Opciones de accesibilidad', 'Tamaño del texto', 'Reducir texto', 'Aumentar texto', 'Alto contraste', 'Subrayar enlaces', 'Reducir animaciones', 'Restablecer', 'Cerrar opciones', 'Activado', 'Desactivado']
  }[language];
  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = settings.scale + '%';
    html.dataset.a11yContrast = String(settings.contrast);
    html.dataset.a11yLinks = String(settings.underline);
    html.dataset.a11yMotion = String(settings.reduceMotion);
    try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* browsing without storage */ }
  }, [settings]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const toggle = (name: 'contrast' | 'underline' | 'reduceMotion') => setSettings(s => ({ ...s, [name]: !s[name] }));
  return (
    <div className="mva-accessibility no-print">
      {open && (
        <div ref={panel} id="mva-accessibility-panel" className="mva-accessibility-panel" role="region" aria-label={labels[1]}>
          <div className="mva-accessibility-heading">
            <strong>{labels[1]}</strong>
            <button type="button" aria-label={labels[9]} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} aria-hidden /></button>
          </div>
          <div className="mva-accessibility-text-size">
            <span>{labels[2]}: <strong>{settings.scale}%</strong></span>
            <div>
              <button type="button" aria-label={labels[3]} disabled={settings.scale <= 100} onClick={() => setSettings(s => ({ ...s, scale: Math.max(100, s.scale - 10) }))}><Minus size={18} aria-hidden /></button>
              <button type="button" aria-label={labels[4]} disabled={settings.scale >= 150} onClick={() => setSettings(s => ({ ...s, scale: Math.min(150, s.scale + 10) }))}><Plus size={18} aria-hidden /></button>
            </div>
          </div>
          {([['contrast',5], ['underline',6], ['reduceMotion',7]] as const).map(([name,index]) => (
            <button key={name} className="mva-accessibility-option" type="button" aria-pressed={settings[name]} onClick={() => toggle(name)}>
              <span>{labels[index]}</span><span className="mva-accessibility-state">{settings[name] ? labels[10] : labels[11]}</span>
            </button>
          ))}
          <button type="button" className="mva-accessibility-reset" onClick={() => setSettings(defaults)}><RotateCcw size={16} aria-hidden />{labels[8]}</button>
        </div>
      )}
      <button ref={trigger} type="button" className="mva-accessibility-trigger" aria-label={labels[1]} aria-controls="mva-accessibility-panel" aria-expanded={open} onClick={() => setOpen(x => !x)}>
        <Accessibility size={23} aria-hidden /><span>{labels[0]}</span>
      </button>
    </div>
  );
}
