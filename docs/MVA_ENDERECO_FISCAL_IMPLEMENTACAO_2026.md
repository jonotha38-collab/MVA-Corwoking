# MVA Coworking — implantação do escritório virtual / endereço fiscal

## O que foi realmente implementado (30/10/2026)

- **Solicitação por empresa e CNPJ:** proprietário da empresa autentica, escolhe um dos planos existentes do catálogo MVA (`comercial`, `fiscal`, `fiscal_ie`), prazo de 1/12 meses, unidade credenciada e informa dados do responsável, atividade econômica/CNAE e origem de eventual transferência.
- **Revisão pela MVA:** equipe administrativa visualiza todos os pedidos, anota exigências e aprova/rejeita elegibilidade. A aprovação **não cria contrato ativo**, não concede licença e não habilita declaração.
- **Central de documentos:** o cliente envia PDF/JPG/PNG para storage privado `fiscal-private` (até 10 MB). Arquivos são guardados sob o ID da solicitação e só acessíveis pelo titular e pela equipe administrativa, através de URLs assinadas de curta duração.
- **Múltiplas empresas:** uma conta pode enviar várias solicitações, cada uma independente. Contratos antigos continuam preservados e visíveis.
- **Credenciamento de parceiros:** proprietário de coworking cadastrado propõe unidade; a MVA analisa e credencia. Somente depois da aprovação aparece como unidade elegível, respeitando pausa/manutenção do espaço vinculado.
- **Contratos/documentos:** painel administrativo acompanha contratos e vencimentos, com upload privado de documento assinado e registro explícito de validação, apenas quando contrato está ativo e pagamento REAL consta como confirmado.
- **Verificação de autenticidade:** documentos de autorização validados por administrador podem receber link `/?verify_fiscal=UUID`. O resultado é apenas verdadeiro/falso; a consulta não revela CNPJ, nome, CPF nem PDF.
- **Correspondências:** painel já existente mantém recebimento e solicitação de digitalização. A equipe pode anexar PDF privado e somente então marcar o serviço como digitalizado; o titular pode obter acesso assinado temporário.
- **Vigência:** cliente e administração veem dias restantes e alerta visual de vencimento próximo. Não se inventam renovações ou pagamentos.

## O que NÃO foi ativado e por quê

- **Cobrança real e renovação automática:** Stripe/Asaas/Resend, webhook, mandatos de cartão e serviço de contratos não foram autorizados/configurados neste projeto Supabase. A interface de pagamento existente NÃO é garantia de cobrança operacional. É obrigatório conectar provedor, configurar segredos, testar webhooks e vincular `fiscal_applications` com pedidos de pagamento antes de ativar; nenhuma coluna do banco deve ser alterada para `paid` pelo navegador.
- **Assinatura eletrônica com validade contratual:** o aceite de análise é registrado com versão e data; não substitui assinatura digital do contrato. Precisará de fornecedor de assinatura e cláusulas revisadas.
- **QR renderizado no documento:** há código/link de validação funcional; a inserção de QR na via PDF assinada deve ser feita no gerador final de documentos, ainda pendente de contratação e validação jurídica.
- **Notificações de renovação por e-mail/WhatsApp:** o alerta no painel está implementado. Envio externo depende de provedor de mensagens, consentimento e política de privacidade.
- **Liberação da Redesim/Prefeitura:** não se automatizou. A elegibilidade da atividade e do endereço depende da análise municipal, por isso a declaração não pode ser tratada como garantia de alvará.
- **Autorização de terceiros para retirada:** formulário antigo de orientação não efetiva autorização legal nem envia autorização ao sistema. Registrar e aprovar representantes demandará módulo de autorização documental.

## Acesso e segurança

- Tabelas novas `fiscal_applications`, `fiscal_provider_requests`, `fiscal_units`, `fiscal_private_documents` usam RLS.
- Clientes veem só seus dados; administradores autenticados (via `public.is_admin()`) veem solicitações para revisão.
- Bucket `fiscal-private` é privado com MIME e tamanho limitados, políticas de caminho e leitura por titular.
- Funções de verificação pública jamais retornam dados pessoais ou conteúdo de documentos.
- Dados de pagamento antigos não foram sobrescritos; colunas extras recebem default `unpaid` / `false`.
- **O teste de build não substitui testes reais** com perfis distintos: cliente A, cliente B, proprietário de espaço, administrador e anônimo.

## Percurso de teste

1. Abrir a seção Endereço Fiscal e fazer login como cliente de teste.
2. Submeter pedido de análise com dados não sensíveis de teste. Verificar em `fiscal_applications` que status é `submitted`.
3. Enviar PDF de teste. Abrir arquivo com URL assinada; confirmar que o bucket não retorna URL pública e cliente B não enxerga arquivo.
4. Administrador acessa Painel administrativo → Gestão do endereço fiscal, revisa e aprova.
5. Cliente vê status aprovado, mas **nenhuma declaração é liberada sem contrato/serviço de pagamento verificado**.
6. Proprietário parceiro solicita credenciamento de um espaço; administrador aprova e valida nova unidade.
7. Pausar espaço do parceiro e conferir que a unidade deixa de ser listada publicamente.
8. Verificação de código aleatório retorna 'não verificado'. Código válido só é publicado após contratação e validação real.
9. Em correspondências, administrador anexa PDF; cliente abre pelo link seguro e confirma dados corretos.

## Dependências operacionais

- Responsável da MVA deve fornecer contratos, termos e política de privacidade revisados por jurídico/contabilidade.
- Definir aceitação de atividades por unidade (CNAEs, exigências locais, licenças).
- Configurar fornecedor de assinatura, cobrança recorrente e e-mails oficiais.
- Definir rotina de retenção de documentos, auditoria de acessos, backups e recuperação.

Referências:
- https://www.gov.br/empresas-e-negocios/pt-br/redesim/ajuda/viabilidade
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/database/postgres/row-level-security
