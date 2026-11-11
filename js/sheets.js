// Sincronizador de Dados com o Google Sheets (com suporte a Cache Offline PWA)

// ============================================================================
// CONFIGURAÇÃO DA PLANILHA
// ID da sua planilha Google compartilhada ("Qualquer pessoa com o link pode ler")
// ============================================================================
const GOOGLE_SHEET_ID = '1Enf-dtzc1EF_B0BrCuiPlK2UyBGz4U7DR853O6p0qN0';
const GOOGLE_SHEET_GID = '0'; // GID da aba (0 = primeira aba)

/**
 * Converte links compartilhados do Google Drive em links diretos de alta velocidade para imagens
 * Ex: https://drive.google.com/file/d/XYZ/view -> https://lh3.googleusercontent.com/d/XYZ
 */
function converterUrlGoogleDrive(url) {
    if (!url || typeof url !== 'string') return url;
    const urlLimpa = url.trim();

    if (urlLimpa.includes('drive.google.com')) {
        const matchFileD = urlLimpa.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        const matchId = urlLimpa.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        const fileId = matchFileD ? matchFileD[1] : (matchId ? matchId[1] : null);

        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }

    return urlLimpa;
}

/**
 * Normaliza e processa o campo de imagem (aceita string, array ou links separados por vírgula)
 */
function processarImagensPoi(campoImagem) {
    if (!campoImagem) return [];
    
    let lista = [];
    if (Array.isArray(campoImagem)) {
        lista = campoImagem;
    } else if (typeof campoImagem === 'string') {
        lista = campoImagem.split(',').map(s => s.trim()).filter(Boolean);
    }

    return lista.map(converterUrlGoogleDrive);
}

/**
 * Sanitiza texto removendo quaisquer tags HTML, scripts ou entidades maliciosas (Sanitização em Camadas)
 */
function sanitizarTexto(txt) {
    if (!txt || typeof txt !== 'string') return '';
    return txt
        .replace(/<[^>]*>/g, '') // Remove qualquer tag HTML
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
        .trim();
}

/**
 * Decodifica texto que tenha sofrido 'mojibake' (corrupção de acentuação na importação de planilhas)
 */
function decodificarTextoPlanilha(txt) {
    if (!txt || typeof txt !== 'string') return '';
    const corrigido = txt
        .replace(/├º/g, 'ç')
        .replace(/├®/g, 'é')
        .replace(/├ú/g, 'ã')
        .replace(/├┤/g, 'ô')
        .replace(/├¡/g, 'í')
        .replace(/├ó/g, 'â')
        .replace(/├¬/g, 'ê')
        .replace(/├ás/g, 'às')
        .replace(/├á/g, 'à')
        .replace(/├║/g, 'ú')
        .replace(/├ë/g, 'É')
        .replace(/├ì/g, 'Í')
        .replace(/├│/g, 'ó')
        .replace(/├Á/g, 'õ')
        .replace(/├½/g, 'ë')
        .replace(/┬▓/g, '²')
        .replace(/┬║/g, 'º');
    return sanitizarTexto(corrigido);
}

/**
 * Normaliza coordenadas geográficas caso a planilha brasileira tenha interpretado o ponto como separador de milhar
 * Ex: -8063155 vira -8.063155 | -34871140 vira -34.87114
 */
function normalizarCoordenada(val, isLat = true) {
    if (val === null || val === undefined || isNaN(val)) return 0;
    let v = Number(val);
    const limite = isLat ? 35 : 180; // Latitude de Recife ~ -8.06 (não ultrapassa 35 no Brasil)
    while (Math.abs(v) > limite) {
        v /= 10;
    }
    return Number(v.toFixed(6));
}

/**
 * Converte a resposta GViz (Google Visualization JSON) em uma lista de POIs estruturada
 */
function parseGVizParaPois(textoGViz) {
    const match = textoGViz.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match || !match[1]) {
        throw new Error("Formato de resposta do Google Sheets inválido.");
    }

    const payload = JSON.parse(match[1]);
    const tabela = payload.table;
    if (!tabela || !tabela.rows) {
        throw new Error("Tabela do Google Sheets sem dados.");
    }

    const poisConvertidos = [];

    tabela.rows.forEach((row, index) => {
        const c = row.c;
        if (!c || c.length === 0) return;

        const getVal = (idx) => {
            if (!c[idx] || c[idx].v === null || c[idx].v === undefined) return '';
            return c[idx].v.toString().trim();
        };

        const idNum = parseInt(getVal(0), 10) || (index + 1);
        const tituloBruto = getVal(1);
        if (!tituloBruto) return; // Pula linhas vazias

        const titulo = decodificarTextoPlanilha(tituloBruto);
        const tipo = decodificarTextoPlanilha(getVal(2));
        const categoria = decodificarTextoPlanilha(getVal(3));
        
        const rawLat = parseFloat(getVal(4).replace(',', '.'));
        const rawLng = parseFloat(getVal(5).replace(',', '.'));
        const lat = normalizarCoordenada(rawLat, true);
        const lng = normalizarCoordenada(rawLng, false);

        const descricao = decodificarTextoPlanilha(getVal(6));
        const rawTags = getVal(7);
        const rawImagem = getVal(8);
        const observacao = decodificarTextoPlanilha(getVal(9));

        // Processa tags (separadas por vírgula na célula e limpa acentos)
        const tags = rawTags
            ? rawTags.split(',').map(t => decodificarTextoPlanilha(t.trim())).filter(Boolean)
            : [];

        // Processa imagens (suporte a fotos no Google Drive ou pasta imagens/)
        const imagem = processarImagensPoi(rawImagem);

        const poiBruto = {
            id: idNum,
            titulo: titulo,
            tipo: tipo || null,
            categoria: categoria || '',
            lat: lat,
            lng: lng,
            descricao: descricao,
            tags: tags,
            imagem: imagem,
            observacao: observacao || null
        };

        // Validação e Sanitização de Schema em Runtime
        if (typeof validarESanitizarPoi === 'function') {
            const res = validarESanitizarPoi(poiBruto, index + 1);
            if (res.poi) poisConvertidos.push(res.poi);
        } else {
            poisConvertidos.push(poiBruto);
        }
    });

    return poisConvertidos;
}

/**
 * Inicializador da sincronização:
 * 1. Carrega imediatamente do localStorage se houver dados salvos anteriormente.
 * 2. Em segundo plano, busca a planilha no Google Sheets.
 * 3. Se houver conexão e sucesso, atualiza o mapa e o cache local.
 */
async function inicializarGoogleSheets() {
    // 1. Tenta carregar do cache local para resposta instantânea
    const cacheLocal = localStorage.getItem('mca_recife_pois_cache');
    if (cacheLocal) {
        try {
            const poisEmCache = JSON.parse(cacheLocal);
            if (Array.isArray(poisEmCache) && poisEmCache.length > 0) {
                if (typeof store !== 'undefined' && store.setPois) {
                    store.setPois(poisEmCache);
                } else {
                    window.pois = poisEmCache;
                }
                if (typeof renderMarkers === 'function') renderMarkers(window.pois);
                if (typeof inicializarFiltros === 'function') inicializarFiltros();
            }
        } catch (e) {
            console.warn("Cache local corrompido, usando fallback estático:", e);
        }
    }

    // 2. Se não houver ID configurado, mantém os dados do dados.js
    if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID.trim() === '') {
        console.log("Google Sheets ID não configurado. Utilizando dados locais de dados.js");
        if (typeof store !== 'undefined' && typeof pois !== 'undefined' && store.setPois) {
            store.setPois(pois);
            if (typeof inicializarFiltros === 'function') inicializarFiltros();
            if (typeof renderMarkers === 'function') renderMarkers(pois);
        }
        return;
    }

    // 3. Busca a planilha em segundo plano
    try {
        const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${GOOGLE_SHEET_GID}`;
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const texto = await resposta.text();
        const novosPois = parseGVizParaPois(texto);

        if (novosPois && novosPois.length > 0) {
            if (typeof store !== 'undefined' && store.setPois) {
                store.setPois(novosPois);
            } else {
                window.pois = novosPois;
            }
            localStorage.setItem('mca_recife_pois_cache', JSON.stringify(window.pois));
            
            // Atualiza a interface reativamente
            if (typeof renderMarkers === 'function') renderMarkers(window.pois);
            if (typeof inicializarFiltros === 'function') inicializarFiltros();

            // Sincronização Reativa do Deep Link e POI Aberto (Resolve REL-01)
            if (typeof openedPoi !== 'undefined' && openedPoi) {
                const poiAtualizado = window.pois.find(p => p.id === openedPoi.id);
                if (poiAtualizado && typeof abrirDetalhesPoi === 'function') {
                    abrirDetalhesPoi(poiAtualizado);
                }
            } else if (typeof verificarDeepLink === 'function') {
                verificarDeepLink();
            }

            // Dispara evento global desacoplado para a arquitetura reativa
            document.dispatchEvent(new CustomEvent('mca:dados-atualizados', { detail: { pois: window.pois } }));
            console.log(`Sincronização concluída: ${novosPois.length} POIs carregados do Google Sheets.`);
        }
    } catch (err) {
        console.warn("Não foi possível conectar ao Google Sheets (modo offline ou erro):", err);
        // Fallback local garantido: falha no Google Sheets nao pode remover os POIs.
        if (typeof store !== 'undefined' && typeof pois !== 'undefined' && store.setPois) {
            store.setPois(pois);
            if (typeof inicializarFiltros === 'function') inicializarFiltros();
            if (typeof renderMarkers === 'function') renderMarkers(window.pois);
        }
    }
}
