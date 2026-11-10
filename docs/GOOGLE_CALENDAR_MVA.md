# MVA Coworking — integração automática de reservas ao Google Agenda

A sincronização **administrativa** (agenda da MVA) roda no Supabase e não depende
de o cliente estar com o site aberto. A plataforma oficial é
`https://mvacoworking.com.br`.

## Como funciona

1. Uma reserva de sala de atendimento/reunião ou sala interna é gravada no Supabase.
2. O trigger `enqueue_mva_delivery` registra um job do tipo `calendar`.
3. O `pg_cron` chama `dispatch_mva_booking_deliveries()` a cada minuto.
4. A Edge Function `mva-booking-deliveries` usa um **refresh token OAuth de uma conta da MVA**
   para criar o evento na agenda escolhida pelo identificador `GOOGLE_CALENDAR_ID`.
5. Eventos têm ID determinístico baseado no UUID da reserva — não são duplicados
   quando a fila é reprocessada ou o Google retorna HTTP 409.
6. Cancelamentos autorizados pelo sistema removem o evento correspondente (HTTP 404
   também é tratado como sucesso). Nada é removido do banco/histórico.
7. Os horários de sala são enviados em `America/Maceio` (Aracaju).
   Reservas internas são tratadas como eventos de dia inteiro.
8. Se a conta Google ainda não estiver autorizada, os jobs **continuam pendentes**
   e nenhuma tentativa é declarada concluída.

**Nota:** a reserva cadastrada não equivale a pagamento confirmado. Os eventos não
podem ser usados como comprovante financeiro. Pagamentos e uso de planos continuam
sob a lógica do Stripe e do próprio site.

## Etapa indispensável: autorizar a conta do Google

O Google exige ação humana para conceder autorização de edição da agenda.

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   selecione o projeto corporativo da MVA, habilite **Google Calendar API** e
   configure a tela de consentimento OAuth, com o domínio
   `mvacoworking.com.br` como domínio autorizado, quando aplicável.
2. Crie **Credenciais > ID do cliente OAuth > Aplicativo da Web**.
3. Para obter o primeiro refresh token com [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
   autorize como **URI de redirecionamento** do cliente OAuth
   `https://developers.google.com/oauthplayground`. Na engrenagem do Playground,
   marque *Use your own OAuth credentials* e informe seu Client ID e Client Secret
   **diretamente no Playground, não neste chat**.
4. Selecione o escopo `https://www.googleapis.com/auth/calendar.events`,
   autorize com a conta Google **que possui acesso de edição** à agenda da MVA
   (acesso offline), troque o código por tokens e salve o **refresh token**.
   Se não receber refresh token, revogue a concessão anterior e repita com
   `prompt=consent`. Não envie tokens em mensagens ou repositórios.
5. Na agenda em [Google Calendar](https://calendar.google.com/), abra
   Configurações > Configurações das minhas agendas > Integrar agenda e copie o
   **ID da agenda** (pode ser um e-mail ou identificador `@group.calendar.google.com`).
   Certifique-se de que a conta autorizada tem acesso **Gravar/Modificar eventos**.
6. Em [Supabase — Edge Functions > Secrets](https://supabase.com/dashboard/project/yealdaokedpfpdgvslzj/settings/functions)
   salve quatro segredos:
   - `GOOGLE_CALENDAR_ID` — identificador da agenda que receberá reservas;
   - `GOOGLE_OAUTH_CLIENT_ID` — ID do cliente OAuth do Google Cloud;
   - `GOOGLE_OAUTH_CLIENT_SECRET` — segredo do cliente OAuth;
   - `GOOGLE_OAUTH_REFRESH_TOKEN` — token obtido via consentimento da conta MVA.
7. No site, acesse **Administração > Google Agenda** e clique em
   **Testar conexão Google Agenda**. A verificação valida a renovação do token
   e a permissão `writer` ou `owner` da agenda. Os resultados e a fila aparecem
   exclusivamente para administradores autenticados.
8. Faça uma reserva real de teste futura e verifique se surge na agenda.
   Após um cancelamento **permitido pelo sistema**, confira se o evento some.
   Uma reserva já paga pode exigir reembolso antes do cancelamento.

### Observações importantes de produção

- Se o aplicativo OAuth estiver em modo **Testing/Externo**, os refresh tokens
  podem expirar em sete dias (dependendo da configuração/scopes). Para operação
  contínua, use app adequado a produção ou o modo Interno do Workspace.
- A chave `GOOGLE_OAUTH_REFRESH_TOKEN` e o segredo do cliente **nunca** vão em
  variáveis `VITE_...` ou código React. São exclusivos das Edge Functions.
- A integração para a agenda administrativa é independente da sincronização
  pessoal de clientes com Google e das notificações por e-mail. A flag
  `BOOKING_EXTERNAL_INTEGRATIONS_ENABLED` do React permanece desligada,
  e `booking_delivery_config.email_enabled=false`.
- A rotina já está ativa no banco e coloca novos agendamentos na fila, mas
  **sem a autorização acima não haverá inserção no Google**.
- O cron `mva-booking-calendar-worker` pode ser pausado via
  `booking_delivery_config.enabled=false` pelo administrador da infraestrutura.
- O processamento no Google costuma ocorrer no próximo ciclo de um minuto,
  sujeito à disponibilidade dos serviços e retentativas da fila.

## Diagnóstico e suporte

Na aba **Google Agenda**, os indicadores apresentam `Na fila`, `Sincronizados`,
`Falhas`; em `Testar conexão`, o backend verifica se a conta pode
editar a agenda. A função `mva-booking-calendar-status` exige sessão ativa e
revalida o perfil administrativo no Supabase; não expõe tokens.

A Edge Function `mva-booking-deliveries` é acessível apenas pelo segredo
interno de entrega via `pg_net`; reenvios usam o ID estável do evento.

Para atualizações de domínio, a aplicação de reservas usa
`https://mvacoworking.com.br/?page=client-dashboard`. O Google Calendar API
não precisa de um redirect para esse endereço quando a autorização inicial é
obtida pelo OAuth Playground (a URI de redirecionamento é a do Playground).
