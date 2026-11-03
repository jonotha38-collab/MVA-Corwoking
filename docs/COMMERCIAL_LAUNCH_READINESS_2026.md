# MVA Coworking — checklist de lançamento comercial
Atualizado: 03/11/2026

## Alterações implementadas no código

- Nova home com três entradas: **reservar salas**, **endereço fiscal** e **anunciar coworking**. Comunicação orientada ao cliente, responsiva e com textos principais disponíveis em PT/EN/ES.
- Menu desktop e mobile adaptados e seção Início; os cartões usam estados claros/escuros.
- Marketplace com ordenação por preço ou capacidade, sem estrelas ou avaliações não verificáveis (ainda não existe tabela de reviews confirmados).
- URLs compartilháveis por espaço, padrão `/?page=marketplace&space=<UUID>`. Apenas anúncios públicos aprovados aparecem por esses links.
- Valor total das reservas identificado como **não pago online**. Reservas e pagamentos não são a mesma coisa.
- Endereço fiscal mantém a apresentação dos planos e a janela de contratação; como o provedor de pagamentos real ainda não está operacional, a janela não solicita dados de cartão nem simula cobrança. A ativação do checkout exige `VITE_FISCAL_PAYMENTS_ENABLED=true`, chave publicável e **funções de pagamento, webhook e banco implementados e verificados**. Não configure a flag antes.
- Rodapé sem alegações de homologação nacional e atendimento 24/7 não confirmado. Telefone e e-mail clicáveis. WhatsApp só aparece quando `VITE_MVA_WHATSAPP_NUMBER` recebe número oficial **confirmado** no formato internacional (55 + DDD + telefone).
- Textos jurídicos corrigidos: uso de endereço fiscal condicionado a viabilidade, documentação, contrato e pagamento real. Alertas externos não prometidos enquanto pausados.
- Metadados de serviços distintos, links públicos por seção, Open Graph/Twitter, sitemap e robots. Serviços públicos carregados apenas quando abertos para melhorar o carregamento inicial.
- Integrações Google Agenda/e-mail **permanecem pausadas** no Supabase e na interface. Não reativar sem nova autorização.
- GitHub Actions executa `npm ci` e `npm run build` a cada atualização da branch principal/branch de trabalho e em PRs.

## Pendências obrigatórias antes de cobrar clientes

1. **Gateway financeiro:** escolher fornecedor (Stripe, Asaas ou outro), contratar e verificar conta, e integrar backend de pagamento com webhooks autenticados, idempotência e testes de reembolso/estorno. O aplicativo atual não possui checkout financeiro operacional para reservas nem endereço fiscal; assinatura recorrente de proprietários também não está implementada. Não habilitar `VITE_FISCAL_PAYMENTS_ENABLED` apenas com chave publicável.
2. **Regras comerciais:** definir se a reserva pode ocorrer sem pré-pagamento, quanto tempo é bloqueado o horário, regras de cancelamento, no-show, repasse aos coworkings, emissão fiscal e suporte.
3. **Contato:** conferir número de telefone, e-mail e **número oficial de WhatsApp**. Só então adicionar `VITE_MVA_WHATSAPP_NUMBER` às variáveis de ambiente da Vercel e publicar. O número exibido atualmente como telefone não foi validado como WhatsApp Business.
4. **Domínio próprio:** obter e configurar domínio da MVA, adequar URLs canônicas, OAuth, SMTP e links do sitemap ao domínio oficial. URLs .vercel.app são provisórias.
5. **Segurança Supabase:** a ferramenta de advisors ainda sinaliza `auth_leaked_password_protection` como WARN. Habilitar na área Authentication/Attack Protection do Supabase quando o plano permitir. Avaliar os avisos de funções SECURITY DEFINER: algumas são intencionalmente acessíveis para consultas autorizadas; não revogar sem revisar dependências e RLS. Ver https://supabase.com/docs/guides/auth/password-security
6. **LGPD/contratos:** revisão jurídica dos termos, política de privacidade, SLA de correspondências e cláusulas de endereço fiscal. Viabilidade municipal/CNAE deve ser comprovada; o site não garante alvará.
7. **Avaliações:** implementar tabela de reviews ligada à reserva efetivamente concluída, moderada e transparente, antes de reintroduzir estrelas ou ordenação por nota.

## QA de lançamento (ainda não realizado integralmente)

- Telas: 320, 360, 390, 768, 1024, 1366 e 1920 pixels; zoom do navegador 200% e tema claro/escuro.
- Navegar: início → anúncio → detalhes → reservar → comprovante → histórico; endereço fiscal → plano mensal/anual → resumo do checkout; proprietário → cadastro → aprovação administrativa; correspondências → PDF seguro.
- Testar perfis: visitante, cliente A, cliente B, proprietário, estagiário autorizado e administrador.
- Validar teclado, foco visível, contraste, leitor de tela, mensagens de erro, redirecionamento e mobile, além do compartilhamento de links.
- Validar server-side: conflito de horário, preço recalculado no banco, autorização de cancelamento/check-in, RLS, documento privado, não emissão fiscal sem pagamento real.
- Verificar link de telefone e e-mail reais; confirmar que nenhuma reserva dispara automaticamente e-mail/Google enquanto a flag permanece desligada.
- Usar navegador real e screenshots: a compilação de TypeScript/Vite e o HTTP 200 não são equivalentes à revisão visual completa.

## O que este release não representa

Não é certificação de segurança, nem validação completa de acessibilidade WCAG, nem homologação municipal/estadual, nem aprovação de transações financeiras. SEO de uma aplicação SPA com URL de consulta é uma melhoria incremental: antes de escalar mídia paga, considere páginas estáticas ou renderizadas no servidor para serviços e anúncios.

## Referências

- Site atual: https://coworking-mva-du8c.vercel.app/
- Painel Supabase: https://supabase.com/dashboard/project/yealdaokedpfpdgvslzj
- Senhas vazadas: https://supabase.com/docs/guides/auth/password-security
