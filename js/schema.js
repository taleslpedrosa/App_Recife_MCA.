// Validador e Sanitizador de Schema em Runtime (Camada de Integridade de Dados)

const BoundingBoxRecife = {
    minLat: -8.50,
    maxLat: -7.80,
    minLng: -35.20,
    maxLng: -34.70
};

/**
 * Sanitiza texto removendo quaisquer tags HTML, scripts ou caracteres de controle perigosos
 */
function sanitizarString(txt, removerConteudoScripts = false) {
    if (!txt || typeof txt !== 'string') return '';
    let texto = txt;
    if (removerConteudoScripts) {
        texto = texto.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
    }
    return texto
        .replace(/<[^>]*>/g, '') // Remove qualquer tag HTML restante
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove caracteres de controle
        .trim();
}

/**
 * Valida se uma coordenada geográfica está dentro dos limites da Região Metropolitana do Recife
 */
function validarCoordenadasRecife(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return false;
    }
    return lat >= BoundingBoxRecife.minLat && lat <= BoundingBoxRecife.maxLat &&
           lng >= BoundingBoxRecife.minLng && lng <= BoundingBoxRecife.maxLng;
}

/**
 * Validador e Sanitizador de Schema em Runtime para POIs
 * @param {Object} raw - Objeto bruto vindo de dados.js, Google Sheets ou cache
 * @param {number} fallbackIndex - Índice alternativo caso o ID falhe
 * @returns {{ valido: boolean, poi: Object, erros: string[] }}
 */
function validarESanitizarPoi(raw, fallbackIndex = 1) {
    const erros = [];
    if (!raw || typeof raw !== 'object') {
        return { valido: false, poi: null, erros: ['Dado de POI não é um objeto válido'] };
    }

    // 1. ID
    let id = parseInt(raw.id, 10);
    if (isNaN(id) || id <= 0) {
        id = fallbackIndex;
        erros.push(`ID inválido no POI, utilizando fallback ${fallbackIndex}`);
    }

    // 2. Título
    const titulo = sanitizarString(raw.titulo || raw.nome, true);
    if (!titulo) {
        erros.push(`POI ID ${id} sem título`);
    }

    // 3. Tipo e Categoria
    const tipo = sanitizarString(raw.tipo) || null;
    const categoria = sanitizarString(raw.categoria) || 'Geral';

    // 4. Coordenadas
    let lat = typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.lat);
    let lng = typeof raw.lng === 'number' ? raw.lng : (typeof raw.Ing === 'number' ? raw.Ing : parseFloat(raw.lng || raw.Ing));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        erros.push(`POI ID ${id} possui coordenadas não numéricas`);
    } else if (!validarCoordenadasRecife(lat, lng)) {
        erros.push(`POI ID ${id} possui coordenadas fora dos limites metropolitanos do Recife (${lat}, ${lng})`);
    }

    // 5. Descrição e Observações
    const descricao = sanitizarString(raw.descricao) || 'Descrição em elaboração pela curadoria.';
    const observacao = sanitizarString(raw.observacao) || null;

    // 6. Tags
    let tags = [];
    if (Array.isArray(raw.tags)) {
        tags = raw.tags
            .map(t => sanitizarString(t))
            .filter(t => t.length > 0 && t !== '#');
    } else if (typeof raw.tags === 'string' && raw.tags.trim() !== '') {
        tags = raw.tags.split(',')
            .map(t => sanitizarString(t))
            .filter(t => t.length > 0 && t !== '#');
    }

    // 7. Imagens
    let imagens = [];
    if (Array.isArray(raw.imagem)) {
        imagens = raw.imagem
            .map(img => sanitizarString(img))
            .filter(img => img.length > 0);
    } else if (typeof raw.imagem === 'string' && raw.imagem.trim() !== '') {
        imagens = raw.imagem.split(',')
            .map(img => sanitizarString(img))
            .filter(img => img.length > 0);
    }

    const poiSanitizado = {
        id,
        titulo: titulo || `Monumento Histórico #${id}`,
        tipo,
        categoria,
        lat: Number.isFinite(lat) ? Number(lat.toFixed(6)) : null,
        lng: Number.isFinite(lng) ? Number(lng.toFixed(6)) : null,
        descricao,
        tags,
        imagem: imagens,
        observacao,
        ano: raw.ano || raw.year || raw.data || raw.data_inicio || null,
        titulo_en: sanitizarString(raw.titulo_en) || null,
        titulo_es: sanitizarString(raw.titulo_es) || null,
        descricao_en: sanitizarString(raw.descricao_en) || null,
        descricao_es: sanitizarString(raw.descricao_es) || null,
        audiodescricao: sanitizarString(raw.audiodescricao) || null,
        audiodescricao_en: sanitizarString(raw.audiodescricao_en) || null,
        audiodescricao_es: sanitizarString(raw.audiodescricao_es) || null
    };

    return {
        valido: erros.length === 0,
        poi: poiSanitizado,
        erros
    };
}
