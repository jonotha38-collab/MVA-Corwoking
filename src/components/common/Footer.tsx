import { t } from '../../lib/preferences';
import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, Building2, PlusCircle } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';

export const Footer: React.FC = () => {
  const { setActiveTab } = useCoworking();

  return (
    <footer className="bg-navy-950 text-slate-400 text-sm border-t border-navy-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <img src="/logo.png" alt={t("MVA")} className="h-8 w-auto" />
              <span className="font-bold text-base tracking-tight text-slate-100">{t("Coworking Hub ")}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{t("Plataforma para empresas de coworking anunciarem seus espaços e clientes reservarem salas de reunião, atendimento e endereço fiscal com segurança. ")}</p>
            <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>{t("Rede Nacional de Coworkings Homologados ")}</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{t("Navegação ")}</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => setActiveTab('marketplace')} className="hover:text-white transition-colors">{t("Salas de Reunião & Atendimento ")}</button>
              </li>
              <li>
                <button onClick={() => setActiveTab('owner-dashboard')} className="hover:text-orange-400 text-orange-400/90 font-semibold transition-colors flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" />{t("Cadastre seu Coworking ")}</button>
              </li>
              <li>
                <button onClick={() => setActiveTab('fiscal')} className="hover:text-white transition-colors">{t("Panorama de Endereço Fiscal ")}</button>
              </li>
              <li>
                <button onClick={() => setActiveTab('correspondence')} className="hover:text-white transition-colors">{t("Central de Correspondência ")}</button>
              </li>
              <li>
                <button onClick={() => setActiveTab('client-dashboard')} className="hover:text-white transition-colors">{t("Minhas Reservas de Salas ")}</button>
              </li>
            </ul>
          </div>

          {/* Sede Oficial MVA Highlight */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-orange-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />{t("Sede Oficial MVA ")}</h4>
            <div className="p-3 bg-navy-900 rounded-xl border border-navy-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{t("Rua Dom José Thomaz, 565 ")}</strong><br />{t("Bairro São José ")}<br />{t("Aracaju - SE, CEP 49015-090 ")}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">{t("*O espaço físico próprio da MVA existe exclusivamente neste endereço sede. As demais salas e localidades são anunciadas por coworkings parceiros. ")}</p>
            </div>
          </div>

          {/* Central de Contato */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">{t("Atendimento ")}</h4>
            <p className="text-slate-400 text-xs">{t("Segunda a Sexta, das 08h00 às 20h00. Suporte aos gestores de coworking e clientes 24/7. ")}</p>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span>{t("(79) 3214-5500 • WhatsApp Sede ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-400" />
                <span className="min-w-0 break-all">{t("contato@mvacoworking.com.br ")}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()}{' '}{t("MVA Coworking Hub • Sede: Rua Dom José Thomaz, 565 - Aracaju/SE.")}</div>
          <div>{t("Espaços para trabalhar. Estrutura para crescer. ")}</div>
        </div>
      </div>
    </footer>
  );
};
