# Configuração do Supabase (faça uma vez)

## 1. Criar as tabelas
1. Abra o projeto no Supabase → **SQL Editor** → **New query**.
2. Se você rodou o arquivo antigo `000000_init.sql`, rode antes apenas isto para limpar:
   ```sql
   drop table if exists public.bookings, public.correspondences, public.correspondence, public.fiscal_contracts, public.spaces, public.profiles cascade;
   drop type if exists account_type, space_category, space_status, fiscal_contract_status, correspondence_status cascade;
   ```
3. Cole **todo** o conteúdo de `supabase/schema.sql` e clique em **Run**. Deve aparecer "Success".

## 2. Login com Google
1. Supabase → **Authentication → Providers → Google** → ative e cole o *Client ID* e o *Client Secret* do Google Cloud.
2. No Google Cloud Console (Credenciais → ID do cliente OAuth → Aplicativo da Web), em **URIs de redirecionamento autorizados**, cole o endereço que o Supabase mostra na tela do provedor Google. Ele tem este formato:
   `https://yealdaokedpfpdgvslzj.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** o endereço do seu site no Vercel (ex.: `https://seu-projeto.vercel.app`)
   - **Redirect URLs:** adicione o mesmo endereço e `http://localhost:5173`

## 3. E-mail e senha
Supabase → **Authentication → Providers → Email**. Por padrão, quem cria conta recebe um e-mail de confirmação. Para testar sem confirmar, desative **Confirm email**.

## 4. Tornar-se administrador
Crie sua conta no site e depois rode no SQL Editor (troque pelo seu e-mail):
```sql
update public.profiles set is_admin = true where email = 'seuemail@gmail.com';
```
Saia e entre de novo no site. A barra "Painel administrativo MVA" aparece.

## 5. Fotos
O bucket `space-photos` é criado pelo `schema.sql`. Confira em **Storage**.
