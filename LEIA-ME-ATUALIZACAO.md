# MVA Coworking — atualização de design

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

Os testes visuais usaram respostas controladas e vazias do Supabase, sem criar contas, reservas ou contratos reais. Autenticação, gravação de dados, pagamentos e documentos oficiais não foram certificados por estes testes. As integrações e regras existentes do projeto foram preservadas. Para configurar o Supabase, consulte `SUPABASE_SETUP.md`.

O build mantém um aviso de tamanho do bundle principal, já presente na arquitetura do projeto; ele não impede a compilação.
