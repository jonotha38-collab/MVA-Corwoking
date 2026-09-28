import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, Building2, PlusCircle } from 'lucide-react';
import { useCoworking } from '../../context/CoworkingContext';

export const Footer: React.FC = () => {
  const { setActiveTab } = useCoworking();

  return (
    <footer className="bg-navy-950 text-slate-400 text-xs border-t border-navy-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-extrabold text-sm">
                MVA
              </div>
              <span className="font-extrabold text-base tracking-tight">MVA Coworking Hub</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Plataforma para empresas de coworking anunciarem seus espaços e clientes reservarem salas de reunião, atendimento e endereço fiscal com segurança.
            </p>
            <div className="flex items-center gap-1.5 text-orange-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Rede Nacional de Coworkings Homologados</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-1.5">
              <li>
                <button onClick={() => setActiveTab('marketplace')} className="hover:text-white transition-colors">
                  Salas de Reunião & Atendimento
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('owner-dashboard')} className="hover:text-orange-400 text-orange-400/90 font-semibold transition-colors flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Cadastre seu Coworking
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('fiscal')} className="hover:text-white transition-colors">
                  Panorama de Endereço Fiscal
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('correspondence')} className="hover:text-white transition-colors">
                  Central de Correspondência
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('client-dashboard')} className="hover:text-white transition-colors">
                  Minhas Reservas de Salas
                </button>
              </li>
            </ul>
          </div>

          {/* Sede Oficial MVA Highlight */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-orange-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              Sede Oficial MVA
            </h4>
            <div className="p-3 bg-navy-900 rounded-xl border border-navy-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Rua Dom José Thomaz, 565</strong><br />
                  Bairro São José<br />
                  Aracaju - SE, CEP 49015-090
                </span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                *O espaço físico próprio da MVA existe exclusivamente neste endereço sede. As demais salas e localidades são anunciadas por coworkings parceiros.
              </p>
            </div>
          </div>

          {/* Central de Contato */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Atendimento</h4>
            <p className="text-slate-400 text-xs">
              Segunda a Sexta, das 08h00 às 20h00. Suporte aos gestores de coworking e clientes 24/7.
            </p>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span>(79) 3214-5500 • WhatsApp Sede</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-400" />
                <span>contato@mvacoworking.com.br</span>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-8 border-t border-navy-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} MVA Coworking Hub • Sede: Rua Dom José Thomaz, 565 - Aracaju/SE.
          </div>
          <div>
            Desenvolvido com design minimalista corporativo (Azul Escuro & Laranja MVA)
          </div>
        </div>
      </div>
    </footer>
  );
};
