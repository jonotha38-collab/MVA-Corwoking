# UX-CONTRACT — Fluxos autenticados MVA

## Escopo
Contrato dos fluxos de **acompanhamento de endereço fiscal** e **reserva de salas**. Evidências: fluxos existentes `FiscalServiceCenter`, `FiscalCheckout`, `BookingModal`, a navegação da aplicação, Supabase RLS, políticas do Stripe e `DESIGN.md`.

## Navegação / recuperação
- `?page=fiscal-status`: destino privado na barra de navegação desktop e mobile, no menu da conta e no painel do cliente. Se desconectado, a rota pede autenticação pelo fluxo existente.
- O cadastro e contratação de endereço fiscal permanecem em `?page=fiscal`, sem uma segunda cópia dos formulários.
- O cliente vê apenas pedidos vinculados ao próprio usuário. Pedidos antigos continuam visíveis; o mais recente é mostrado inicialmente. A seleção de outro pedido não altera o banco.
- Área de acompanhamento usa `fiscal_applications`, `mva_checkout_orders`, `fiscal_contracts` e metadados privados com as permissões RLS existentes. Nunca mostrar dados de outra empresa.
- Atualização ao entrar, ao retornar para a aba e durante visualização (45 segundos). Estado de carregamento, erro com tentativa novamente, lista vazia com caminho para planos. Não apresentar um percentual fictício.

## Estados do endereço fiscal
- Recebido / Em análise: aguardar equipe; detalhes e parecer disponíveis ao titular.
- Rejeitado: motivo explícito; nenhuma cobrança autorizada; orientação para solicitar nova análise.
- Aprovado: elegível para o checkout pelo Stripe. A aprovação não é autorização de uso.
- Pago: somente pedido `status='paid' AND livemode=true` confirmado no servidor; contrato ainda exige conferência humana.
- Ativo: contrato `status='ativo'`, pagamento real válido e vigência atual. Reembolsos, disputas e contratos vencidos não podem aparecer como autorizados.
- Cada estágio deve usar texto + ícone além da cor. Não anunciar conclusão sem confirmação do servidor.

## Disponibilidade e reserva
- Fonte canônica da seleção: `mva_room_availability` consultando reservas confirmadas sem expor identidade ou outros dados pessoais. O registro final é protegido pela restrição `bookings_no_overlap` e pelo trigger `secure_booking_insert`.
- Dias: visualização de 7 datas, com navegação até 60 dias a partir da data atual do serviço. Dia sem horário livre fica desabilitado.
- Horários: livre, ocupado ou encerrado, explicitamente rotulados; ocupa a hora se qualquer reserva confirmada se sobrepõe ao intervalo. Nunca permitir seleção de horário indisponível.
- Após selecionar a primeira hora, permitir apenas durações contínuas até o próximo horário ocupado ou até o fechamento da sala.
- Antes de mostrar horários: loading; falha: aviso e ação de atualizar. Falha na criação: não informar sucesso, buscar disponibilidade atual novamente, manter dados digitados.
- Botão de confirmação desabilitado enquanto a disponibilidade é desconhecida/inválida ou a solicitação é processada.
- Os preços existentes e as regras de pagamento/cancelamento não devem ser alterados por mudanças visuais. O servidor continua definindo valor da reserva.

## Aparência e acessibilidade
- Usar tokens do `src/theme.css` e o padrão `DESIGN.md`: azul-marinho, cobre, superfícies neutras; detalhe de etapa com linha de progresso institucional, sem animação excessiva.
- Botões de dias: área mínima clicável de 44 px, scroll horizontal em celular; salas ocupadas não devem parecer acionáveis.
- Labels, status, erros e orientações em português claro; contraste no modo claro e escuro; foco de teclado visível.
- Utilizar `useCoworking` para navegação e controle de sessão, `showToast` para feedback, `StripeCheckoutAction` para cobranças e componentes compartilhados em vez de duplicar mecanismos.
- Outros idiomas dependem da tradução do catálogo `src/lib/translations.json`; não presumir que copy nova foi traduzida automaticamente.

## Verificação
- `npm run build`: sem erros TypeScript.
- `npm run test:payments`: testes das regras de blocos horários e das etapas fiscais.
- Confirmar no navegador mobile/desktop (claro/escuro), conectado/desconectado, com horários ocupados, sem horários, erro RPC, mudança de semana e disputas de ocupação.


## Planos de endereço fiscal MVA — versão comercial 09/11/2026
- Novas contratações: MVA Essencial (R$79,90), MVA Profissional (R$91,90) e MVA Excellence (R$103,00) por um mês.
- Vigência de 12 meses: pagamento único, 10% de desconto sobre 12 mensalidades; campanha existente de transferência (4 meses descontados) substitui o desconto anual padrão e exige validação humana. Benefícios e preços derivam de `mva_fiscal_prices` no servidor, não dos campos do navegador.
- Pedidos, contratos e pagamentos iniciados com os IDs antigos `comercial`, `fiscal`, `fiscal_ie` mantêm valores históricos; o catálogo público passa a exibir somente os novos IDs `mva_essencial`, `mva_profissional`, `mva_excellence`.
- Descontos de 5%, 10% e 15% em horas de salas **próprias MVA** somente com contrato fiscal ativo, pagamento real confirmado, e durante sua vigência. Não se aplicam a extras nem parceiros. Não combinam com créditos de plano independente de horas.
- Excellence: até duas horas de bônus por mês contratual **nos 3 primeiros meses desde a primeira formalização**, exclusivamente em salas de atendimento próprias para até 3 pessoas. Saldo não é acumulativo e não é transferido; reservas canceladas liberam o saldo daquele ciclo. O servidor decide preço final em uma transação com trava por usuário, sem confiar em valores do frontend.
- Reserva coberta inteiramente por bônus, sem extras, tem total R$0 e não exige Stripe. Reserva parcialmente coberta paga apenas horas restantes descontadas, mais extras integrais. O registro de reserva não deve ser confundido com comprovante de pagamento.
- A autorização para utilizar o endereço continua exigindo **aprovação humana** com documentos assinados, mesmo após o Stripe confirmar pagamento.
