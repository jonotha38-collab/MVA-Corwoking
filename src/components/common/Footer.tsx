/*@ts-check*/
import { t, usePreferences } from '../../lib/preferences';
import { mvaWhatsAppDisplay, mvaWhatsAppUrl } from '../../lib/whatsapp';
import React from 'react';
import { ShieldCheck, Mail, MessageCircle, MapPin, Building2, PlusCircle } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';

export const Footer: React.FC = () => {
  const { setActiveTab } = useCoworking();
  const { language } = usePreferences();
  const whatsappUrl = mvaWhatsAppUrl(language);

  return (
    <footer
      role="contentinfo"
      className="mva-footer bg-navy-950 text-slate-400 text-sm border-t border-navy-800 shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid min-w-0 grid-cols-1 gap-8 mb-12 sm:grid-cols-2 xl:grid-cols-4">
          {/* Brand */}
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-white">
              <img
                src="/logo.png"
                alt={t("MVA")}
                className="h-8 w-auto sm:h-10"
              />
              <span className="font-bold text-base tracking-tight text-slate-100">
                {t("Coworking Hub ")}
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t("Plataforma para espaços de coworking, reservas e correspondências.")}
            </p>
            <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>{t("Sede MVA em Aracaju • Marketplace de espaços ")}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{t("Navegação ")}</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="hover:text-white transition-colors"
                >
                  {t("Salas de Reunião & Atendimento ")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('owner-dashboard')}
                  className="hover:text-orange-400 text-orange-400/90 font-semibold transition-colors flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" />
                  {t("Cadastre seu Coworking ")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('fiscal')}
                  className="hover:text-white transition-colors"
                >
                  {t("Panorama de Endereço Fiscal ")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('correspondence')}
                  className="hover:text-white transition-colors"
                >
                  {t("Central de Correspondência ")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('client-dashboard')}
                  className="hover:text-white transition-colors"
                >
                  {t("Minhas Reservas de Salas ")}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('legal')}
                  className="hover:text-white transition-colors"
                >
                  {t("Políticas de Privacidade & LGPD ")}
                </button>
              </li>
            </ul>
          </div>

          {/* Sede Oficial MVA Highlight */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-orange-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {t("Sede Oficial MVA ")}
            </h4>
            <div className="p-3 bg-navy-900 rounded-xl border border-navy-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{t("Rua Dom José Thomaz, 565 ")}</strong><br />
                  {t("Bairro São José ")}<br />
                  {t("Aracaju - SE, CEP 49015-090 ")}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                {t("*O espaço físico próprio da MVA existe exclusivamente neste endereço sede. As demais salas e localidades são anunciadas por coworkings parceiros. ")}
              </p>
            </div>
          </div>

          {/* Central de Contato */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{t("Atendimento ")}</h4>
            <p className="text-slate-400 text-xs leading-relaxed">{t("Atendimento comercial: consulte os canais abaixo para confirmar horários e disponibilidade antes de visitar.")}</p>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 shrink-0 text-orange-400" aria-hidden="true" />
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="min-h-11 underline-offset-2 hover:text-white hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
                  aria-label={`${t('Falar no WhatsApp com a MVA')} — ${mvaWhatsAppDisplay}`}>
                  {mvaWhatsAppDisplay} · WhatsApp
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-400" />
                <a href="mailto:contato@mvacoworking.com.br?subject=Atendimento%20MVA%20Coworking" className="min-w-0 break-all underline-offset-2 hover:text-white hover:underline">contato@mvacoworking.com.br</a>
              </div>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#408664] bg-[#1c6747] px-4 py-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#15573c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {t('Tirar dúvidas pelo WhatsApp')}
            </a>

          </div>
        </div>

        {/* Rodapé inferior */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-navy-900 pt-8 text-[11px] text-slate-500 md:flex-row md:items-center">
          <div>
            <div className="pt-2 text-sm">{`© ${new Date().getFullYear()} ${t("MVA Coworking Hub • Sede: Rua Dom José Thomaz, 565 - Aracaju/SE.")}`}</div>
            <div>{t("Espaços para trabalhar. Estrutura para crescer. ")}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => setActiveTab('legal')}
              className="hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
            >
              {t("Políticas e LGPD")}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                localStorage.removeItem('mva:cookie-consent');
                window.location.reload();
              }}
              className="hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
            >
              {t("Preferências de Cookies")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
