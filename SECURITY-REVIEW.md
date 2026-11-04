# Revisao de Seguranca

Data: 2026-11-04

## Resumo executivo

A aplicacao possui uma protecao nominal da area de curadoria, mas o controle de acesso atual nao e seguro. A interface apresenta autenticacao Google e Magic Link, embora esses fluxos estejam simulados localmente. Nao foram identificadas vulnerabilidades criticas ou altas no escopo revisado; existem dois riscos medios que exigem correcao antes da publicacao.

## Achados

| # | Severidade | Arquivo | Linhas | Vulnerabilidade | Confianca |
|---|------------|---------|--------|-----------------|-----------|
| 1 | MEDIUM | server.js | 20-47 | Controle de acesso quebrado: qualquer cliente pode definir ou inventar o cookie mca_developer_session=1; a sessao nao e assinada nem persistida. | 10/10 |
| 2 | MEDIUM | js/sync.js, js/ui.js | sync.js:14-15, 52-87; ui.js:1044-1069 | Autenticacao simulada: identidade Google/Magic Link pode ser criada e alterada integralmente pelo navegador sem prova de posse. | 9/10 |

## Evidencias

### 1. Controle de acesso da curadoria

- isDeveloperRequest() considera mca_developer_session=1 valido sem sessao server-side, assinatura ou nonce.
- O cookie emitido nao possui Secure, Max-Age ou Expires.
- A cookie HttpOnly protege contra leitura por scripts, mas nao impede que um navegador envie deliberadamente um cookie definido manualmente.
- A funcao de login da curadoria aceita apenas um token compartilhado via Authorization ou cria o cookie nao autenticado.

### 2. Autenticacao Google/Magic Link simulada

- Supabase URL e chave anonima nao estao configurados.
- Google OAuth real nao ocorre no fluxo standalone; o sistema cria um usuario ficticio em localStorage.
- Magic Link confirma apenas o email informado e ativa uma identidade local.
- E-mail, nome, avatar, perfil e estado de login podem ser modificados pelo usuario.

## Riscos adicionais

- Servidor HTTP local sem TLS por padrao; publicar diretamente sem HTTPS exponeria credenciais e cookies.
- CSP principal depende de meta tag, sem CSP, HSTS ou outros headers reforcados no servidor.
- Google Sheets e URLs do Google Drive sao entradas externas remotas, apesar de validacao e sanitizacao em runtime.
- Telemetria, passaporte, notas, perfil e buscas sao armazenados localmente sem politica de retencao ou limpeza.
- Dashboard usa dados simulados misturados com metricas reais, podendo induzir a curadoria a interpretar numeros demonstrativos como estatisticas reais.
- Ausencia de README, .env.example, CI/CD, secret scanning e gates SAST/dependencias.

## Vulnerabilidades nao confirmadas

- npm audit --omit=dev reportou zero vulnerabilidades de producao na data da revisao.
- Nao foram encontrados TODOs vazios em codigo da aplicacao, memoria nao gerenciada ou concorrencia multi-thread insegura.
- watchPosition nao possui armazenamento de ID ou cancelamento no ciclo de vida da pagina. O impacto e baixo para navegacao comum, mas deve haver cleanup se a aplicacao virar SPA.
