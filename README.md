# MVA Coworking Hub

Aplicação React + TypeScript + Vite para espaços de coworking, endereço fiscal,
reservas e correspondências. Mantém a identidade azul e laranja da MVA.

## Executar

Requer Node.js 22.12+ (ou 24 LTS) e npm.

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. Para conferir a versão de produção:

```bash
npm run build
npm run preview
```

`npm run lint` verifica o código da aplicação. `dist/` contém a versão compilada;
utilize um servidor HTTP para acessá-la, em vez de abrir o HTML diretamente.

## Integração

Veja `SUPABASE_SETUP.md` para configurar autenticação, banco e armazenamento.
A revisão visual não altera regras de autenticação, reservas ou contratos.

## Revisão visual

- Tipografia Inter, títulos com pesos consistentes e hierarquia mais legível.
- Azul escuro institucional, laranja como destaque e botões sólidos com maior contraste.
- Menos sombras decorativas; cartões, formulários e seções com acabamento consistente.
- Navegação adaptada a celular, tablet e desktop, sem excesso de itens no cabeçalho.
- Blur Reveal do registro oficial Spell UI nos títulos; entradas curtas nas seções e cartões.
- Preferência de movimento reduzido respeitada e texto de orientação dos formulários imediato.
- Campos com associação entre label e input; fotos e nomes das salas acessíveis por teclado.
- Painéis internos carregados sob demanda e lint limitado ao código do projeto.

A origem e a licença do componente Spell UI estão em `THIRD_PARTY_NOTICES.md`.

## Validação desta revisão

TypeScript, build de produção e lint. Revisão em Chromium das páginas públicas
em 1440, 1024, 768, 390 e 320 px, além de busca, filtros, estado vazio, detalhes
de sala, formulário de conta, visibilidade da senha e movimento reduzido.

Os testes de interface usam respostas locais simuladas do banco. Login real,
pagamentos e gravação de reservas/contratos no Supabase não foram validados.
O build informa um aviso de tamanho do bundle principal; isso não impede a compilação.

## Salas internas e visibilidade dos anúncios

Para configurar a lista de e-mails autorizados, as duas salas de estágio e o botão Desabilitar/Habilitar no marketplace, consulte [CONFIGURACAO_SALAS_E_VISIBILIDADE.md](CONFIGURACAO_SALAS_E_VISIBILIDADE.md). Execute o script SQL adicional antes de publicar esta versão.
