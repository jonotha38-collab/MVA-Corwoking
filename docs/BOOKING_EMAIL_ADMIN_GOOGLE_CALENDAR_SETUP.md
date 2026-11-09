# MVA Coworking | Agenda administrativa Google + confirmação por e-mail

## O que está instalado

A partir desta migração, toda nova reserva comercial ou de sala interna confirmada no Supabase cria **duas entregas**:
- Evento na agenda administrativa do Google, com responsável, espaço, data e horário (dia inteiro para salas internas, sem hora marcada).
- E-mail de confirmação enviado ao **e-mail verificado da conta que efetuou a reserva**. O usuário não consegue substituir o destinatário por um endereço arbitrário apenas preenchendo o formulário.

O cancelamento solicita a remoção do evento da agenda e o envio de aviso de cancelamento. As entregas são processadas independentemente, com status, proteção contra duplicação e tentativas de repetição.

O worker `mva-booking-deliveries` já está publicado no Supabase e a execução agendada via `pg_cron` roda **uma vez por minuto**. O worker exige um segredo gerado no banco e não é acessível anonimamente, apesar de ter `verify_jwt=false`: ele recusa qualquer requisição sem a chave que a rotina interna envia; esta chave não deve ser compartilhada.

## 1. Configurar conta Google dos administradores

Crie uma agenda específica, por exemplo **Reservas MVA Coworking**, na conta corporativa que será responsável pelos agendamentos. Compartilhe-a com os outros administradores no Google Agenda com o nível de acesso necessário (recomendado: "Ver todos os detalhes dos eventos", ou gerenciar se também precisarem editar). Eventos deste sistema serão adicionados a essa agenda, sem usar as contas particulares dos clientes.

No Google Cloud Console, no projeto associado à conta que administrará a agenda:

1. Ative **Google Calendar API**.
2. Configure a tela de consentimento OAuth com a descrição e a política de privacidade da MVA.
3. Configure o escopo `https://www.googleapis.com/auth/calendar.events`.
4. Gere credenciais do tipo **OAuth Client ID** e autorize o administrador proprietário da agenda a solicitar **offline access**. Obtenha o `refresh_token` do consentimento com o mesmo cliente OAuth. Em modo de teste, o refresh token pode expirar rapidamente; para operação duradoura, use a configuração publicada/verificada do Google.
5. Copie o ID da agenda em **Google Agenda → Configurações → Integrar agenda → ID da agenda**. Caso o token seja do proprietário de uma conta cujo calendário principal será utilizado, `primary` também é aceito.

**A aplicação só consegue escrever na agenda se o refresh token pertencer a uma conta com permissão de gravação naquela agenda.**

No **Supabase → Edge Functions → Secrets**, configure:
- `GOOGLE_CALENDAR_ID` — ID da agenda compartilhada (ou `primary` com token da conta proprietária).
- `GOOGLE_OAUTH_CLIENT_ID` — ID do cliente OAuth da conta administrativa.
- `GOOGLE_OAUTH_CLIENT_SECRET` — segredo do mesmo cliente OAuth.
- `GOOGLE_OAUTH_REFRESH_TOKEN` — refresh token concedido após consentimento do administrador.

Não insira essas credenciais no código, GitHub ou nas variáveis `VITE_*` da Vercel. Não envie segredos em uma conversa.

## 2. Configurar envio de e-mail com Resend

1. Crie/acesse uma conta em https://resend.com.
2. Verifique um domínio de envio da MVA pelo DNS (SPF/DKIM de acordo com as instruções do Resend).
3. Crie uma chave de API restrita a envio.
4. No **Supabase → Edge Functions → Secrets**, configure:
   - `RESEND_API_KEY` — chave de API do Resend.
   - `BOOKING_EMAIL_FROM` — remetente no domínio verificado, por exemplo `MVA Coworking <reservas@seudominio.com.br>`.

O remetente de exemplo **não** deve ser usado sem domínio configurado. A implementação nunca diz que uma cobrança foi paga: apenas que o agendamento foi registrado.

## 3. Testes de ativação

Use uma conta de teste real (com e-mail verificado) para reservar uma sala disponível. Confirme:

1. Nova linha nas duas filas (email/calendar), após a reserva ser registrada.
2. Em até alguns minutos, ambas ficam com status `sent` e a agenda dos administradores recebe o evento, com data, sala e nome.
3. O e-mail chega à caixa do proprietário da reserva. Verifique caixa de spam e domínio remetente.
4. Cancele a mesma reserva e verifique remoção do evento e notificação de cancelamento.
5. Em falha de provedor, o job fica `pending` para nova tentativa ou `failed` após o limite de tentativas; **a reserva permanece no banco**.

Para visualizar somente contagens, sem dados pessoais:

```sql
select channel,status,count(*) from public.booking_delivery_jobs
group by channel,status order by channel,status;
```

Nenhuma reserva antiga foi migrada automaticamente à fila: isso evita disparar mensagens retroativas não solicitadas.

## 4. Segurança e limitações

- Tokens OAuth e chave de e-mail só existem em **Secrets** de Edge Functions; o frontend nunca os recebe.
- O segredo de webhook é gerado automaticamente e mantido em tabela RLS privada. O código da função verifica-o antes de processar a fila.
- Calendário é compartilhado **apenas com a equipe administrativa**; eventos podem conter dados pessoais, então não publicar o calendário na web.
- O envio ao endereço cadastrado/verificado impede que alguém use reservas para enviar mensagens arbitrárias a terceiros.
- E-mails e Google Agenda podem falhar por indisponibilidade externa. Verifique o status dos jobs e erros genéricos no Supabase. Reenvios usam um identificador estável para reduzir duplicação; não há garantia de entrega de 100%.
- Se não configurar o Google/Resend, os jobs ficarão **pendentes**, e nenhuma mensagem ou evento será enviado.
- O acesso opcional à Agenda pessoal do cliente (implementação anterior) é independente desta agenda administrativa.
- O Google precisa conceder o escopo correto e a conta que autorizou não pode revogar o consentimento sem renovar o `refresh_token`.

Documentação oficial:
- https://developers.google.com/workspace/calendar/api/guides/create-events
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://resend.com/docs/send-with-nodejs
- https://supabase.com/docs/guides/functions/schedule-functions
