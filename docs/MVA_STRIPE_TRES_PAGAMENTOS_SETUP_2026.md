# MVA Coworking | Stripe: 3 fluxos de pagamento (03/11/2026)

> ESTADO: infraestrutura implantada, **cobranças desligadas**. Chaves de produção compartilhadas em conversas devem ser revogadas/substituídas. Nunca salvar uma chave secreta em arquivo versionado ou no frontend.

## 1. Como a arquitetura funciona

| Serviço | Fluxo Stripe | Quem recebe | Quando é marcado como pago |
|---|---|---|---|
| Endereço comercial/fiscal | Stripe Checkout hospedado, pagamento único de 1 ou 12 meses | MVA | Somente webhook autenticado com `payment_status=paid`, valor, moeda e sessão validados |
| Mensalidade do proprietário | Stripe Billing + Checkout `mode=subscription` | MVA | Eventos de assinatura e fatura `invoice.paid`, sem liberar publicação antes da cobrança válida e período vigente |
| Reserva de sala de parceiro | Stripe Connect **direct charge**, Checkout na conta Stripe conectada | Próprio coworking | Webhook Connect assinado (com `event.account`) confirma o pagamento da reserva; sem comissão MVA |

No checkout hospedado não é preciso expor uma chave pública no navegador: o backend cria a sessão e retorna somente a URL HTTPS da Stripe. Os valores são recalculados pelo servidor e a confirmação só ocorre via webhook. Redirecionar de volta à página **não comprova pagamento**.

## 2. Tabelas e funções

- `mva_billing_settings`: quatro flags OFF por padrão: `checkout_enabled`, `owner_subscriptions_enabled`, `connect_enabled`, `enforce_owner_subscriptions`.
- `mva_owner_plans`: Essencial até 2 espaços, R$ 49,90/mês; Profissional até 8, R$ 99,90/mês; Business até 25, R$ 199,90/mês. **São preços propostos, não aprovados para cobrança**. `active=false`.
- `mva_fiscal_prices`: catálogo original em centavos, Endereço Comercial R$ 29,90, Endereço Fiscal R$ 80,00, Fiscal + IE R$ 120,00 por mês. `active=false` até aprovação dos valores e condições.
- `mva_owner_subscriptions`: estado e vigência da assinatura do proprietário.
- `mva_connected_accounts`: ID da conta Stripe Connect e status de cobranças/repasses.
- `mva_checkout_orders`: pedidos de endereço fiscal e reservas, com unicidade por recurso, tentativa serializada, status e IDs Stripe.
- `mva_stripe_webhook_events`: registro de idempotência (cada evento é aplicado uma vez).
- `mva_apply_verified_stripe_event`: função do banco executável **somente por service_role**, transação única. Responde a webhooks de pagamento, assinatura e Connect.
- `mva-stripe-gateway`: Edge Function autenticando usuário com `auth.getUser`, checando propriedade da reserva/empresa, perfil de proprietário, valores e flags.
- `mva-stripe-webhook`: Edge Function pública apenas para callbacks **com assinatura Stripe validada** usando corpo original.

Migrações novas estão em `supabase/migrations/20261103*.sql`; tudo já está aplicado ao projeto Supabase `yealdaokedpfpdgvslzj`. Triggers e RLS existentes de reservas e anúncios continuam em vigor. Nenhuma reserva ou contrato anterior foi excluído.

## 3. Credenciais a instalar manualmente

1. **Revogar e substituir a chave de produção exposta anteriormente.** Essa chave não foi colocada no GitHub nem no Supabase por esta implementação. Não enviá-la pelo chat.
2. No [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys), gerar uma chave de **teste** `sk_test_...` ou `rk_test_...` com permissões que permitam criar Checkout Sessions, clientes, assinaturas/Billing Portal, criar/consultar contas Connect Express e Account Links.
3. No [Supabase Edge Function Secrets](https://supabase.com/dashboard/project/yealdaokedpfpdgvslzj/settings/functions), configurar as seguintes chaves no ambiente de TESTE, sem versões reais ainda:
   - `STRIPE_SECRET_KEY`: chave de teste nova.
   - `STRIPE_BILLING_MODE`: `test`.
   - `STRIPE_BILLING_ENABLED`: `true`.
   - `MVA_SITE_URL`: `https://coworking-mva-du8c.vercel.app`.
   - `STRIPE_WEBHOOK_SECRET`: segredo `whsec_` do **webhook da conta plataforma**.
   - `STRIPE_CONNECT_WEBHOOK_SECRET`: segredo `whsec_` do **webhook dos eventos de contas conectadas** (diferente do anterior).
   - `STRIPE_LIVE_LAUNCH_APPROVED`: **não definir como true** até testes e autorização explícita.
4. No Stripe Workbench/Developers → Webhooks, criar dois destinos para:
   `https://yealdaokedpfpdgvslzj.supabase.co/functions/v1/mva-stripe-webhook`
   - Eventos da conta MVA: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`.
   - Eventos de **contas conectadas (Connect)**: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `account.updated`, `charge.refunded`, `charge.dispute.created`.
   - Configurar cada segredo correto na variável correspondente. O webhook **não usa JWT**, valida a assinatura sobre o corpo bruto.
5. O gateway usa sessão de usuário autenticada do Supabase. O Stripe Connect exige que a plataforma tenha essa funcionalidade disponível e habilitada para seus parceiros no Brasil. Checar disponibilidade e termos no Dashboard.

## 4. Como ativar para TESTES — não executar antes de configurar segredos

Os valores devem ser aprovados pelo proprietário da MVA. Com conta de administrador e após conferência dos preços, ativar as linhas do catálogo e, somente então, os três fluxos no painel SQL do Supabase:

```sql
-- SOMENTE TESTES, depois de webhook e chave sk_test/rk_test configurados
update public.mva_fiscal_prices set active=true
 where id in ('comercial','fiscal','fiscal_ie');
update public.mva_owner_plans set active=true
 where id in ('essencial','profissional','business');
update public.mva_billing_settings set
 checkout_enabled=true,
 owner_subscriptions_enabled=true,
 connect_enabled=true,
 enforce_owner_subscriptions=false,
 updated_at=now()
where id=1;
```

Enquanto desligado, todas as telas mostram **Em preparação — sem cobrança**. Ativar catálogos e flags não basta se faltarem os segredos e o `STRIPE_BILLING_MODE=test`.

**Nunca ativar `enforce_owner_subscriptions` na fase de teste.** A política de espaços e o limite por plano já estão preparados, mas dependem de vigência paga no modo real. O padrão OFF preserva os anúncios existentes.

## 5. Checklists de teste antes de aprovação de produção

1. Endereço fiscal: cliente com pedido de viabilidade `approved` seleciona plano e período compatíveis, checkout test inicia, webhook registra pagamento; **não** há emissão automática ou aprovação de alvará. Cliente sem aprovação não pode ser cobrado.
2. Proprietário: assinatura teste criada, webhook de Checkout e de fatura atualiza plano, status e vencimento. Gerenciar/cancelar assinatura pelo Billing Portal; testar `invoice.payment_failed`.
3. Parceiro: conta Express teste passa onboarding, recebe capabilities e eventos `account.updated`. Cliente paga uma reserva, lançamento aparece como pagamento **direto** na conta conectada, sem `application_fee`.
4. Garantir deduplicação de webhooks, chargebacks/reembolsos, tentativas paralelas de checkout, cancelamento da reserva após pagamento e reconciliação de pagamentos atrasados.
5. Testar cliente A/B, proprietário, admin e visitante; ninguém pode ler registros financeiros de outra pessoa. Revisar antifraude e rate limiting antes do lançamento.
6. Integrar termos de cancelamento/reembolso ao checkout, ajustar política LGPD, configurar tributação e emissão de documentos fiscais. Definir se reservas não pagas expiram; hoje a reserva é registrada antes da cobrança.
7. Confirmar os valores dos planos e tarifas da Stripe; tarifas de processamento e custos de Connect são responsabilidade do recebedor conforme modelo contratado. A MVA não aplica comissão por reserva.

## 6. Ir para produção (exige nova autorização)

Após teste de ponta a ponta, substituir pelas novas credenciais **de produção** (nunca reutilizar chave comprometida) e novos webhooks `whsec` correspondentes, definir `STRIPE_BILLING_MODE=live` e, **somente após autorização explícita**, `STRIPE_LIVE_LAUNCH_APPROVED=true`. Testar primeiro uma transação pequena, reembolso, assinatura, pagamento ao parceiro, webhook e suporte operacional.

O checkout do endereço fiscal ficará disponível somente para solicitações com análise aprovada. A assinatura do proprietário poderá ser gerenciada pelo portal do Stripe. As reservas pagas continuam mostrando status registrado por webhook.

O Google Agenda e e-mails automáticos **continuam pausados**; este projeto Stripe não reativa essas integrações.

## 7. Referências oficiais
- https://docs.stripe.com/checkout/quickstart
- https://docs.stripe.com/connect/direct-charges
- https://docs.stripe.com/connect/enable-payment-acceptance-guide
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://supabase.com/docs/guides/functions/examples/stripe-webhooks


## 8. Revisão de continuidade — validações de segurança concluídas

- Publicação inicial da integração confirmada READY na Vercel. O backend permanece com `checkout_enabled=false`, `owner_subscriptions_enabled=false`, `connect_enabled=false`, `enforce_owner_subscriptions=false`.
- Gateway agora exige **chave Stripe apropriada + segredo de webhook da plataforma** para anunciar checkout disponível. A conexão Stripe Connect também exige segredo próprio válido de webhook.
- O **portal da assinatura existente permanece acessível mesmo que novas cobranças estejam pausadas**, desde que a credencial Stripe ainda esteja configurada. Não bloquear cancelamento de assinaturas já iniciadas.
- Pedidos financeiros no banco são recalculados no servidor. O trigger `secure_booking_insert` assegura que `total_price`, duração e adicionais aceitos não sejam controlados arbitrariamente pelo usuário.
- Chaves de idempotência estáveis impedem que repetir uma solicitação de criação de sessão produza múltiplos checkouts por falha de rede. Para assinaturas a chave é hash e não contém dados pessoais.
- Transações **de teste** são exibidas como teste nas telas de confirmação, resumo e administração; nunca como pagamento real que permita utilizar o endereço.
- Validações transacionais com `ROLLBACK`: alteração de status de assinatura com período de API moderna, `invoice.payment_failed`, webhook repetido, confirmação de reserva paga e reembolso. Nenhuma operação de teste gerou cobrança ou modificou os pedidos persistentes.
- A sessão de pagamento com Stripe Connect é cobrança direta na conta conectada do coworking; não há `application_fee` no código.
- **Limite atual dos testes:** os eventos foram simulados em transações de banco; ainda são obrigatórios testes ponta a ponta com chave `sk_test_` válida, webhooks Stripe de teste reais e cartões de teste. O status ACTIVE de uma Edge Function e o build READY não certificam que eventos reais estão sendo entregues.
- **Webhooks desligados de e-mail e Google Agenda continuam desligados**, sem relação com os webhooks de cobrança Stripe.

Não reativar modos live antes de confirmar a segurança dos reembolsos, a experiência de cancelamento e a elegibilidade jurídica do endereço fiscal. O webhook confirma um pagamento, mas **não ativa o contrato fiscal automaticamente**.
