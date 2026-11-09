# MVA Coworking — salas internas e anúncios desabilitados

O código já inclui uma área chamada **Salas dos estagiários**, integrada ao Supabase, e o botão **Desabilitar / Habilitar** no painel do dono do espaço.

## 1. Atualizar o banco

1. Faça um backup do banco. No **Supabase → SQL Editor → New query**, abra [`supabase/SQL_ESTAGIARIOS_E_VISIBILIDADE.sql`](supabase/SQL_ESTAGIARIOS_E_VISIBILIDADE.sql), cole o conteúdo e clique em **Run**.
2. O comando preserva os anúncios e reservas existentes. Ele **não deleta espaços**, cria as tabelas necessárias e ajusta as políticas de segurança.
3. Se estiver criando um banco vazio, instale **primeiro** o esquema usado por esta versão do app (`supabase/schema.sql`) e **depois** o SQL adicional. **Não** misture com `supabase/migrations/000000_init.sql` — essa migração antiga define nomes de colunas diferentes e não é compatível com as telas atuais.
4. Se futuramente executar `supabase/schema.sql` de novo, execute o SQL adicional outra vez para preservar as políticas atualizadas.

O script SQL foi desenvolvido para ser reexecutável, mas qualquer produção deve passar primeiro por um ambiente de homologação.

## 2. Criar a lista de e-mails autorizados

No **SQL Editor**, execute substituindo pelos e-mails reais das pessoas autorizadas:

```sql
insert into public.intern_allowed_emails (email, active)
values
  ('estagiario1@empresa.com.br', true),
  ('estagiario2@empresa.com.br', true)
on conflict (email) do update set active = excluded.active;
```

Use sempre e-mails em letras minúsculas. O acesso só é liberado quando a pessoa estiver autenticada com **esse e-mail verificado** no Supabase Auth.

Para remover o acesso de alguém sem apagar o histórico de reservas:

```sql
update public.intern_allowed_emails
set active = false
where email = 'estagiario1@empresa.com.br';
```

Para consultar quem tem acesso:

```sql
select email, active, created_at
from public.intern_allowed_emails
order by email;
```

## 3. Configurar as duas salas

O sistema cria **Sala de Trabalho 1** e **Sala de Trabalho 2** com **1 vaga cada**, por padrão. Ajuste os nomes e quantidades às condições reais:

```sql
update public.intern_rooms
set name = 'Sala de Estágio A', capacity = 5,
    description = 'Sala para trabalho supervisionado.'
where code = 'sala-1';

update public.intern_rooms
set name = 'Sala de Estágio B', capacity = 4,
    description = 'Sala para trabalho individual ou em equipe.'
where code = 'sala-2';
```

Para pausar uma das salas internas:

```sql
update public.intern_rooms set active = false where code = 'sala-2';
```

Os estagiários escolhem **uma sala por dia de trabalho**, respeitando a quantidade de vagas. Eles podem cancelar e escolher novamente, desde que exista vaga. **Não existe cobrança, checkout nem mensalidade** nessa área — trata-se de **reserva interna de posição de trabalho**.

## 4. O que aparece para cada pessoa

- **E-mail autorizado:** aparece uma nova aba **Salas dos estagiários** no menu, inclusive no celular. A pessoa escolhe a data, vê a quantidade disponível e confirma ou cancela a própria reserva.
- **Cliente comum ou visitante:** não aparece a nova aba; o banco bloqueia consultas e inserções de reservas internas, mesmo com manipulação do navegador.
- **Anunciante:** em **Anunciar espaço → Seus Espaços Cadastrados**, o botão **Desabilitar** retira imediatamente o anúncio do marketplace, mas preserva os dados, aprovações e reservas já feitas. **Habilitar** o faz voltar a aparecer, se estiver aprovado.
- **Equipe MVA:** continua podendo analisar anúncios ocultos pelo painel administrativo. Administradores têm permissão de consulta às salas internas para suporte.

Se uma pessoa já possui uma reserva comercial de um espaço que foi desabilitado, ela continua encontrando a reserva em **Minhas reservas**. O sistema não cancela automaticamente reservas existentes.

## 5. Segurança e validação

- Permissões validadas no servidor pelo **Supabase Auth** e pelas políticas **Row Level Security (RLS)**.
- Os e-mails autorizados não são listados para outros estagiários.
- As salas internas nunca são cadastradas na tabela pública de anúncios do marketplace.
- O banco impede **duas reservas ativas do mesmo estagiário na mesma data** e impede ultrapassar a lotação, inclusive em tentativas simultâneas.
- Um dono não pode modificar a aprovação de um anúncio para se autoconceder acesso: alterações de conteúdo voltam para análise da MVA.

## 6. Executar e testar

```bash
npm ci
npm run build
npm run test:intern
```

Para o frontend, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no arquivo `.env` de acordo com `.env.example`. Não insira chaves administrativas / `service_role` no frontend.

**Importante:** o ZIP recebido contém dependências nativas instaladas no Windows. Para construir em Linux, reinstale as dependências com `npm ci` no próprio Linux; não use a pasta `node_modules` trazida no arquivo original. O pacote entregue aqui não inclui `node_modules` nem `dist`.
