# Aviso de Privacidade e Proteção de Dados Pessoais
### *Recife: Museu a Céu Aberto (MCA)*

**Última Atualização:** Novembro de 2026  
**Versão:** 2.0 (Conformidade com a LGPD e GDPR)  
**Curadoria e Pesquisa:** Tales Pedrosa — Historiador & Pesquisador

---

## 1. Apresentação e Compromisso Ético

O projeto **Recife: Museu a Céu Aberto** é uma plataforma cívico-cultural e educativa de cartografia histórica digital interativa, concebida para democratizar o acesso à memória, à arquitetura e ao patrimônio material e imaterial da cidade do Recife (Pernambuco, Brasil).

Este **Aviso de Privacidade** tem como finalidade informar, com total transparência e simplicidade, como tratamos as informações e os dados quando você navega, explora monumentos históricos ou interage com nossos roteiros e recursos.

Atuamos em estrita observância à legislação brasileira de proteção de dados — especialmente a **Lei Geral de Proteção de Dados Pessoais (LGPD - Lei Federal nº 13.709/2018)** — e às melhores diretrizes internacionais de governança da informação, como o **Regulamento Geral sobre a Proteção de Dados da União Europeia (GDPR - Regulamento UE 2016/679)**.

---

## 2. Princípio Fundamental: *Privacy by Design* e Arquitetura *Local-First*

Diferentemente da maioria das aplicações web e aplicativos comerciais, o **Recife: Museu a Céu Aberto** foi arquitetado sob o paradigma de **Processamento Local no Dispositivo (*Local-First / On-Device Processing*)**:

> **A premissa é clara:** Seus dados pertencem a você e residem no seu próprio dispositivo móvel ou computador.

- **Nenhum banco de dados remoto centralizador:** Não coletamos, não vendemos e não transmitimos para servidores remotos as suas preferências de navegação, anotações de diário de campo, histórico de monumentos carimbados ou seu perfil declarativo.
- **Armazenamento Seguro Local:** As preferências são guardadas estritamente no armazenamento local do seu próprio navegador (`localStorage`), sob seu controle exclusivo.

---

## 3. Quais Dados Tratamos e Qual a Sua Finalidade?

A tabela a seguir discrimina detalhadamente as categorias de dados manipuladas pela aplicação, suas finalidades e a respectiva base legal segundo a LGPD:

| Categoria de Dado | Descrição e Exemplos | Finalidade no Aplicativo | Onde é Armazenado? | Base Legal (LGPD) |
|---|---|---|---|---|
| **Geolocalização (GPS)** | Coordenadas de Latitude e Longitude obtidas via API `navigator.geolocation` do navegador. | Calcular a distância geodésica até os monumentos históricos (fórmula de Haversine) e validar a presença física (< 75 metros) para carimbar o **Passaporte Cultural**. | **Apenas na memória volátil (RAM)** durante o uso. **Nunca** é salva em disco nem enviada a servidores. | Consentimento do Titular (Art. 7º, I da LGPD). |
| **Perfil Declarativo do Visitante** | Classificação como morador, turista nacional ou internacional; cidade de origem; interesse cultural principal. | Personalização visual da interface e calibração estatística do painel curatorial no próprio dispositivo. | Exclusivamente no `localStorage` do seu navegador (`recife_mca_profile_v1`). | Consentimento / Legítimo Interesse (Art. 7º, I e IX). |
| **Diário de Campo & Notas Pessoais** | Textos, anotações de campo e reflexões que o usuário decide registrar em cada monumento. | Proporcionar uma ferramenta de estudos e memórias pessoais ao visitante. | Exclusivamente no `localStorage` do seu navegador (`recife_mca_nota_<ID>`). | Consentimento do Titular (Art. 7º, I). |
| **Passaporte Cultural & Conquistas** | Lista de IDs de pontos de interesse que o visitante carimbou e status de roteiros concluídos. | Gamificação cultural, acompanhamento de progresso e geração do Certificado de Conclusão. | Exclusivamente no `localStorage` do seu navegador (`recife_mca_passaporte`). | Consentimento / Execução de recurso solicitado (Art. 7º, V). |
| **Telemetria de Uso Local** | Contadores anônimos de cliques em POIs, reproduções do audioguia e tempo de visualização (*Dwell Time*). | Apresentar gráficos de engajamento no painel de inteligência curatorial na sessão local. | Exclusivamente no `localStorage` do seu navegador (`recife_mca_telemetry_v1`). | Legítimo Interesse (Art. 7º, IX) — dados estritamente anônimos. |
| **Colaboração com a Curadoria** | Nome, e-mail, tipo de contribuição e relato histórico voluntário enviado pelo usuário. | Recebimento de memórias, fotografias e correções históricas da sociedade civil. | Tráfego via seu próprio cliente de e-mail padrão (`mailto:`) para a curadoria. | Consentimento Expresso (Art. 7º, I). |

---

## 4. Recursos Específicos e Tratamento Técnico

### 4.1. Geolocalização em Tempo Real (GPS)
- A permissão para acessar a localização geográfica é **opcional**. Você pode explorar integralmente o mapa, ler as pesquisas e escutar o audioguia sem ativar o GPS.
- Se ativada, a geolocalização é utilizada apenas em tempo real para exibir sua posição no mapa e calcular a proximidade em relação aos monumentos.
- **Nenhum histórico de trajetos, paradas ou deslocamentos é gravado em servidores ou compartilhado com terceiros.**

### 4.2. Audioguia por Síntese de Voz Nativa
- O audioguia utiliza exclusivamente a API nativa do seu navegador (`window.speechSynthesis`), aproveitando as vozes já instaladas no seu sistema operacional (Android, iOS, Windows, macOS, Linux).
- O aplicativo **não grava a voz do usuário**, não acessa o microfone do dispositivo e não realiza chamadas para serviços externos de geração de áudio.

### 4.3. Progressive Web App (PWA) e Funcionamento Offline
- A aplicação utiliza um *Service Worker* (`sw.js`) para armazenar em cache os arquivos estruturais (HTML, CSS, ícones e scripts).
- Este cache é técnico, serve unicamente para garantir que o mapa e os dados históricos permaneçam acessíveis mesmo quando você estiver sem sinal de internet no Recife Antigo ou em áreas históricas.

---

## 5. Política de Cookies e Rastreamento

> **Nosso compromisso: Zero cookies de rastreamento de terceiros.**

1. **Sem Rastreamento Publicitário:** Não utilizamos Google Analytics, Meta/Facebook Pixel, ferramentas de mapa de calor de terceiros, anunciantes ou corretores de dados (*data brokers*).
2. **Sem *Fingerprinting*:** Não realizamos técnicas de impressão digital de dispositivo para identificar visitantes através de sites de terceiros.
3. **Cookies Técnicos Administrativos:** O servidor da aplicação (`server.js`) emite unicamente um cookie técnico (`mca_developer_session`) restrito aos administradores e pesquisadores autorizados da curadoria que possuem credenciais, com atributos rigorosos de segurança (`HttpOnly`, `SameSite=Strict`). Visitantes comuns **não recebem cookies**.

---

## 6. Compartilhamento de Dados com Terceiros

O **Recife: Museu a Céu Aberto** **não vende, não aluga, não cede e não compartilha** qualquer dado de usuários com terceiros para fins comerciais ou publicitários.

As únicas conexões de rede estabelecidas pela aplicação são com os seguintes provedores técnicos essenciais para o funcionamento do mapa e do acervo, autorizadas estritamente pela nossa Política de Segurança de Conteúdo (CSP):
- **OpenStreetMap e CartoDB:** Para o carregamento dos blocos de mapa cartográfico (tiles).
- **Google Fonts:** Para a renderização tipográfica das fontes *Playfair Display* e *Inter*.
- **Google Sheets / Google Drive (Modo Somente Leitura):** Para ingestão da planilha pública de dados históricos dos monumentos e fotografias públicas do acervo cultural.

---

## 7. Direitos do Titular de Dados (LGPD Art. 18 / GDPR)

A LGPD assegura a você, como titular dos dados, uma série de direitos fundamentais. Veja como você pode exercê-los diretamente na aplicação:

1. **Direito de Acesso e Confirmação:** Você pode consultar a qualquer momento seus dados de perfil, suas notas de campo e seu progresso no Passaporte diretamente na interface do aplicativo.
2. **Direito de Eliminação e Revogação do Consentimento:** A aplicação oferece uma função nativa de exclusão total. Basta acessar o menu de perfil e clicar em **"Limpar Dados Locais"** (ou limpar os dados de navegação do seu browser) para apagar instantaneamente todas as preferências, notas, estatísticas e carimbos.
3. **Direito de Portabilidade e Cópia:** As notas salvas ficam legíveis em texto plano no seu próprio navegador e os certificados de conclusão podem ser baixados e compartilhados livremente.
4. **Direito de Oposição e Não Fornecimento:** O fornecimento de qualquer dado (como preencher o onboarding ou conceder acesso ao GPS) é voluntário e não bloqueia a exploração dos monumentos.

---

## 8. Segurança da Informação e Salvaguardas Técnicas

Implementamos medidas técnicas e administrativas aptas a proteger as informações contra acessos não autorizados e situações de risco:
- **Content Security Policy (CSP):** Cabeçalho de segurança rigoroso que bloqueia a execução de scripts não autorizados e injeções de código malicioso.
- **Sanitização em Camadas contra DOM XSS (CWE-79):** Todos os textos e parâmetros de busca são purificados antes da inserção na árvore do DOM.
- **Isolamento de Caminho (*Path Traversal Protection*):** O servidor restringe estritamente o acesso a diretórios públicos pré-autorizados.
- **Comunicação Criptografada:** Em ambiente de produção, todo o tráfego deve ser trafegado sob o protocolo HTTPS com certificados TLS modernos.

---

## 9. Contato do Encarregado de Dados (DPO) e Curadoria

Para esclarecer dúvidas sobre este Aviso de Privacidade, exercer seus direitos de titular ou enviar considerações sobre o tratamento de informações no projeto, entre em contato diretamente com o responsável:

- **Responsável pelo Projeto e Tratamento:** Tales Pedrosa
- **Papel:** Historiador, Pesquisador e Curador do Recife: Museu a Céu Aberto
- **Canal de Atendimento / E-mail:** `tales.pedrosa@gmail.com`
- **Assunto Recomendado:** `[Privacidade MCA] Solicitação de Informações`

---

## 10. Atualizações Deste Aviso

Este Aviso de Privacidade poderá ser atualizado periodicamente para refletir aprimoramentos nos recursos da aplicação, novas diretrizes de governança ou alterações na legislação aplicável. Qualquer modificação substancial será informada nesta página e identificada pela data de revisão no cabeçalho.
