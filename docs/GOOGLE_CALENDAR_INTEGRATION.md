# MVA Coworking — Google Agenda (outubro/2026)

## Fluxo de uso
1. Usuário faz login com Google e entra em **Reservas → Conectar Google Agenda**, ou confirma uma reserva no marketplace e clica em **Conectar e salvar automaticamente**.
2. O navegador é encaminhado ao **consentimento oficial do Google**, pedindo escopo de escrita de eventos `https://www.googleapis.com/auth/calendar.events`. Não é necessário nem permitido pedir a senha do usuário dentro do MVA.
3. No retorno, a aplicação verifica que o usuário/e-mail escolhido corresponde à conta MVA que iniciou a autorização. Se for a mesma, cria o(s) evento(s) futuros.
4. As reservas posteriores são sincronizadas automaticamente **enquanto houver token do Google válido e a preferência de sincronização estiver ligada**. IDs de evento determinísticos impedem duplicatas mesmo após tentativas repetidas.
5. Um evento criado via API tem notificação do Google Agenda com **popup 30 minutos antes** e **e-mail 60 minutos antes**. A entrega depende das configurações da conta Google, sistema e dispositivo.
6. Há opção manual **Adicionar ao Google Agenda**, disponível também para contas MVA com login por e-mail. A criação manual exige que o usuário confirme o evento no Google, e lembretes dependem das preferências do usuário.
7. O painel **Minhas reservas** exibe um aviso de proximidade até 60 minutos antes da reserva, somente enquanto estiver aberto.
8. Ao cancelar uma reserva, o site tenta remover seu evento da Agenda com a autorização vigente; se o token estiver expirado, avisa que o usuário também deve removê-lo no Google.

## Configuração necessária no Google Cloud / Supabase

Este repositório configura o pedido de escopo dinamicamente, mas **o funcionamento real depende de configuração pelo proprietário da aplicação OAuth**:

- Abrir o projeto Google Cloud associado ao login Google do Supabase.
- Habilitar **Google Calendar API** na biblioteca de APIs.
- Em **Google Auth Platform → Data Access / Scopes**, incluir `https://www.googleapis.com/auth/calendar.events` e revisar a política de privacidade e tela de consentimento.
- Se a aplicação está em modo Testing, incluir e-mails dos usuários de teste; para acesso público, verificar os requisitos de publicação/validação do OAuth. O novo escopo pode exigir verificação da aplicação pelo Google.
- Manter o redirecionamento do Supabase (normalmente `https://<project-ref>.supabase.co/auth/v1/callback`) no Google Cloud, e o domínio do site permitido em **Supabase → Authentication → URL Configuration**.
- Criar uma reserva de teste não sensível com uma conta de teste e confirmar se o evento aparece na Agenda correta e mostra os lembretes.

## Limitação de consentimento / segurança

- O site não persiste tokens OAuth em um banco próprio, não coleta senhas Google nem armazena refresh tokens em tabelas públicas.
- O token `provider_token` retornado na sessão de login Google pelo Supabase é usado diretamente pelo navegador para criar o evento via API Google; quando expirar, a conexão deverá ser renovada pelo usuário.
- Assim, **sincronização ininterrupta por meses / reconciliação de cancelamentos offline** exigiria backend seguro com refresh token armazenado criptografado e expiração/revogação tratadas. Essa função ainda **não está instalada**.
- O botão **Desativar** impede novas tentativas de sincronização automática pelo MVA no navegador atual, mas revogar o acesso OAuth concedido ao app também deve ser feito em https://myaccount.google.com/permissions.
- Nenhum novo acesso ao Google é necessário para usar as reservas MVA.
- Fuso de horário dos horários comerciais: `America/Maceio` (UTC−03); uma reserva que só tem a data, sem horário definido, não gera aviso de proximidade.

## Verificações recomendadas

- A conta que autoriza deve ser a mesma que fez a reserva (ou o sistema deve alertar e não exportar).
- Repetir o botão não pode criar eventos duplicados.
- Sem consentimento ou com erro do Google, a reserva MVA deve permanecer confirmada.
- Testar cancelamento com autorização válida e expirada.
- Confirmar a entrega das notificações com as configurações reais da conta e do dispositivo.
- Usar o Google Agenda em um navegador sem login Google para validar a alternativa manual.

Referências oficiais:
- https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- https://developers.google.com/workspace/calendar/api/guides/create-events
- https://developers.google.com/workspace/calendar/api/concepts/reminders
