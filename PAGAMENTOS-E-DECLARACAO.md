# Checkout e declaração fiscal

## O que foi implementado

Ao selecionar um plano, o cliente vê o checkout com resumo, preço, vigência e dados da empresa. Após entrar na conta, informa o cartão dentro dos campos isolados do Stripe Payment Element. O número e o CVC não passam pelo React, banco MVA ou Edge Functions.

O servidor escolhe o preço a partir do ID do plano; valores enviados pelo navegador não são usados. O plano é anual, com pagamento único à vista: R$ 358,80 (comercial), R$ 960 (fiscal) ou R$ 1.440 (fiscal com inscrição estadual). O valor mensal exibido é equivalente, sem parcelamento ou renovação automática nesta implementação. A oferta de portabilidade preexistente desconta quatro mensalidades do total anual e exige o endereço anterior. A oferta é calculada no servidor.

O contrato só é criado quando o pagamento é confirmado pela Stripe. O webhook assinado atualiza o pedido e o contrato em uma única transação. A consulta de status também reconcilia o pedido diretamente com a API da Stripe, caso o webhook esteja atrasado. A volta do navegador, o clique no botão e o localStorage nunca confirmam pagamentos.

A declaração depende de conta autenticada, titularidade, plano fiscal, pagamento real confirmado, contrato ativo e vigência válida. O servidor verifica tudo novamente, inclusive o estado atual na Stripe, antes de gerar o PDF. Plano comercial, contrato legado sem comprovação, teste, cancelamento, estorno e contestação não liberam a emissão. Qualquer estorno, inclusive parcial, bloqueia a emissão; a reativação exige análise posterior fora deste fluxo.

O PDF usa os dados reais do contrato, um número de registro persistente e os dados da mantenedora definidos nos secrets. Não inventa protocolo de alvará, QR code de autenticação ou assinatura digital. O nome do responsável pela emissão não é uma assinatura criptográfica; se a operação precisar de assinatura eletrônica/ICP-Brasil, conecte o provedor de assinatura antes de adotar o documento como definitivo. A contratação não aprova automaticamente alvarás ou inscrições públicas.

## Ativar em homologação

1. Faça backup do banco. Confira a estrutura de `fiscal_contracts`: esta atualização usa o esquema atual de `supabase/schema.sql`, que possui `user_id`. A migração histórica `000000_init.sql` é incompatível com essa base; **não use `supabase db reset` nem aplique as duas bases juntas**.
2. No SQL Editor, execute **somente** `supabase/migrations/202610190001_fiscal_payments.sql` sobre o banco atual. Se instalar do zero, execute primeiro `supabase/schema.sql` e depois essa nova migração.
3. Configure no servidor os secrets de `supabase/functions/.env.example` com os dados reais. Use `sk_test_...` inicialmente. `SUPABASE_SERVICE_ROLE_KEY` deve permanecer exclusivamente no servidor.
4. Publique as funções, mantendo `supabase/config.toml`:

```bash
supabase functions deploy fiscal-create-payment
supabase functions deploy fiscal-payment-status
supabase functions deploy fiscal-webhook
supabase functions deploy fiscal-certificate
```

As funções autenticadas validam o bearer token com `auth.getUser`. O webhook usa a assinatura da Stripe. A opção `verify_jwt=false` não torna a emissão pública: a autenticação e a titularidade são obrigatórias dentro das funções.

5. No painel Stripe, adicione um endpoint de webhook de eventos **snapshot** para `https://SEU-PROJETO.supabase.co/functions/v1/fiscal-webhook`. Selecione `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed`, `charge.refunded` e `charge.dispute.created`. Copie o signing secret para `STRIPE_WEBHOOK_SECRET`.
6. No frontend, crie `.env.local` usando `.env.example` e configure `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` da mesma conta da chave secreta. Recompile com `npm run build`.
7. Adicione os domínios reais à lista `PAYMENT_ALLOWED_ORIGINS`. Use HTTPS na publicação. Se houver Content Security Policy na hospedagem, permita os domínios exigidos pela Stripe.js/Elements conforme a documentação Stripe.
8. Teste cartão aprovado, recusado, autenticação 3DS, abandono/retorno, webhook repetido/atrasado, estorno e contestação no ambiente Stripe de teste. O checkout reconhece o teste, mas **não libera o endereço fiscal nem o PDF oficial**.

Sem chave pública, o checkout funciona como apresentação: os campos de cartão são prévias desabilitadas, claramente identificadas, e não há botão para simular aprovação. Se o backend estiver indisponível, o fluxo mostra erro e não ativa contrato.

## Entrar em produção

Configure as chaves `pk_live_...`, `sk_live_...` e o signing secret do webhook de produção, todos da mesma conta. Configure os dados verdadeiros da mantenedora e do responsável. Recompile e publique o frontend. Nenhuma conta Stripe foi criada ou conectada automaticamente, e nenhuma função/migração foi aplicada ao seu Supabase por esta entrega.

Os contratos anteriores permanecem com `payment_status='unpaid'`: eles não são presumidos pagos. Reconcilie os pagamentos históricos com registros reais antes de migrá-los. Não libere documentos simplesmente alterando o status visual do contrato. O novo endpoint exige a ligação válida com um pedido e um PaymentIntent verificável na mesma conta Stripe.

## Arquivos principais

- `src/components/payments/FiscalCheckout.tsx`: checkout e estados de pagamento.
- `src/components/fiscal/CertificateDialog.tsx`: disponibilidade e download do documento.
- `supabase/functions/_shared/fiscal-plans.ts`: catálogo de preços e validação compartilhados.
- `supabase/functions/fiscal-create-payment`: cria o pedido e PaymentIntent idempotente.
- `supabase/functions/fiscal-payment-status`: consulta e reconcilia o pagamento.
- `supabase/functions/fiscal-webhook`: recebe notificações assinadas.
- `supabase/functions/fiscal-certificate`: verifica direito de emissão e gera PDF.
- `supabase/migrations/202610190001_fiscal_payments.sql`: pedidos, permissões e liquidação transacional.

## Referências de implementação

- Stripe Elements: https://docs.stripe.com/js/elements_object/create
- Stripe Payment Element: https://docs.stripe.com/payments/payment-element
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Supabase Stripe Webhooks: https://supabase.com/docs/guides/functions/examples/stripe-webhooks
- CNPJ numérico/alfanumérico: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj


## Cartão visual animado

O checkout inclui `AnimatedPaymentCard`, com Motion, cores da MVA, temas claro/escuro, nome do titular, troca animada de bandeira e botão para ver frente/verso. Respeita a preferência de movimento reduzido.

No pagamento, o evento oficial `carddetailschange` do Payment Element fornece `details.brands` e o indicador `loading`. O evento `change` limpa a ilustração quando os campos são apagados ou quando o método deixa de ser cartão. Bandeiras desconhecidas mantêm o cartão genérico; não há tentativa de descobrir a bandeira lendo o número no React. Em cartões com mais de uma bandeira, o componente exibe as bandeiras informadas pelo provedor, sem escolher a rede de processamento por conta própria.

A representação mantém número, validade e CVC sempre mascarados. O nome do titular é o mesmo campo não sensível já presente no formulário. O verso é alternado pelo próprio cliente; não se tenta acessar o foco do CVC dentro do iframe.

Sem configuração de pagamento, há uma demonstração identificada como **Exemplo visual**, com botões Visa, Mastercard e Amex. Esses botões alteram somente a ilustração: não selecionam uma bandeira de cobrança e não aprovam pagamentos. Os campos de cartão continuam desabilitados.

Os eventos são recebidos da Stripe.js carregada diretamente do provedor. Se não houver identificação, a interface usa o símbolo genérico de cartão. Documentação da interface oficial: https://github.com/stripe/stripe-js/blob/master/types/stripe-js/elements/payment.d.ts
