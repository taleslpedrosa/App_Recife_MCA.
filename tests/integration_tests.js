// Suíte de Testes de Integração - Estado, i18n, Gamificação e Ingestão de Dados
// Projeto: Recife: Museu a Céu Aberto

function executarTestesIntegracao(assert) {
    console.log('\n--- EXECUTANDO TESTES DE INTEGRAÇÃO ---');

    // 1. Testes do Store Reativo e EventBus
    assert.suite('Store Reativo e EventBus (Arquitetura Desacoplada)', () => {
        let eventoDisparado = false;
        let dadosRecebidos = null;

        const unsubscribe = store.subscribe('test:event', (payload) => {
            eventoDisparado = true;
            dadosRecebidos = payload;
        });

        store.emit('test:event', { valor: 123 });
        assert.isTrue(eventoDisparado, 'EventBus deve disparar ouvintes registrados');
        assert.isEqual(dadosRecebidos?.valor, 123, 'Payload do evento deve ser entregue com integridade');

        // Teste de cancelamento de inscrição
        unsubscribe();
        eventoDisparado = false;
        store.emit('test:event', { valor: 456 });
        assert.isFalse(eventoDisparado, 'Ouvinte cancelado não deve mais ser executado');
    });

    // 2. Testes de Paridade e Integridade do Dicionário i18n
    assert.suite('Internacionalização e Dicionário (i18n)', () => {
        const chavesPt = Object.keys(traducoes.pt);
        const chavesEn = Object.keys(traducoes.en);
        const chavesEs = Object.keys(traducoes.es);

        assert.isTrue(chavesPt.length >= 35, `Dicionário em Português deve ter pelo menos 35 chaves (atual: ${chavesPt.length})`);
        assert.isEqual(chavesEn.length, chavesPt.length, 'Dicionário em Inglês deve ter a mesma quantidade de chaves que o Português');
        assert.isEqual(chavesEs.length, chavesPt.length, 'Dicionário em Espanhol deve ter a mesma quantidade de chaves que o Português');

        // Checa se todas as chaves de PT existem em EN e ES
        let todasChavesPresentes = true;
        chavesPt.forEach(k => {
            if (!traducoes.en[k] || !traducoes.es[k]) {
                todasChavesPresentes = false;
            }
        });
        assert.isTrue(todasChavesPresentes, 'Todas as chaves traduzidas em PT devem existir em EN e ES sem omissões');

        // Teste da função i18n.t()
        i18n.setIdioma('en');
        assert.isEqual(i18n.t('btnAcervo'), 'Catalog', 'i18n.t deve retornar tradução em inglês');
        i18n.setIdioma('es');
        assert.isEqual(i18n.t('btnAcervo'), 'Catálogo', 'i18n.t deve retornar tradução em espanhol');
        i18n.setIdioma('pt');
        assert.isEqual(i18n.t('btnAcervo'), 'Catálogo', 'i18n.t deve retornar tradução em português');
        assert.isEqual(i18n.t('passaporteTitulo'), 'Passaporte', 'O passaporte deve usar o nome curto solicitado');
    });

    // 3. Testes do Passaporte Cultural e Gamificação
    assert.suite('Gamificação e Passaporte Cultural', () => {
        // Simula roteiro Origens do Recife com IDs [1, 3, 4]
        const idsRoteiro = [1, 3, 4];
        let visitadosMock = [1, 3];

        const visitadosNoRoteiro = idsRoteiro.filter(id => visitadosMock.includes(id)).length;
        assert.isEqual(visitadosNoRoteiro, 2, 'Deve identificar 2 de 3 locais visitados no roteiro');

        // Carimba o último local restante
        visitadosMock.push(4);
        const concluido = idsRoteiro.every(id => visitadosMock.includes(id));
        assert.isTrue(concluido, 'Roteiro com todos os locais carimbados deve ser classificado como 100% concluído');
    });

    // 4. Testes de Conversor do Google Drive
    assert.suite('Conversão de URLs do Google Drive para CDN', () => {
        const linkFileD = "https://drive.google.com/file/d/1XyZ987AbCdEfGhIj/view?usp=sharing";
        const convertido1 = converterUrlGoogleDrive(linkFileD);
        assert.isEqual(convertido1, "https://lh3.googleusercontent.com/d/1XyZ987AbCdEfGhIj", 'Link /file/d/ID deve converter para endpoint direto lh3');

        const linkQueryId = "https://drive.google.com/open?id=1AbC_999XYZ";
        const convertido2 = converterUrlGoogleDrive(linkQueryId);
        assert.isEqual(convertido2, "https://lh3.googleusercontent.com/d/1AbC_999XYZ", 'Link com ?id= deve converter para endpoint direto lh3');

        const linkComum = "https://images.unsplash.com/photo-123.jpg";
        assert.isEqual(converterUrlGoogleDrive(linkComum), linkComum, 'URLs normais não-Google Drive devem permanecer inalteradas');
    });

    // 5. Testes do Módulo de Mapa
    assert.suite('Mapa Leaflet e Camadas Cartográficas', () => {
        assert.isTrue(typeof colecaoMapas === 'object', 'Coleção de estilos cartográficos deve existir');
        assert.isTrue(typeof colecaoMapas.voyager !== 'undefined', 'Mapa turístico deve estar registrado');
        assert.isTrue(typeof colecaoMapas.classico !== 'undefined', 'Mapa clássico deve estar registrado');
        assert.isTrue(typeof colecaoMapas.altoContraste !== 'undefined', 'Mapa de alto contraste deve estar registrado');
        assert.isTrue(typeof renderMarkers === 'function', 'Função de renderização de marcadores deve existir');
    });

    // 6. Testes de GPS e Proximidade
    assert.suite('GPS e Cálculo de Proximidade', () => {
        const distanciaProxima = calcularHaversine(-8.063155, -34.871140, -8.063155, -34.871140);
        assert.isEqual(Math.round(distanciaProxima), 0, 'Mesma coordenada GPS deve ter distância zero');
        assert.isTrue(distanciaProxima <= 75, 'Local no mesmo ponto deve ativar a faixa de proximidade');

        const distSpan = document.createElement('span');
        distSpan.id = 'distancia-valor';
        const badge = document.createElement('div');
        badge.id = 'poi-proximidade-badge';
        badge.className = 'hidden';
        document.body.append(distSpan, badge);
        openedPoi = { id: 1, titulo: 'Marco Zero', lat: -8.063155, lng: -34.871140 };
        userLatLng = [-8.063155, -34.871140];
        atualizarDistanciaPoi();
        assert.isEqual(distSpan.innerText, '0 metros', 'Interface deve informar 0 metros na mesma posição');
        assert.isFalse(badge.classList.contains('hidden'), 'Badge de proximidade deve ser exibido dentro de 75 metros');
        distSpan.remove();
        badge.remove();
    });

    // 7. Testes de Resiliência do Google Sheets
    assert.suite('Ingestão e Resiliência do Google Sheets', () => {
        let erroFormato = false;
        try { parseGVizParaPois('conteúdo inválido'); } catch (e) { erroFormato = e.message.includes('Formato de resposta'); }
        assert.isTrue(erroFormato, 'Resposta GViz inválida deve lançar erro de formato reconhecível');

        const gviz = 'google.visualization.Query.setResponse({"table":{"rows":[{"c":[{"v":1},{"v":"Marco Zero"},{"v":"Praça"},{"v":"Espaço Público"},{"v":"-8.063155"},{"v":"-34.871140"},{"v":"Ponto histórico"},{"v":"#Praça,#RecifeAntigo"},{"v":""},{"v":null}]}]}});';
        const poisSheets = parseGVizParaPois(gviz);
        assert.isTrue(poisSheets.length === 1, 'Uma linha GViz válida deve produzir um POI');
        assert.isEqual(poisSheets[0]?.titulo, 'Marco Zero', 'Título da planilha deve chegar ao POI normalizado');
    });
}
