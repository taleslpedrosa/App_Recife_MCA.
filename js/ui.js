// Gerenciador Central de Interface (UI Coordinator & Facade)
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)
// Módulos desacoplados: js/ui/carousel.js, js/ui/audioguide.js, js/ui/notes.js,
//                       js/ui/passport.js, js/ui/modals.js, js/ui/dashboard.js, js/ui/gestures.js

let openedPoi = null;
let catSelecionada = null;
let tagSelecionada = null;
let epocaSelecionada = null;
let idiomaAtual = localStorage.getItem('recife_mca_idioma') || 'pt';
const estadoExpansao = { cats: false, tags: false };
const estadoSecoesMenu = { roteiros: false, epocas: false };
let searchDebounceTimeout = null;
const cachePesquisaPoi = new WeakMap();

// =========================================================================
// 1. UTILITÁRIOS DE TEXTO & PESQUISA
// =========================================================================

function normalizarTexto(txt) {
    if (!txt) return '';
    return txt.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function obterListaPois() {
    if (typeof store !== 'undefined' && Array.isArray(store.state.pois) && store.state.pois.length > 0) {
        return store.state.pois;
    }
    return typeof pois !== 'undefined' ? pois : [];
}

function obterDadosPesquisaPoi(poi) {
    let dados = cachePesquisaPoi.get(poi);
    if (!dados) {
        dados = {
            titulo: normalizarTexto(poi.titulo),
            descricao: normalizarTexto(poi.descricao),
            categoria: normalizarTexto(poi.categoria),
            tags: Array.isArray(poi.tags) ? poi.tags.map(normalizarTexto).join(' ') : ''
        };
        cachePesquisaPoi.set(poi, dados);
    }
    return dados;
}

function textoPoiLocalizado(poi, campo) {
    const lang = typeof i18n !== 'undefined' ? i18n.getIdioma() : (typeof idiomaAtual !== 'undefined' ? idiomaAtual : 'pt');
    if (lang !== 'pt') {
        const localizado = poi[`${campo}_${lang}`];
        if (typeof localizado === 'string' && localizado.trim()) return localizado;
    }
    return poi[campo] || '';
}

// Sanitização de URLs de imagens (compatibilidade retroativa / CWE-79)
function sanitizarUrlImagem(url) {
    if (typeof CarouselModule !== 'undefined' && CarouselModule.sanitizarUrlImagem) {
        return CarouselModule.sanitizarUrlImagem(url);
    }
    if (!url || typeof url !== 'string') return '';
    const limpa = url.trim();
    if (/^(https?:\/\/|\/|\.\/|imagens\/)/i.test(limpa) && !limpa.includes("'") && !limpa.includes('"') && !limpa.includes('(') && !limpa.includes(')')) {
        return limpa;
    }
    return '';
}

// =========================================================================
// 2. CONTROLE DO MENU LATERAL & NAVEGAÇÃO
// =========================================================================

function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const backdrop = document.getElementById('menu-backdrop');
    if (!menu || !backdrop) return;

    if (menu.style.right === '0px') {
        menu.style.right = '-100%';
        backdrop.classList.add('hidden');
    } else {
        menu.style.right = '0px';
        backdrop.classList.remove('hidden');
    }
}

function alternarSecaoMenu(secao) {
    const painel = document.getElementById(`painel-${secao}`);
    const botao = document.querySelector(`[aria-controls="painel-${secao}"]`);
    const icone = document.getElementById(`icone-${secao}`);
    if (!painel || !botao) return;

    estadoSecoesMenu[secao] = !estadoSecoesMenu[secao];
    painel.classList.toggle('hidden', !estadoSecoesMenu[secao]);
    botao.setAttribute('aria-expanded', String(estadoSecoesMenu[secao]));
    if (icone) icone.innerText = estadoSecoesMenu[secao] ? 'expand_less' : 'expand_more';
}

function alternarExpansao(tipo) {
    const elLista = document.getElementById(tipo === 'cats' ? 'lista-categorias' : 'lista-tags');
    const elTxt   = document.getElementById(tipo === 'cats' ? 'txt-toggle-cats' : 'txt-toggle-tags');
    const elIco   = document.getElementById(tipo === 'cats' ? 'ico-toggle-cats' : 'ico-toggle-tags');
    if (!elLista || !elTxt || !elIco) return;

    estadoExpansao[tipo] = !estadoExpansao[tipo];
    if (estadoExpansao[tipo]) {
        elLista.style.maxHeight = '1000px';
        elTxt.innerText = 'Menos';
        elIco.innerText = 'expand_less';
    } else {
        elLista.style.maxHeight = '64px';
        elTxt.innerText = 'Ver mais';
        elIco.innerText = 'expand_more';
    }
}

function atualizarContador(quantidade) {
    const contador = document.getElementById('contador-resultados');
    if (!contador) return;
    if (typeof isRouteMode !== 'undefined' && isRouteMode) {
        contador.innerText = `Roteiro: ${quantidade} pontos`;
        contador.className = "absolute top-20 left-4 z-[1000] bg-[#881337]/95 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-md transition-all";
    } else {
        const texto = quantidade === 1 ? 'local exibido' : 'locais exibidos';
        contador.innerText = `${quantidade} ${texto}`;
        contador.className = "absolute top-20 left-4 z-[1000] bg-slate-900/90 backdrop-blur text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-md transition-all";
    }
}

// =========================================================================
// 3. FILTROS, CATEGORIAS, TAGS E LINHA DO TEMPO (ÉPOCAS)
// =========================================================================

function inicializarFiltros() {
    const divCats = document.getElementById('lista-categorias');
    const listaPois = obterListaPois();
    if (!divCats || listaPois.length === 0) return;

    const mapaCategorias = new Map();

    listaPois.forEach(p => {
        if (p.categoria && typeof p.categoria === 'string') {
            const catLimpa = p.categoria.trim();
            if (catLimpa !== "") {
                const chaveNorm = normalizarTexto(catLimpa);
                if (!mapaCategorias.has(chaveNorm) || catLimpa.includes('í') || catLimpa.includes('é') || catLimpa.includes('ã')) {
                    mapaCategorias.set(chaveNorm, catLimpa);
                }
            }
        }
    });

    divCats.innerHTML = '';
    const btnTodasCat = document.createElement('button');
    btnTodasCat.setAttribute('data-val', 'TODAS_CATS');
    btnTodasCat.className = 'btn-cat bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md font-semibold transition';
    btnTodasCat.textContent = 'Todas';
    btnTodasCat.addEventListener('click', () => clicarCategoria(null));
    divCats.appendChild(btnTodasCat);

    mapaCategorias.forEach((catExibicao) => {
        const btn = document.createElement('button');
        btn.setAttribute('data-val', catExibicao);
        btn.className = 'btn-cat bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60 text-[11px] px-2.5 py-1.5 rounded-md font-medium transition';
        btn.textContent = catExibicao;
        btn.addEventListener('click', () => clicarCategoria(catExibicao));
        divCats.appendChild(btn);
    });

    inicializarFiltroSeculos();
}

function clicarCategoria(valor) {
    catSelecionada = valor;
    tagSelecionada = null;
    atualizarCoresBotoes();
    filtrarGeral();
}

function clicarTag(valor) {
    tagSelecionada = valor;
    catSelecionada = null;
    atualizarCoresBotoes();
    filtrarGeral();
}

function atualizarCoresBotoes() {
    document.querySelectorAll('.btn-cat').forEach(b => {
        const ativa = b.getAttribute('data-val') === (catSelecionada || 'TODAS_CATS');
        b.className = ativa
            ? "btn-cat bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md font-semibold transition"
            : "btn-cat bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60 text-[11px] px-2.5 py-1.5 rounded-md font-medium transition";
    });
    document.querySelectorAll('.btn-tag').forEach(b => {
        const ativa = b.getAttribute('data-val') === (tagSelecionada || 'TODAS_TAGS');
        b.className = ativa
            ? "btn-tag bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-md font-semibold transition"
            : "btn-tag bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60 text-[11px] px-2.5 py-1.5 rounded-md font-medium transition";
    });
}

function filtrarPorEpoca(epoca) {
    epocaSelecionada = epoca && epocaSelecionada !== epoca ? epoca : null;
    document.querySelectorAll('.btn-epoca').forEach(b => {
        const estaAtiva = b.getAttribute('data-epoca') === epocaSelecionada;
        b.className = estaAtiva
            ? "btn-epoca bg-slate-900 text-white text-[10px] p-2 rounded-lg font-bold transition text-left"
            : "btn-epoca bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] p-2 rounded-lg font-medium transition text-left";
    });
    filtrarGeral();
}

function obterSeculoPoi(poi) {
    const fontes = [
        poi.ano, poi.data, poi.ano_inicio, poi.data_inicio,
        poi.titulo, poi.descricao, poi.tags ? poi.tags.join(' ') : ''
    ];
    const anos = [];
    fontes.forEach(fonte => {
        if (fonte === null || typeof fonte === 'undefined') return;
        String(fonte).match(/\b(1[0-9]{3}|20[0-9]{2})\b/g)?.forEach(a => anos.push(Number(a)));
    });
    if (!anos.length) return null;
    return Math.floor(Math.min(...anos) / 100) + 1;
}

function nomeSeculoRomanizado(seculo) {
    const valores = [
        [21,'XXI'],[20,'XX'],[19,'XIX'],[18,'XVIII'],[17,'XVII'],
        [16,'XVI'],[15,'XV'],[14,'XIV'],[13,'XIII'],[12,'XII'],[11,'XI'],[10,'X']
    ];
    return valores.find(([n]) => n === seculo)?.[1] || String(seculo);
}

function inicializarFiltroSeculos() {
    const container = document.getElementById('filtro-epoca-container');
    const listaPois = obterListaPois();
    if (!container || listaPois.length === 0) return;
    container.innerHTML = '';
    const existentes = new Map();
    listaPois.forEach(poi => {
        const seculo = obterSeculoPoi(poi);
        if (seculo) existentes.set(seculo, true);
    });
    [...existentes.keys()].sort((a, b) => a - b).forEach(seculo => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-epoca bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] p-2 rounded-lg font-medium transition text-left';
        btn.dataset.epoca = `seculo-${seculo}`;
        btn.textContent = `Século ${nomeSeculoRomanizado(seculo)}`;
        btn.onclick = () => filtrarPorEpoca(`seculo-${seculo}`);
        container.appendChild(btn);
    });
}

function filtrarGeralComDebounce() {
    if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        filtrarGeral();
    }, 200);
}

function filtrarGeral(bypassRoute = false) {
    if (typeof isRouteMode !== 'undefined' && isRouteMode && !bypassRoute) {
        if (typeof limparRota === 'function') limparRota();
    }

    const inputPesquisa = document.getElementById('input-pesquisa');
    const txtBusca = inputPesquisa ? normalizarTexto(inputPesquisa.value) : '';

    const listaPois = obterListaPois();
    const filtrados = listaPois.filter(p => {
        const dadosPesquisa = obterDadosPesquisaPoi(p);
        const tituloNorm = dadosPesquisa.titulo;
        const descNorm   = dadosPesquisa.descricao;
        const okTexto = !txtBusca || tituloNorm.includes(txtBusca) || descNorm.includes(txtBusca);

        const catNorm = dadosPesquisa.categoria;
        const catSelNorm = normalizarTexto(catSelecionada);
        const okCat = !catSelecionada || (catNorm !== '' && catNorm === catSelNorm);

        let okTag = true;
        if (tagSelecionada) {
            okTag = false;
            if (p.tags && Array.isArray(p.tags)) {
                okTag = p.tags.some(t => {
                    if (!t) return false;
                    return t.includes(tagSelecionada) || normalizarTexto(t).includes(normalizarTexto(tagSelecionada));
                });
            }
        }

        let okEpoca = true;
        if (epocaSelecionada) {
            const seculoPoi = obterSeculoPoi(p);
            if (epocaSelecionada === 'sem-data') okEpoca = seculoPoi === null;
            else if (epocaSelecionada.startsWith('seculo-')) {
                okEpoca = seculoPoi === Number(epocaSelecionada.replace('seculo-', ''));
            } else {
                okEpoca = true;
            }
        }

        return okTexto && okCat && okTag && okEpoca;
    });

    if (typeof renderMarkers === 'function') {
        renderMarkers(filtrados);
    }

    if (typeof telemetry !== 'undefined' && txtBusca) {
        telemetry.registrarBusca(txtBusca, filtrados.length);
    }
}

// =========================================================================
// 4. BOTTOM SHEET: DETALHES DO PONTO DE INTERESSE
// =========================================================================

function abrirDetalhesPoi(poi) {
    openedPoi = poi;
    pararAudioGuia();
    if (typeof telemetry !== 'undefined') {
        telemetry.registrarVisualizacaoPoi(poi.id);
        telemetry.iniciarDwellTime(poi.id);
    }

    // Título e Descrição
    const tituloEl = document.getElementById('poi-titulo');
    const descEl = document.getElementById('poi-desc');
    if (tituloEl) tituloEl.innerText = textoPoiLocalizado(poi, 'titulo') || "Sem título";
    if (descEl) descEl.innerText = textoPoiLocalizado(poi, 'descricao') || "Descrição detalhada em elaboração pelo acervo.";

    // Renderiza Carrossel via CarouselModule
    const containerImg = document.getElementById('img-atual');
    if (containerImg && typeof CarouselModule !== 'undefined') {
        CarouselModule.renderizar(containerImg, poi);
    }

    // Badge de Categoria
    const catBadge = document.getElementById('poi-categoria-badge');
    if (catBadge) {
        if (poi.categoria && typeof poi.categoria === 'string' && poi.categoria.trim() !== "") {
            catBadge.innerText = poi.categoria;
            catBadge.classList.remove('hidden');
        } else {
            catBadge.classList.add('hidden');
        }
    }

    // Bloco de Notas / Observações
    const blocoNotas = document.getElementById('poi-bloco-notas');
    const textoNotas = document.getElementById('poi-texto-notas');
    if (blocoNotas && textoNotas) {
        if (poi.observacao && typeof poi.observacao === 'string' && poi.observacao.trim() !== "") {
            textoNotas.innerText = poi.observacao;
            blocoNotas.classList.remove('hidden');
        } else {
            blocoNotas.classList.add('hidden');
        }
    }

    // Atualiza Distância GPS se o módulo de rotas estiver carregado
    if (typeof atualizarDistanciaPoi === 'function') {
        atualizarDistanciaPoi();
    }

    // Carrega notas pessoais do visitante (NotesModule)
    if (typeof NotesModule !== 'undefined') {
        NotesModule.carregarNotaPoi(poi.id);
    }

    // Atualiza estado do carimbo no passaporte (PassportModule)
    if (typeof PassportModule !== 'undefined') {
        PassportModule.atualizarEstadoBotaoCarimbo();
    }

    // Centralização Suave do Mapa
    const pLng = poi.lng ?? 0;
    if (typeof map !== 'undefined' && map && poi.lat && pLng) {
        map.panTo(new L.LatLng(poi.lat - 0.0035, pLng), { animate: true, duration: 0.5 });
    }

    // Atualiza URL com Deep Link (?poi=ID)
    if (window.history && window.history.replaceState) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('poi', poi.id);
        const novaUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({ poiId: poi.id }, '', novaUrl);
    }

    // Exibe o painel inferior
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.add('open');
}

function fecharSheet() {
    pararAudioGuia();
    if (typeof telemetry !== 'undefined') telemetry.finalizarDwellTime();
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.remove('open');
    openedPoi = null;

    if (window.history && window.history.replaceState) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('poi');
        const novaUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', novaUrl);
    }
}

function compartilharPoi() {
    if (!openedPoi) return;

    const urlPoi = `${window.location.origin}${window.location.pathname}?poi=${openedPoi.id}`;
    const titulo = `${openedPoi.titulo} | Recife: Museu a Céu Aberto`;
    const texto = `Conheça ${openedPoi.titulo} na cartografia histórica interativa Recife: Museu a Céu Aberto:`;

    if (navigator.share) {
        navigator.share({
            title: titulo,
            text: texto,
            url: urlPoi
        }).catch(err => {
            if (err.name !== 'AbortError') {
                console.warn('Erro ao compartilhar nativamente:', err);
            }
        });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(urlPoi).then(() => {
            alert(`Link do local copiado para a área de transferência!\n\n${urlPoi}`);
        }).catch(() => {
            prompt('Copie o link abaixo para compartilhar:', urlPoi);
        });
    } else {
        prompt('Copie o link abaixo para compartilhar:', urlPoi);
    }
}

// =========================================================================
// 5. INTERNACIONALIZAÇÃO (I18N)
// =========================================================================

function mudarIdioma(lang) {
    idiomaAtual = lang;
    localStorage.setItem('recife_mca_idioma', lang);

    if (typeof i18n !== 'undefined' && i18n.setIdioma) {
        i18n.setIdioma(lang);
    } else {
        ['pt', 'en', 'es'].forEach(l => {
            const btn = document.getElementById(`btn-lang-${l}`);
            if (!btn) return;
            if (l === lang) {
                btn.className = "px-2 py-0.5 text-[10px] font-bold rounded bg-white text-slate-800 shadow-xs transition";
            } else {
                btn.className = "px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-800 transition";
            }
        });
    }

    if (typeof AudioGuideModule !== 'undefined' && AudioGuideModule.estaTocando()) {
        tocarAudioGuia();
    }
    if (typeof openedPoi !== 'undefined' && openedPoi && typeof abrirDetalhesPoi === 'function') {
        abrirDetalhesPoi(openedPoi);
    }
    document.querySelectorAll('.navbar-lang').forEach(btn => {
        const ativo = btn.id === `btn-lang-${lang}`;
        btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });
}

// =========================================================================
// 6. FACHADAS & DELEGAÇÕES PARA MÓDULOS ESPECIALIZADOS
// =========================================================================

// Audioguia (AudioGuideModule)
function alternarAudioGuia() {
    return AudioGuideModule.alternar();
}
function tocarAudioGuia(poi) {
    return AudioGuideModule.tocar(poi);
}
function pararAudioGuia() {
    return AudioGuideModule.parar();
}
function atualizarBotaoAudio(tocando) {
    return AudioGuideModule.atualizarBotaoAudio(tocando);
}

// Notas e Diário de Campo (NotesModule)
function carregarNotaPoi(poiId) {
    return NotesModule.carregarNotaPoi(poiId);
}
function salvarNotaPoi() {
    return NotesModule.salvarNotaPoi();
}
function limparNotaPoi() {
    return NotesModule.limparNotaPoi();
}
function enviarContribuicaoCuradoria() {
    return NotesModule.enviarContribuicaoCuradoria();
}
function abrirModalColaborar() {
    return NotesModule.abrirModalColaborar();
}
function fecharModalColaborar() {
    return NotesModule.fecharModalColaborar();
}
function confirmarEnvioColaboracao() {
    return NotesModule.confirmarEnvioColaboracao();
}

// Passaporte Cultural & Certificado (PassportModule)
function obterLocaisVisitados() {
    return PassportModule.obterLocaisVisitados();
}
function alternarCarimboPassaporte() {
    return PassportModule.alternarCarimboPassaporte();
}
function atualizarEstadoBotaoCarimbo() {
    return PassportModule.atualizarEstadoBotaoCarimbo();
}
function atualizarInterfacePassaporte() {
    return PassportModule.atualizarInterfacePassaporte();
}
function abrirModalPassaporte() {
    return PassportModule.abrirModalPassaporte();
}
function fecharModalPassaporte() {
    return PassportModule.fecharModalPassaporte();
}
function exibirCertificado(roteiroChave) {
    return PassportModule.exibirCertificado(roteiroChave);
}
function fecharCertificado() {
    return PassportModule.fecharCertificado();
}
function compartilharCertificado() {
    return PassportModule.compartilharCertificado();
}

// Modais Gerais, Auth & Onboarding (ModalsModule)
function abrirSobre() {
    return ModalsModule.abrirSobre();
}
function fecharSobre() {
    return ModalsModule.fecharSobre();
}
function abrirModalPrivacidade() {
    return ModalsModule.abrirModalPrivacidade();
}
function fecharModalPrivacidade() {
    return ModalsModule.fecharModalPrivacidade();
}
function abrirModalAuth() {
    return ModalsModule.abrirModalAuth();
}
function fecharModalAuth() {
    return ModalsModule.fecharModalAuth();
}
function abrirConfiguracaoPerfilLocal() {
    return ModalsModule.abrirConfiguracaoPerfilLocal();
}
function limparDadosLocaisMvp() {
    return ModalsModule.limparDadosLocaisMvp();
}
function abrirModalOnboarding() {
    return ModalsModule.abrirModalOnboarding();
}
function fecharModalOnboarding() {
    return ModalsModule.fecharModalOnboarding();
}
function salvarOnboardingPerfil() {
    return ModalsModule.salvarOnboardingPerfil();
}

// Painel da Curadoria (DashboardModule)
function abrirDashboardCuradoria() {
    return DashboardModule.abrirDashboardCuradoria();
}
function abrirModalDashboardCuradoria() {
    return DashboardModule.abrirModalDashboardCuradoria();
}
function fecharDashboardCuradoria() {
    return DashboardModule.fecharDashboardCuradoria();
}
function filtrarDashboard(tipo) {
    return DashboardModule.filtrarDashboard(tipo);
}
function renderizarGraficosDashboard() {
    return DashboardModule.renderizarGraficosDashboard();
}

// Gestos Touch (GesturesModule)
function inicializarGestosBottomSheet() {
    return GesturesModule.inicializarGestosBottomSheet();
}
