# MVA Coworking — revisão de segurança em 26/10/2026

## Escopo e limites

Auditoria de código-fonte, configurações de hospedagem, esquemas SQL, privilégios, políticas RLS, Supabase Security Advisor, objetos de Storage, funções Edge e fluxos principais. **Não é um pentest externo completo, certificação LGPD/PCI DSS, nem garantia de ausência de falhas.** Não foram copiados dados pessoais nem feitas consultas de conteúdo de clientes além de metadados/contagens agregadas. Atualizações de esquema foram não destrutivas.

## Correções aplicadas ao banco de dados de produção

Migração versionada: `supabase/migrations/20261026105600_customer_data_hardening.sql`.

1. **Alto — reservas:** antes era possível enviar `total_price`, duração e dados do espaço diretamente do navegador. O trigger `secure_booking_insert` agora obtém o preço do cadastro, recalcula duração, permite apenas o adicional reconhecido e valida data, estado e propriedade.
2. **Alto — integridade de reservas:** trigger `secure_booking_update` impede alterações em valores e dados após criação. Cliente pode cancelar a própria reserva; check-in fica restrito a MVA/proprietário autorizado.
3. **Alto — contratos fiscais:** clientes deixaram de ter política permissiva para inserir contratos; apenas administradores autenticados e o serviço confiável podem inseri-los.
4. **Alto — correspondências:** trigger `secure_correspondence_update` permite a clientes exclusivamente solicitar digitalização; apenas funcionários autorizados podem mudar estado, dados de entrega ou documento.
5. **Médio — RPCs privilegiadas:** `handle_new_user` não pode mais ser invocada anonimamente ou por cliente via API; `is_admin` e `is_intern_authorized` não podem ser invocadas anonimamente. As consultas públicas de espaços não exigem chamadas de privilégios.
6. **Médio — funções SQL:** `search_path` fixo em funções sensíveis, evitando resolução de nomes a partir de caminhos mutáveis.
7. **Médio — dados públicos:** anúncios públicos incluem apenas espaços aprovados e disponíveis; proprietário e administração preservam acesso aos respectivos anúncios ocultos.

## Mudanças no frontend e na hospedagem

- Solicitação de digitalização não marca documento como já digitalizado; o cliente acompanha o pedido.
- Removido nome fictício como preenchimento padrão das reservas.
- `vercel.json` configura defesa contra clickjacking, `nosniff`, referrer policy, política limitada de permissões, CSP restrita e HSTS.
- Nenhuma chave `service_role` ou segredo de Stripe foi adicionado ao JavaScript do cliente.

## Controles revisados e mantidos

- As oito tabelas `public` verificadas usam Row Level Security.
- `storage.space-photos` é público por finalidade (fotos de anúncios), com limite de 5 MB e MIME limitado a imagens JPEG/PNG/WebP; **nunca** guardar documentos pessoais nesse bucket.
- Funções de pagamento do repositório validam pagamento no Stripe pelo backend e não devem confiar no status enviado por clientes; porém, no momento da auditoria, **nenhuma Edge Function estava implantada nesse projeto Supabase**.
- Reservas internas possuem controle de capacidade por transação, política de acesso e restrição a estagiários autorizados.

## Pendências e riscos residuais

1. **Proteção de senhas vazadas: pendente.** O Security Advisor indica que o bloqueio de senhas comprometidas está desativado. Administrador deve ativá-lo nas configurações do provedor Email do Supabase (recurso sujeito a plano). Reforçar o comprimento mínimo e configurar MFA para administradores.
2. **RPCs `SECURITY DEFINER`: requer manutenção/monitoramento.** `is_admin`, `is_intern_authorized` e `get_intern_room_availability` continuam acessíveis por usuários autenticados por necessidade do desenho atual; possuem verificações internas. A eventual migração para esquema privado exige desenho adicional.
3. **Extensão `btree_gist` em `public`: pendente de avaliação controlada.** Está associada a restrições de sobreposição de horários; não mover sem avaliar as dependências e testar a exclusão de reservas simultâneas.
4. **Pagamentos reais: pendentes de implantação dos serviços de backend.** Não disponibilizar checkout como operacional até configurar Stripe, Webhook, Edge Functions e migrações de pagamento no Supabase, mais testes de estorno/fraude.
5. **Documentos de correspondência:** criar armazenamento privado com URLs assinadas e política de acesso por empresa antes de permitir upload/download de documentos confidenciais; nunca usar o bucket público de fotos.
6. **Operação e LGPD:** revisar retenção e exclusão legal de dados, transparência sobre tratamento, gestão de incidentes, backup/recuperação e inventário de suboperadores.
7. **Testes complementares:** validar autenticação por perfis reais (cliente, proprietário, administrador), testes ponta a ponta e auditoria externa independente. O build de produção não substitui esses testes.

## Links oficiais

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Password Security: https://supabase.com/docs/guides/auth/password-security
- Supabase Linter: https://supabase.com/docs/guides/database/database-linter
- Vercel deployment security: https://vercel.com/docs/deployment-protection

## Critério de conclusão

Confirmar RLS, privilégios de `EXECUTE`, triggers e advisors após migração; obter build READY na Vercel; conferir o domínio principal, monitorar falhas e repetir testes com contas reais. A segurança requer manutenção contínua.
