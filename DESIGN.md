---
version: alpha
name: MVA Coworking
colors:
  primary: '#F29243'
  orange-real: '#F29243'
  navy-yankee: '#242B48'
  on-primary: '#242B48'
  on-navy: '#F1F1F1'
  page: '#F1F1F1'
  surface: '#ffffff'
  ink: '#242B48'
  muted: '#666B7F'
  line: '#BDBFC8'
  line-strong: '#666B7F'
  yankee-tint-1: '#3A405A'
  yankee-tint-2: '#666B7F'
  yankee-tint-3: '#9195A3'
  yankee-tint-4: '#BDBFC8'
  black: '#000000'
typography:
  display:
    fontFamily: 'Manrope, Inter, system-ui, sans-serif'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
rounded:
  panel: '20px'
  control: '10px'
spacing:
  section-desktop: '88px'
  section-mobile: '60px'
---

## Overview

MVA serves professionals booking workspaces, companies seeking a fiscal address,
and coworking owners listing rooms. Its headquarters is Rua Dom José Thomaz, 565,
São José, Aracaju/SE. Business evidence: README.md, existing HomeView content,
Footer contact details and the shared public-listing visibility predicate.

The homepage is a brand surface. Booking, fiscal checkout and internal dashboards
remain product surfaces with their existing controls and business rules. This
revision changes public presentation only; no payment, auth or database policy changes.

The visual reference is the physical meeting room: precise architectural lines,
warm wood, dark structure and a calm place to work. The signature is an unobscured
room photograph with a Yankee location caption and a single Laranja Real corner. Avoid
generic stock-office collages, repetitive numbered service cards, fake reviews,
artificial availability and decorative gradients.

## Colors

The user's official brand-identity image supplied on **19 November 2026** is the
source of truth for this palette. It supersedes the earlier copper/blue treatment:
**Laranja Real #F29243 (242,146,67)**, **Azul Yankee #242B48 (36,43,72)**,
**Anti-Flash White #F1F1F1** and black #000000. Yankee tints supplied by the guide
are #3A405A, #666B7F, #9195A3 and #BDBFC8. Keep the logo's established vector
geometry; recolor the mark through `MvaLogo` rather than redrawing its proportions.

Runtime ownership is **Model B**. `src/theme.css` owns `--mva-brand-orange`,
`--mva-brand-navy`, their RGB forms, page/muted/tint tokens, semantic light/dark
roles and the shared shadow levels. `tailwind.config.js` adapts these CSS variables
using RGB alpha syntax; `mva.orange`, `mva.blue`, `mva.dark`, `navy.900/950` and
orange/accent fill utilities resolve to the official brand values. `src/home.css`,
`src/glass.css` and `src/button-glass.css` consume this owner. Legacy copper-named
variables remain compatibility aliases only, with no independent color values.
The shared palette applies to public pages, authenticated workflows, notices,
buttons and administration; workflow, permission and payment rules are unchanged.

| Role | Runtime owner / consumer |
| --- | --- |
| orange-real / on-primary | theme.css: --mva-brand-orange / --mva-brand-navy → .action-primary, payment actions, orange/accent fills and homepage CTA |
| navy-yankee / on-navy | theme.css brand token → Tailwind mva.blue/dark and navy.900/950, header, footer, heroes, photo captions |
| page / surface / ink / muted / line | theme.css semantic RGB variables → forms, public cards, dashboards and operational feedback |
| line-strong | --line-strong-rgb → essential input boundaries; pale structural dividers use --line |
| panel / control | existing home.css and shared component geometry; color migration does not change layout |
| shadows | theme.css --mva-shadow-* → Tailwind shadow adapter and glass/button finish |

Solid Laranja Real actions use **Yankee labels/icons**. Their contrast is 5.92:1;
white on Real is only 2.34:1 and is not used for small action labels. Real text on
Anti-Flash White is only 2.07:1, so light-mode readable accents and links use Yankee.
Dark-mode accents use Real on Yankee (5.92:1) or the nearby dark semantic surface.
Secondary light-mode text #666B7F on #F1F1F1 reaches 4.68:1. #9195A3 and #BDBFC8
are decorative/structural tints on light surfaces, not body-text colors. Dark-mode
page/soft surfaces are modest dark derivatives of Yankee; body text is Anti-Flash
White and supporting text is #BDBFC8.

Focus inherits context: Yankee on light surfaces, Real on dark brand surfaces,
with an offset separating it from a filled action. Explicit high contrast removes
shadows and strengthens neutral surfaces; forced colors uses system Highlight.
Success, danger, warning and info tokens retain their semantic meanings. Keep the
WhatsApp service green and the official Google/payment-network marks; these are
not alternate MVA brand colors. Metal-chip artwork is also unchanged.

## Typography

Manrope is used on homepage headings and room prices, with Inter for paragraphs,
controls and all existing product areas. Both support Portuguese accents, English
and Spanish. Fonts are requested together from Google Fonts with display=swap;
all images have explicit aspect ratios to reserve their layout.

Headings are medium to semibold, with tightly controlled tracking. Body copy uses
comfortable line height. No typewriter, letter-by-letter or blur entrance effects
are introduced. Primary body text remains readable without web fonts.

## Layout

Use the existing 1280px app container. Desktop hero: copy and a distinct photograph
in two columns. Below 768px: copy first, then photo, then stacked service cards.
Sections have 88px separation, reduced to 60px on mobile. Services are parallel
choices; only the actual three-step process is numbered.

Actual approved/available listings may appear on the homepage, at most three,
with headquarters listed first. Do not synthesize rooms, capacity, price or
customer claims. When none are public, omit this optional section.

The mobile bottom navigation remains accessible above safe-area padding. The
cookie preference panel sits above it and scrolls when expanded on short screens.

## Elevation & Depth

Na página inicial, a fotografia da MVA dá profundidade à abertura. A chamada
principal, o processo e as perguntas frequentes ficam sobre o fundo da página.
Cartões de serviço, salas e planos usam superfícies sólidas e bordas consistentes.
O destaque de um plano vem da borda Laranja Real. A referência visual é a composição
fotográfica da [Fora](https://www.foraspace.com/) e o catálogo da
[Industrious](https://www.industriousoffice.com/locations).

`src/theme.css` define três níveis de sombra, com valores para os temas claro e
escuro. Use `--mva-shadow-low` para cartões e controles, `--mva-shadow-raised`
para a fotografia principal e `--mva-shadow-overlay` para menus e modais.
`tailwind.config.js` mapeia as classes de sombra para esses mesmos níveis.
Em alto contraste e na impressão, as bordas continuam separando as superfícies.
A navegação tem um desfoque leve e os botões principais têm um reflexo discreto.
Os botões de WhatsApp e e-mail mostram suas cores ao passar o cursor.

### Motion

Button feedback is shared by `src/button-glass.css`, imported after screen styles.
`src/theme.css` owns its 180 ms duration, easing and brightness tokens. Enabled
buttons and button-shaped links darken to 90% brightness on fine-pointer hover;
primary calls to action rise 2px without changing document layout. Pressing uses
84% brightness and returns the action to its resting position in 80 ms, including
on touch devices. Existing icon motion and keyboard focus rings remain intact.
Inverse ghost controls also gain a translucent dark background. Text links use
an underline on hover. Disabled, aria-disabled and busy controls get no feedback.
Reduced motion removes translation and makes color feedback immediate. Explicit
high contrast, forced colors and printing omit filters and motion. Brand colors
and semantic intent remain unchanged at rest; no scale or looping animation.

The homepage opens with a short upward entrance for the headline, copy and
actions. The meeting-room photo settles from a 3.5% crop while staying visible.
Service cards, the room-section heading and the address panel enter once as
they come into view. Card borders and link arrows respond to hover and keyboard
focus. The FAQ keeps its native disclosure and adds a brief answer entrance.
`src/home.css` owns the timing and easing. Reduced motion removes the entrances,
zoom and arrow movement. All content is readable before scroll detection runs.

A assinatura MVA usa contornos vetoriais com altura e peso consistentes e dois
traços Laranja Real entre o V e o A. O componente `MvaLogo` é a fonte do desenho.
Na abertura, os traços se recolhem no M e voltam a formar a marca em 860 ms,
em paralelo à inicialização. Em carregamentos mais longos, a marca completa
permanece estática. A preferência de reduzir movimento exibe a marca estática
desde o início e dispensa a duração mínima da apresentação.

## Shapes

20px panels, 10px controls. Only the hero photograph has an asymmetric lower
corner. The corner signals the brand without repeating across every card.

## Components

Public navigation links use anchors with real destinations. Normal clicks use
the existing SPA routing; modified clicks retain native open-in-new-tab behavior.
Public room links carry a `space` ID to the existing detail view. Use the same
`isSpacePubliclyVisible` predicate as the marketplace.

Native details/summary elements own the FAQ disclosure and keyboard behavior.
Category filters are toggle buttons with aria-pressed, rather than partial tabs.
The native select is deliberately retained for platform-owned filter popups.

Use meaningful photo alt text, decorative icon aria-hidden, visible keyboard
focus, at least 44px primary touch controls and reduced-motion overrides.

### Solicitações fiscais e agendamentos (áreas autenticadas)

Para a área do cliente, preservar a linguagem institucional e as superfícies do
`src/theme.css`, sem transportar o tom de marketing para fluxos operacionais.
O andamento fiscal usa uma linha vertical de etapas com ícones e texto, separando
explicitamente elegibilidade, pagamento e autorização. A tipografia de títulos
segue Manrope; os detalhes funcionais permanecem em Inter.

O calendário de reservas usa cartões de dias com rolagem horizontal no celular,
horários selecionados em Azul Yankee com borda Laranja Real, ocupados em superfícies
neutras desabilitadas e rótulos persistentes: Livre / Ocupado / Encerrado.
Apenas disponibilidade confirmada pelo RPC habilita o botão de reserva.

Os controles da nova área herdam contraste e tema claro/escuro do arquivo
`src/theme.css`; novos componentes não criam paleta alternativa.
Para estados, navegação, recuperação e segurança, consultar `UX-CONTRACT.md`.

## Do's and Don'ts

- Keep the established MVA branding and verified contact details.
- Keep prices and capacity sourced from the real public catalog.
- Translate new homepage copy in Portuguese, English and Spanish.
- Do not add invented promotions, testimonials or guarantees about fiscal approval.
- Preserve fiscal eligibility, payments, authorization and intern-room rules.
- Do not publish secret environment values, private data or test customer records.

### Notificações e estados operacionais

Os avisos compartilham a superfície sólida do tema, texto institucional e borda
neutra. Azul Yankee e Laranja Real seguem os valores oficiais do guia; não usar painéis verdes,
rosas ou amarelos para preencher estados. A diferenciação vem do texto e de um
único ícone SVG Lucide: `CircleCheck` para concluído/aprovado, `Clock` para
aguardando, `FileSearch` para análise documental e `CircleX` para rejeitado/falha. Atualizações informativas sem esses significados não recebem
um estado artificial. Rótulos de pagamento e autorização continuam explícitos.

O proprietário visual é `src/theme.css`: `--surface`, `--field`, `--ink`,
`--muted`, `--line` e `--accent` → `.mva-toast`, `.mva-notice` e
`.mva-status-badge`. `StatusBadge` / `StatusSymbol` centralizam a iconografia;
`ToastContainer` apresenta o feedback. Não duplicar cores por tela. Avisos de
espera/análise usam somente um detalhe Laranja Real. Os toasts têm raio de 16px,
sombra `--mva-shadow-raised`, texto com entrelinha confortável e botão de fechar
com área de 44px. A família Lucide foi escolhida pelo usuário: contornos em
`--ink`, tamanho de 20px nos avisos e 16px nos selos, `strokeWidth={1.5}`.
Não usar emojis nem cores multicoloridas para representar estes estados.
Em botões, o ícone herda a cor do rótulo para manter contraste sobre o azul-marinho.
O suporte do ícone do toast tem 38px e um canto inferior de 4px. Dois pequenos
traços cobre, derivados dos traços da assinatura `MvaLogo`, fazem a ligação com
a marca. Esse detalhe fica só nos toasts, sem repetir em cada selo ou etapa.
Superfície sólida e tipografia semibold mantêm a atenção no conteúdo.
No celular, o posicionamento respeita navegação e acessibilidade;
texto longo quebra sem alargar a tela. O tema escuro usa os mesmos tokens.

### Retorno de checkout e avisos de pagamento

`StatusNotice` estende o padrão compartilhado para avisos persistentes de checkout,
erros ao iniciar pagamento e prazos de reserva. Usa `.mva-notice`, `StatusSymbol`
e os mesmos tokens do tema: superfície sólida, borda neutra com filete Laranja Real,
ícone Lucide em suporte de 38px e texto institucional. Não repetir os traços da
logo reservados aos toasts. Botão de dispensar com alvo de 44px e foco visível.
Cancelamento recebe `CircleX` e texto de cancelamento, sem ser chamado de rejeição.
Confirmação real recebe `CircleCheck`; pendência recebe `Clock`; análise, `FileSearch`.
Teste não recebe aparência de pagamento real. A consulta de status e a verificação
financeira continuam sendo responsabilidade dos componentes do fluxo.
