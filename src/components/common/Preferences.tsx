import { Sun, Moon, Globe2 } from 'lucide-react';
import { t, usePreferences, type Language } from '../../lib/preferences';
export function Preferences() {
 const {language, theme, setLanguage, setTheme} = usePreferences();
 return <div className="preferences" aria-label={t('Preferências')}>
  <Globe2 size={15} aria-hidden="true" />
  <select aria-label={t('Idioma')} value={language} onChange={e=>setLanguage(e.target.value as Language)}>
   <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option>
  </select>
  <span className="preference-divider" />
  <button type="button" onClick={()=>setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t(theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro')} title={t(theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro')}>
   {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{t(theme === 'dark' ? 'Escuro' : 'Claro')}</span>
  </button>
 </div>;
}
