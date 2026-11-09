# MVA Coworking — versão revisada (26/10/2026)

## Mudanças entregues
- Área de duas salas internas, restrita a contas com e-mail validado e autorizado no Supabase.
- Reserva e cancelamento por dia, com ocupação, vagas e bloqueio de simultaneidade.
- Proprietário pode desabilitar e reativar um anúncio sem excluí-lo.
- Espaços ocultos não aparecem na listagem pública; proprietário e administrador continuam podendo consultá-los.
- Interface simplificada: títulos sem animação letra a letra, cartões mais sóbrios, feedback de reserva sem confete, indicadores de ocupação e bordas/sombras padronizadas.

## O que já foi confirmado no Supabase
- Tabelas intern_rooms, intern_allowed_emails e intern_room_reservations presentes.
- 2 salas cadastradas, 3 políticas RLS de reservas e status `hidden` aceito em spaces.
- **Nenhum e-mail autorizado cadastrado ainda**. Execute no SQL Editor, substituindo pelos e-mails reais:

```sql
insert into public.intern_allowed_emails(email, active)
values ('estagiario@empresa.com.br', true)
on conflict (email) do update set active=excluded.active;
```

- Para alterar capacidade por sala:
```sql
update public.intern_rooms set capacity = 4 where code = 'sala-1';
update public.intern_rooms set capacity = 4 where code = 'sala-2';
```

## Publicação
O projeto da Vercel é `coworking-mva-du8c` na equipe `jonathan-nunes-vasconcelos-projects`. O acesso à equipe requer autorização do usuário antes de publicar. Não confunda `MVA-Corwoking` (repositório completo) com `MVA-Coworking` (template vazio).

1. Incorporar arquivos desta versão ao repositório `jonotha38-collab/MVA-Corwoking` em commit revisado.
2. Confirmar o projeto Git associado no painel da Vercel e publicar em preview.
3. Validar login como estagiário autorizado, reserva, cancelamento, e como dono habilitar/desabilitar espaço; testar também uma sessão pública anônima.
4. Promover preview para produção somente depois de validar.

Não adicionar chaves de serviço do Supabase no frontend.
