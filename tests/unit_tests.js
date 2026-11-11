// Suíte de Testes Unitários - Funções Puras e Regras de Negócio
// Projeto: Recife: Museu a Céu Aberto

function executarTestesUnitarios(assert) {
    console.log('\n--- EXECUTANDO TESTES UNITÁRIOS ---');

    // 1. Testes de Haversine e Distâncias Geodésicas
    assert.suite('Cálculo Geodésico (Haversine)', () => {
        // Marco Zero (-8.063155, -34.871140) até Torre Malakoff (-8.060770, -34.870838)
        // Distância real aproximada ~ 267 metros
        const d = calcularHaversine(-8.063155, -34.871140, -8.060770, -34.870838);
        assert.isTrue(d > 250 && d < 280, `Distância calculada entre Marco Zero e Malakoff deve ser ~267m (obtido: ${Math.round(d)}m)`);

        // Distância para o mesmo ponto deve ser 0
        const dZero = calcularHaversine(-8.063155, -34.871140, -8.063155, -34.871140);
        assert.isEqual(Math.round(dZero), 0, 'Distância para as mesmas coordenadas deve ser 0 metros');
    });

    // 2. Testes de Normalização de Coordenadas da Planilha
    assert.suite('Normalização de Coordenadas (Google Sheets PT-BR)', () => {
        // Simula valor que o Google Sheets salva com pontuação de milhar
        const latMilhar = normalizarCoordenada(-8063155, true);
        assert.isEqual(latMilhar, -8.063155, 'Latitude com milhar deve normalizar para -8.063155');

        const lngMilhar = normalizarCoordenada(-34871140, false);
        assert.isEqual(lngMilhar, -34.87114, 'Longitude com milhar deve normalizar para -34.87114');

        // Valor já correto
        const latCorreta = normalizarCoordenada(-8.056799, true);
        assert.isEqual(latCorreta, -8.056799, 'Latitude já correta deve ser preservada');
    });

    // 3. Testes de Bounding Box do Recife
    assert.suite('Bounding Box Geográfica do Recife', () => {
        assert.isTrue(validarCoordenadasRecife(-8.063155, -34.871140), 'Marco Zero deve estar dentro dos limites do Recife');
        assert.isTrue(validarCoordenadasRecife(-8.056799, -34.869214), 'Porto do Recife deve estar dentro dos limites do Recife');
        assert.isFalse(validarCoordenadasRecife(-23.550520, -46.633308), 'São Paulo deve estar fora dos limites do Recife');
        assert.isFalse(validarCoordenadasRecife(0, 0), 'Ponto nulo no oceano deve estar fora dos limites do Recife');
    });

    // 4. Testes de Sanitização contra XSS e Injeções
    assert.suite('Sanitização e Segurança em Camadas (AppSec)', () => {
        const textoComHtml = 'Praça Rio Branco <script>alert("XSS")</script>';
        const limpo = sanitizarString(textoComHtml);
        assert.isEqual(limpo, 'Praça Rio Branco alert("XSS")', 'Tags script devem ser completamente removidas');

        const textoComImg = '<img src=x onerror=alert(1)>Marco Zero';
        assert.isEqual(sanitizarString(textoComImg), 'Marco Zero', 'Tags img com manipulador de evento devem ser removidas');

        // Sanitização de URLs de Imagens
        assert.isEqual(sanitizarUrlImagem("imagens/paco_do_frevo.jpg"), "imagens/paco_do_frevo.jpg", 'Caminho local seguro deve ser permitido');
        assert.isEqual(sanitizarUrlImagem("https://lh3.googleusercontent.com/d/XYZ"), "https://lh3.googleusercontent.com/d/XYZ", 'URL HTTPS segura deve ser permitida');
        assert.isEqual(sanitizarUrlImagem("javascript:alert(1)"), "", 'Protocolo javascript: deve ser bloqueado');
        assert.isEqual(sanitizarUrlImagem("https://site.com/foto.jpg'); background: red;"), "", 'Injeção de quebra de CSS url(...) deve ser bloqueada');
    });

    // 5. Testes de Decodificação de Mojibake
    assert.suite('Decodificação de Mojibake (Caracteres Corrompidos)', () => {
        assert.isEqual(decodificarTextoPlanilha('Pra├ºa'), 'Praça', '├º deve ser convertido para ç');
        assert.isEqual(decodificarTextoPlanilha('Edifica├º├úo'), 'Edificação', '├º e ├ú devem ser convertidos para ç e ã');
        assert.isEqual(decodificarTextoPlanilha('S├®culo XIX'), 'Século XIX', '├® deve ser convertido para é');
    });

    // 6. Testes do Validador de Schema em Runtime
    assert.suite('Validação de Schema de POIs (Runtime Integrity)', () => {
        const poiValido = {
            id: 1,
            titulo: "Marco Zero",
            tipo: "Praça",
            categoria: "Espaço Público",
            lat: -8.063155,
            lng: -34.871140,
            descricao: "Ponto inicial da cidade.",
            tags: ["#RecifeAntigo", "#Praça"],
            imagem: ["imagens/foto.jpg"],
            observacao: null
        };

        const res1 = validarESanitizarPoi(poiValido);
        assert.isTrue(res1.valido, 'POI válido deve passar com status valido = true');
        assert.isEqual(res1.poi.id, 1, 'ID deve ser preservado');

        // POI com dados faltantes ou corrompidos
        const poiCorrompido = {
            id: "invalido",
            titulo: "<script>alert(1)</script>Teatro Santa Isabel",
            lat: 999.0, // Inválido
            lng: "não é numero"
        };
        const res2 = validarESanitizarPoi(poiCorrompido, 42);
        assert.isFalse(res2.valido, 'POI com coordenadas absurdas deve reportar erros');
        assert.isEqual(res2.poi.id, 42, 'ID inválido deve adotar fallback numérico');
        assert.isEqual(res2.poi.titulo, 'Teatro Santa Isabel', 'Título com tag maliciosa deve ser limpo');
    });

    // 7. Testes do Motor de Telemetria e Dwell Time
    assert.suite('Motor de Telemetria & Métricas de Dwell Time', () => {
        const statsAntes = telemetry.obterEstatisticas();
        const acessosAntes = statsAntes.acessos['1'] || 0;
        
        telemetry.registrarVisualizacaoPoi(1);
        const statsDepois = telemetry.obterEstatisticas();
        assert.isEqual(statsDepois.acessos['1'], acessosAntes + 1, 'Registro de visualização deve incrementar contador de POI');

        // Teste de busca sem resultado
        telemetry.registrarBusca('palavra_inexistente_123', 0);
        const statsBusca = telemetry.obterEstatisticas();
        assert.isTrue(statsBusca.buscasSemResultado.includes('palavra_inexistente_123'), 'Busca sem resultado deve ser salva para backlog curatorial');
    });

    // 8. Testes do Perfil do Visitante (Morador vs. Turista)
    assert.suite('Identificação do Visitante (Morador vs. Turista)', () => {
        syncManager.atualizarPerfil({ tipoVisitante: 'morador', cidadeOrigem: 'Recife-PE' });
        assert.isTrue(syncManager.isMorador(), 'isMorador() deve ser true para tipo morador');
        assert.isFalse(syncManager.isTurista(), 'isTurista() deve ser false para tipo morador');

        syncManager.atualizarPerfil({ tipoVisitante: 'turista_nacional', cidadeOrigem: 'Belo Horizonte-MG' });
        assert.isFalse(syncManager.isMorador(), 'isMorador() deve ser false para turista');
        assert.isTrue(syncManager.isTurista(), 'isTurista() deve ser true para turista nacional');

        syncManager.atualizarPerfil({ tipoVisitante: 'turista_internacional', cidadeOrigem: 'Montevideo' });
        assert.isTrue(syncManager.isTurista(), 'isTurista() deve ser true para turista internacional');
    });
}
