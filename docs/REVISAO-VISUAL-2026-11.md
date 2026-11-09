# Revisão pública MVA — 04/11/2026

Escopo autorizado: melhorar o site existente na Vercel, preservando a marca.
Base: `mva-salas-refinamento-2026`, commit bc3548f5f985394b35cee668b3afaa8cd3c56244.
Projeto: coworking-mva-du8c (prj_skMtwHUMI4svOYN8bBshyhteOGhV).

| Problema anterior | Alteração | Resultado pretendido |
| --- | --- | --- |
| Foto escurecida atrás do texto | Imagem separada do título, com legenda | Mostrar o ambiente e manter texto legível |
| Serviços com numeração sem sequência real | Três escolhas paralelas com ações específicas | Facilitar o acesso ao serviço desejado |
| Homepage sem amostra do catálogo | Até três anúncios públicos reais com fotos e valores | Acesso direto aos detalhes dos espaços |
| Localização apenas em texto | Endereço em destaque e link de mapa | Facilitar o planejamento de uma visita |
| Ações da homepage sem destino nativo | Links com URLs reais e navegação SPA | Permitir abrir serviços e salas em outra aba |
| Entrar oculto em celulares pequenos | Login visível, cadastro preservado a partir de sm | Acesso direto à conta no celular |
| Filtros marcados como tabs sem teclado de tabs | Grupo de botões aria-pressed | Informar a seleção com semântica correta |
| Cookies sobre a navegação inferior | Painel acima da barra e com altura limitada | Manter navegação e preferências alcançáveis |

## Validação

- `npm run build`: TypeScript e build Vite passam.
- `npm run lint`: sem erros; dois avisos preexistentes fora do escopo em FiscalServiceCenter e OwnerBillingPanel.
- `npm run test:payments`: dois arquivos de testes passam, cobrindo domínio e invariantes SQL de pagamento.
- `npm exec --package=@google/design.md -- designmd lint DESIGN.md`: zero erros e zero avisos.
- `git diff --check`: sem problemas de whitespace.
- Revisão estática de links, predicado de visibilidade pública, idiomas PT/EN/ES,
  temas claro/escuro, aspect ratios de imagens, foco e movimento reduzido.

## Limites

A API de navegador `cua_repl.js` requerida pelo ambiente Sites não está disponível.
Conforme o fluxo do plugin, não foi iniciado um navegador alternativo ou servidor
local de preview. A responsividade foi implementada em CSS, mas não houve teste
visual interativo de viewport, zoom ou teclado. Verificação HTTP da Vercel não
substitui esse teste. Login real, gravações, reservas e checkout não foram
exercitados nesta revisão visual. Nenhuma política, função ou dado do Supabase
foi alterado. O aviso de bundle principal acima de 500 kB permanece.

Os plugins de design orientaram hierarquia, conteúdo e acessibilidade; Sites
foi usado na descoberta e no fluxo de implementação. A publicação permanece na
Vercel para atualizar o endereço já utilizado pelo negócio, sem criar outro Site.
