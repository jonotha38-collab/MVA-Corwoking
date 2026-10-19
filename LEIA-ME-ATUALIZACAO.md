# MVA Coworking — design, pagamento e declaração

## Períodos e correção de temas

O checkout inclui a escolha de 1 ou 12 meses, resumo atualizado e desconto de 4 meses somente na transferência anual. O período é validado no servidor e determina o vencimento do contrato. Aplique também a nova migração `20261019201910_fiscal_term_months.sql` e publique as funções atualizadas conforme **PAGAMENTOS-E-DECLARACAO.md**. Nenhuma alteração foi executada no banco remoto.

Os temas agora usam uma paleta central para fundos, cartões, campos, gradientes, bordas, mensagens e autofill, corrigindo superfícies claras e contraste no modo escuro.

## Cartão visual animado

O checkout agora inclui um cartão ilustrado com Motion: nome do titular, bandeira recebida da Stripe, troca animada e frente/verso. O visual acompanha os temas claro e escuro e os três idiomas. Sem a Stripe configurada, há exemplos identificados de Visa, Mastercard e Amex.

Número, validade e código de segurança permanecem mascarados na ilustração. Os dados de cartão continuam restritos aos campos seguros do provedor. Os testes locais cobriram troca e limpeza de bandeiras, carregamento, múltiplas bandeiras, tipos desconhecidos, nome do titular, frente/verso e preferência de movimento reduzido, usando eventos controlados; nenhuma cobrança real foi realizada.

## Atualização de 19/10/2026

O checkout e a emissão de declaração foram refeitos. Consulte **PAGAMENTOS-E-DECLARACAO.md** para configurar a Stripe, aplicar a migração e ativar o fluxo. Sem essas configurações não há cobrança nem liberação oficial. O cliente escolhe 1 mês ou 12 meses, com pagamento único à vista no cartão. Na transferência de endereço, o plano de 12 meses cobra 8 mensalidades e mantém 12 meses de vigência. O plano de 1 mês não recebe o desconto.

Testes adicionais: regras de acesso e preços; transações, idempotência e bloqueios no PostgreSQL via PGlite; checkout em 18 combinações de idioma, tema e largura; recusa, pendência, teste e download com respostas controladas. Nenhuma cobrança real foi realizada.

## Executar

Use Node.js 22.12+ ou uma versão LTS mais recente.

```bash
npm ci
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

A pasta `dist` já contém a versão compilada. Publique seu conteúdo em uma hospedagem de sites estáticos. Não abra o index.html por duplo clique: o projeto requer um servidor HTTP.

## O que mudou

- Identidade visual azul-marinho e cobre/laranja, tipografia, espaçamentos, bordas e cartões refinados.
- Tema claro e escuro selecionável no cabeçalho; na primeira visita acompanha a preferência do sistema. A escolha é salva no navegador.
- Português, inglês e espanhol, com seletor visível em desktop e celular. A seleção também é persistida.
- Catálogo de traduções em `src/lib/translations.json`; textos traduzidos na camada de apresentação, sem alterar identificadores de banco, formulários ou dados enviados.
- Nomes próprios, endereços e dados enviados por clientes mantêm seu conteúdo original. Os preços continuam em reais, sem conversão de moeda.
- Spell UI (BlurReveal), Motion, Tailwind e Lucide já presentes foram aproveitados, sem adicionar dependências de interface.
- Movimentos discretos, foco visível e suporte à preferência de movimento reduzido.
- Arquivos-fonte, recursos visuais e versão compilada incluídos; `node_modules` omitido para instalação limpa no sistema do usuário.

## Validação realizada

- TypeScript: `tsc -b` aprovado.
- Build Vite de produção: aprovado.
- Chromium: 24 combinações de 3 idiomas × 2 temas × 4 larguras (360, 768, 1280 e 1440 px), sem transbordamento horizontal.
- Preferências persistidas após recarregar, navegação ao marketplace, busca vazia, expansão de FAQ e abertura/fechamento do cadastro verificados.
- Nenhum erro JavaScript nos fluxos testados.

Os testes visuais usaram respostas controladas e vazias do Supabase, sem criar contas, reservas ou contratos reais. As integrações reais de autenticação e pagamento não foram certificadas pelos testes locais. As integrações e regras existentes do projeto foram preservadas. Para configurar o Supabase, consulte `SUPABASE_SETUP.md`.

O build mantém um aviso de tamanho do bundle principal, já presente na arquitetura do projeto; ele não impede a compilação.
