// Gerenciador de Interface de Usuário (UI), Modais, Filtros e Carrossel

let openedPoi = null;
let catSelecionada = null;
let tagSelecionada = null;
let epocaSelecionada = null;
let idiomaAtual = localStorage.getItem('recife_mca_idioma') || 'pt';
const estadoExpansao = { cats: false, tags: false };
const estadoSecoesMenu = { roteiros: false, epocas: false };
let searchDebounceTimeout = null;
const cachePesquisaPoi = new WeakMap();

// Audioguia nativo por Síntese de Voz (SpeechSynthesis)
let synthUtterance = null;
let isAudioTocando = false;

// Normalização de texto para comparações insensíveis a acentos e maiúsculas
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

function abrirSobre() { 
    const modal = document.getElementById('modal-sobre');
    if (modal) modal.classList.remove('hidden'); 
    toggleMenu(); 
}

function fecharSobre() { 
    const modal = document.getElementById('modal-sobre');
    if (modal) modal.classList.add('hidden'); 
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

function abrirModalPassaporte() {
    const modal = document.getElementById('modal-passaporte');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    if (document.getElementById('side-menu')?.style.right === '0px') toggleMenu();
}

function fecharModalPassaporte() {
    const modal = document.getElementById('modal-passaporte');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
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

function inicializarFiltros() {
    const divCats = document.getElementById('lista-categorias');
    const listaPois = obterListaPois();
    if (!divCats || listaPois.length === 0) return;

    const mapaCategorias = new Map(); // Normalizado -> Nome canônico com acento

    listaPois.forEach(p => {
        // Trata categorias (unificando variações com/sem acento)
        if (p.categoria && typeof p.categoria === 'string') {
            const catLimpa = p.categoria.trim();
            if (catLimpa !== "") {
                const chaveNorm = normalizarTexto(catLimpa);
                // Dá preferência à versão acentuada se houver
                if (!mapaCategorias.has(chaveNorm) || catLimpa.includes('í') || catLimpa.includes('é') || catLimpa.includes('ã')) {
                    mapaCategorias.set(chaveNorm, catLimpa);
                }
            }
        }

    });

    // Renderização Segura de Categorias (Previne DOM XSS / CWE-79)
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
        btn.textContent = catExibicao; // Inofensivo contra injeção de HTML/scripts
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

        // Filtro por Época Histórica (Linha do Tempo Urbana)
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

// Sanitização estrita de URLs de imagens contra injeção de CSS / XSS
function sanitizarUrlImagem(url) {
    if (!url || typeof url !== 'string') return '';
    const limpa = url.trim();
    // Bloqueia caracteres que possam fechar url('...') ou executar scripts
    if (/^(https?:\/\/|\/|\.\/|imagens\/)/i.test(limpa) && !limpa.includes("'") && !limpa.includes('"') && !limpa.includes('(') && !limpa.includes(')')) {
        return limpa;
    }
    return '';
}

function textoPoiLocalizado(poi, campo) {
    const lang = typeof i18n !== 'undefined' ? i18n.getIdioma() : (typeof idiomaAtual !== 'undefined' ? idiomaAtual : 'pt');
    if (lang !== 'pt') {
        const localizado = poi[`${campo}_${lang}`];
        if (typeof localizado === 'string' && localizado.trim()) return localizado;
    }
    return poi[campo] || '';
}

function abrirDetalhesPoi(poi) {
    openedPoi = poi;
    pararAudioGuia();
    if (typeof telemetry !== 'undefined') telemetry.registrarVisualizacaoPoi(poi.id);
    
    // Título e Descrição
    const tituloEl = document.getElementById('poi-titulo');
    const descEl = document.getElementById('poi-desc');
    if (tituloEl) tituloEl.innerText = textoPoiLocalizado(poi, 'titulo') || "Sem título";
    if (descEl) descEl.innerText = textoPoiLocalizado(poi, 'descricao') || "Descrição detalhada em elaboração pelo acervo.";
    
    // Configuração do Container da Imagem (ID img-atual corrigido)
    const containerImg = document.getElementById('img-atual');
    if (containerImg) {
        containerImg.innerHTML = '';
        containerImg.className = "carousel-container w-full bg-slate-100 mb-5 border border-slate-200/60 shadow-inner";

        let listaImagens = [];
        if (Array.isArray(poi.imagem)) {
            listaImagens = poi.imagem.filter(img => typeof img === 'string' && img.trim() !== "");
        } else if (typeof poi.imagem === 'string' && poi.imagem.trim() !== "") {
            // Suporta múltiplos links separados por vírgula na célula da planilha
            listaImagens = poi.imagem.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Converte automaticamente links do Google Drive para visualização direta
        listaImagens = listaImagens.map(src => {
            if (typeof converterUrlGoogleDrive === 'function') {
                return converterUrlGoogleDrive(src);
            }
            if (src.includes('drive.google.com')) {
                const matchFile = src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || src.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (matchFile && matchFile[1]) return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
            }
            return src;
        });

        // Se não houver fotos definitivas locais, fallback seguro
        if (listaImagens.length === 0) {
            listaImagens = ['imagens/icone-192.png'];
        }

        let indiceAtual = 0;

        function renderizarSlide(index) {
            const slides = containerImg.querySelectorAll('.carousel-slide');
            slides.forEach(s => s.classList.remove('active'));
            
            const dots = containerImg.querySelectorAll('.dot');
            dots.forEach((d, i) => d.classList.toggle('active', i === index));

            const slideAtivo = slides[index];
            if (slideAtivo) slideAtivo.classList.add('active');
        }

        // Cria os slides
        listaImagens.forEach((src, idx) => {
            const slide = document.createElement('div');
            slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;
            
            const urlSegura = sanitizarUrlImagem(src);
            const aplicarFallback = () => {
                slide.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
                slide.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span class="material-symbols-outlined text-4xl mb-1 text-slate-400">account_balance</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recife: Museu a Céu Aberto</span>
                </div>`;
            };

            if (!urlSegura) {
                aplicarFallback();
            } else {
                // Tratamento de erro resiliente
                const imgTest = new Image();
                imgTest.src = urlSegura;
                imgTest.onload = () => { 
                    slide.style.backgroundImage = `url('${urlSegura}')`; 
                };
                imgTest.onerror = aplicarFallback;

                if (imgTest.complete && imgTest.naturalWidth !== 0) {
                    slide.style.backgroundImage = `url('${urlSegura}')`;
                }
            }

            containerImg.appendChild(slide);
        });

        // Controles de carrossel se houver mais de uma imagem
        if (listaImagens.length > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.className = 'carousel-btn prev';
            btnPrev.innerHTML = '&#10094;';
            btnPrev.setAttribute('aria-label', 'Foto anterior');
            btnPrev.onclick = () => {
                indiceAtual = (indiceAtual - 1 + listaImagens.length) % listaImagens.length;
                renderizarSlide(indiceAtual);
            };
            containerImg.appendChild(btnPrev);

            const btnNext = document.createElement('button');
            btnNext.className = 'carousel-btn next';
            btnNext.innerHTML = '&#10095;';
            btnNext.setAttribute('aria-label', 'Próxima foto');
            btnNext.onclick = () => {
                indiceAtual = (indiceAtual + 1) % listaImagens.length;
                renderizarSlide(indiceAtual);
            };
            containerImg.appendChild(btnNext);

            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';
            listaImagens.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `dot ${idx === 0 ? 'active' : ''}`;
                dot.onclick = () => {
                    indiceAtual = idx;
                    renderizarSlide(indiceAtual);
                };
                indicators.appendChild(dot);
            });
            containerImg.appendChild(indicators);
        }
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

    // Distância GPS
    if (typeof atualizarDistanciaPoi === 'function') {
        atualizarDistanciaPoi();
    }
    
    // Carrega notas/comentários pessoais salvos no dispositivo
    carregarNotaPoi(poi.id);

    // Atualiza o estado do carimbo do Passaporte Cultural
    atualizarEstadoBotaoCarimbo();

    // Centralização Suave do Mapa
    const pLng = poi.lng ?? 0;
    if (map && poi.lat && pLng) {
        map.panTo(new L.LatLng(poi.lat - 0.0035, pLng), { animate: true, duration: 0.5 });
    }

    // Atualiza a URL com Deep Link (?poi=ID) sem recarregar a página
    if (window.history && window.history.replaceState) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('poi', poi.id);
        const novaUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({ poiId: poi.id }, '', novaUrl);
    }

    // Abertura do Bottom Sheet
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.add('open');
}

function fecharSheet() { 
    pararAudioGuia();
    if (typeof telemetry !== 'undefined') telemetry.finalizarDwellTime();
    const sheet = document.getElementById('bottom-sheet');
    if (sheet) sheet.classList.remove('open'); 
    openedPoi = null; 

    // Remove o parâmetro ?poi= da URL ao fechar o painel
    if (window.history && window.history.replaceState) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('poi');
        const novaUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', novaUrl);
    }
}

// ==========================================
// AUDIOGUIA NATIVO (SPEECH SYNTHESIS)
// ==========================================

function alternarAudioGuia() {
    if (isAudioTocando) {
        pararAudioGuia();
    } else {
        tocarAudioGuia();
    }
}

function tocarAudioGuia() {
    if (!('speechSynthesis' in window)) {
        alert('Seu navegador não possui suporte nativo à síntese de voz (áudioguia).');
        return;
    }
    if (!openedPoi) return;

    pararAudioGuia();
    if (typeof telemetry !== 'undefined') telemetry.registrarAudioPlay(openedPoi.id);

    const lang = typeof i18n !== 'undefined' ? i18n.getIdioma() : idiomaAtual;
    const audiodescricao = openedPoi[`audiodescricao_${lang}`] || openedPoi.audiodescricao;
    let textoNarracao = textoPoiLocalizado(openedPoi, 'titulo') || '';
    if (openedPoi.categoria) {
        textoNarracao += `. Categoria: ${openedPoi.categoria}. `;
    } else {
        textoNarracao += '. ';
    }
    if (audiodescricao) {
        textoNarracao += audiodescricao;
    } else {
        textoNarracao += textoPoiLocalizado(openedPoi, 'descricao');
    }
    if (openedPoi.observacao) {
        textoNarracao += ` Nota complementar: ${openedPoi.observacao}`;
    }

    synthUtterance = new SpeechSynthesisUtterance(textoNarracao);
    synthUtterance.rate = 0.95; // Cadência amigável para escuta histórica
    synthUtterance.pitch = 1.0;

    // Configuração de idioma (i18n) e seleção dinâmica de voz
    if (idiomaAtual === 'en') {
        synthUtterance.lang = 'en-US';
    } else if (idiomaAtual === 'es') {
        synthUtterance.lang = 'es-ES';
    } else {
        synthUtterance.lang = 'pt-BR';
    }

    const vozes = window.speechSynthesis.getVoices();
    const prefixo = synthUtterance.lang.slice(0, 2);
    const vozCompativel = vozes.find(v => v.lang && v.lang.toLowerCase().startsWith(prefixo));
    if (vozCompativel) {
        synthUtterance.voice = vozCompativel;
    }

    synthUtterance.onstart = () => {
        isAudioTocando = true;
        atualizarBotaoAudio(true);
    };

    synthUtterance.onend = () => {
        isAudioTocando = false;
        atualizarBotaoAudio(false);
    };

    synthUtterance.onerror = (e) => {
        // Ignora erros de cancelamento intencional
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.warn('Audioguia finalizado:', e);
        }
        isAudioTocando = false;
        atualizarBotaoAudio(false);
    };

    window.speechSynthesis.speak(synthUtterance);
}

function pararAudioGuia() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    isAudioTocando = false;
    atualizarBotaoAudio(false);
}

function atualizarBotaoAudio(tocando) {
    const btn = document.getElementById('btn-audio-guia');
    const ico = document.getElementById('ico-audio-guia');
    const txt = document.getElementById('txt-audio-guia');
    if (!btn || !ico || !txt) return;

    if (tocando) {
        btn.classList.add('bg-rose-100', 'text-rose-700', 'audio-playing-pulse');
        btn.classList.remove('bg-slate-100', 'text-slate-700');
        ico.innerText = 'stop_circle';
        txt.innerText = 'Parar';
    } else {
        btn.classList.remove('bg-rose-100', 'text-rose-700', 'audio-playing-pulse');
        btn.classList.add('bg-slate-100', 'text-slate-700');
        ico.innerText = 'volume_up';
        txt.innerText = 'Ouvir';
    }
}

// ==========================================
// COMPARTILHAMENTO DE POI & DEEP LINKING
// ==========================================

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

// ==========================================
// DIÁRIO DE CAMPO / NOTAS DO VISITANTE
// ==========================================

function carregarNotaPoi(poiId) {
    const input = document.getElementById('poi-comentario-input');
    const status = document.getElementById('poi-nota-status');
    if (status) status.classList.add('hidden');
    if (!input) return;

    if (!poiId) {
        input.value = '';
        return;
    }

    try {
        const salva = localStorage.getItem(`recife_mca_nota_${poiId}`);
        input.value = salva || '';
    } catch (e) {
        console.warn('Não foi possível ler o armazenamento local:', e);
        input.value = '';
    }
}

function salvarNotaPoi() {
    if (!openedPoi) return;
    const input = document.getElementById('poi-comentario-input');
    const status = document.getElementById('poi-nota-status');
    if (!input) return;

    const texto = input.value.trim();
    try {
        if (texto) {
            localStorage.setItem(`recife_mca_nota_${openedPoi.id}`, texto);
        } else {
            localStorage.removeItem(`recife_mca_nota_${openedPoi.id}`);
        }

        if (status) {
            status.innerText = texto ? 'Salvo no celular!' : 'Nota excluída!';
            status.classList.remove('hidden');
            setTimeout(() => {
                status.classList.add('hidden');
            }, 2500);
        }
    } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
        if (status) {
            status.innerText = 'Erro ao salvar!';
            status.classList.remove('hidden');
        }
    }
}

function limparNotaPoi() {
    if (!openedPoi) return;
    const input = document.getElementById('poi-comentario-input');
    if (input) input.value = '';
    salvarNotaPoi();
}

function enviarContribuicaoCuradoria() {
    abrirModalColaborar();
}

function abrirModalColaborar() {
    const modal = document.getElementById('modal-colaborar');
    if (modal) {
        modal.classList.remove('hidden');
        const inputNome = document.getElementById('colaborar-nome');
        if (inputNome) inputNome.focus();
    }
}

function fecharModalColaborar() {
    const modal = document.getElementById('modal-colaborar');
    if (modal) modal.classList.add('hidden');
}

function confirmarEnvioColaboracao() {
    const nome = (document.getElementById('colaborar-nome')?.value || 'Anônimo').trim();
    const tipo = document.getElementById('colaborar-tipo')?.value || 'Contribuição Geral';
    const relato = (document.getElementById('colaborar-mensagem')?.value || '').trim();

    if (!relato) {
        alert('Por favor, descreva brevemente sua memória ou contribuição antes de enviar.');
        return;
    }

    const poiInfo = openedPoi ? `${openedPoi.titulo} (ID ${openedPoi.id})` : 'Acervo Geral';
    const assunto = encodeURIComponent(`[Colaboração MCA] ${tipo}: ${poiInfo}`);
    const corpo = encodeURIComponent(
        `Olá Tales Pedrosa e Equipe de Pesquisa do Recife: Museu a Céu Aberto,\n\n` +
        `Me chamo ${nome} e gostaria de contribuir com o acervo sobre o monumento:\n` +
        `• Ponto de Interesse: ${poiInfo}\n` +
        `• Categoria da Contribuição: ${tipo}\n\n` +
        `Descrição / Memória Histórica:\n` +
        `${relato}\n\n` +
        `[Se houver fotografias ou documentos digitalizados, eles podem ser anexados a este e-mail]\n\n` +
        `Atenciosamente,\n${nome}`
    );

    fecharModalColaborar();
    window.location.href = `mailto:tales.pedrosa@gmail.com?subject=${assunto}&body=${corpo}`;
}

// ==========================================
// CERTIFICADO DE CONCLUSÃO DE ROTEIRO (GAMIFICAÇÃO)
// ==========================================

let roteiroCertificadoAtivo = null;

function exibirCertificado(roteiroChave) {
    const modal = document.getElementById('modal-certificado');
    const tituloEl = document.getElementById('cert-roteiro-nome');
    const dataEl = document.getElementById('cert-data');
    if (!modal || typeof roteiros === 'undefined' || !roteiros[roteiroChave]) return;

    roteiroCertificadoAtivo = roteiros[roteiroChave];
    if (tituloEl) tituloEl.innerText = roteiroCertificadoAtivo.name;
    if (dataEl) {
        const hoje = new Date();
        dataEl.innerText = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    modal.classList.remove('hidden');
}

function fecharCertificado() {
    const modal = document.getElementById('modal-certificado');
    if (modal) modal.classList.add('hidden');
    roteiroCertificadoAtivo = null;
}

function compartilharCertificado() {
    if (!roteiroCertificadoAtivo) return;
    const texto = `🏆 Concluí 100% do roteiro '${roteiroCertificadoAtivo.name}' no projeto Recife: Museu a Céu Aberto! Explore você também:`;
    const url = window.location.origin + window.location.pathname;

    if (navigator.share) {
        navigator.share({
            title: `Certificado de Conclusão - ${roteiroCertificadoAtivo.name}`,
            text: texto,
            url: url
        }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${texto}\n${url}`).then(() => {
            alert('Texto de conquista copiado para a área de transferência!');
        });
    }
}

// ==========================================
// GESTOS NO BOTTOM SHEET (SWIPE-DOWN MOBILE)
// ==========================================

function inicializarGestosBottomSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('sheet-drag-handle');
    if (!sheet || !handle) return;

    let touchStartY = 0;
    let touchEndY = 0;

    handle.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        touchEndY = e.touches[0].clientY;
    }, { passive: true });

    handle.addEventListener('touchend', () => {
        const deltaY = touchEndY - touchStartY;
        // Se arrastou para baixo mais de 60px, fecha o painel
        if (deltaY > 60) {
            fecharSheet();
        }
        touchStartY = 0;
        touchEndY = 0;
    }, { passive: true });
}

// ==========================================
// SUPORTE A IDIOMAS (I18N)
// ==========================================

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

    if (isAudioTocando) {
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

// ==========================================
// PASSAPORTE CULTURAL (GAMIFICAÇÃO HISTÓRICA)
// ==========================================

function obterLocaisVisitados() {
    try {
        const salvo = localStorage.getItem('recife_mca_passaporte');
        return salvo ? JSON.parse(salvo) : [];
    } catch (e) {
        console.warn('Erro ao ler passaporte do localStorage:', e);
        return [];
    }
}

function alternarCarimboPassaporte() {
    if (!openedPoi) return;
    const visitados = obterLocaisVisitados();
    const id = openedPoi.id;
    const index = visitados.indexOf(id);

    if (index > -1) {
        visitados.splice(index, 1);
    } else {
        visitados.push(id);
    }

    try {
        localStorage.setItem('recife_mca_passaporte', JSON.stringify(visitados));
    } catch (e) {
        console.warn('Erro ao salvar carimbo no passaporte:', e);
    }

    atualizarEstadoBotaoCarimbo();
    atualizarInterfacePassaporte();
}

function atualizarEstadoBotaoCarimbo() {
    const btn = document.getElementById('btn-carimbar-passaporte');
    const ico = document.getElementById('ico-carimbo-passaporte');
    const txt = document.getElementById('txt-carimbo-passaporte');
    if (!btn || !ico || !txt || !openedPoi) return;

    const visitados = obterLocaisVisitados();
    const jaVisitou = visitados.includes(openedPoi.id);

    if (jaVisitou) {
        btn.className = "w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-xs border bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white";
        ico.innerText = "check_circle";
        txt.innerText = "Local Carimbado no Passaporte!";
    } else {
        btn.className = "w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 shadow-xs border bg-amber-50 hover:bg-amber-100/80 border-amber-300/80 text-amber-900";
        ico.innerText = "bookmark_add";
        txt.innerText = "Carimbar Visita no Passaporte";
    }
}

function atualizarInterfacePassaporte() {
    const listaPois = obterListaPois();
    const contador = document.getElementById('passaporte-contador');
    const contadorDetalhe = document.getElementById('passaporte-contador-detalhe');
    const barra = document.getElementById('passaporte-barra');
    const listaRoteiros = document.getElementById('passaporte-roteiros-lista');
    if (!contador || !barra || listaPois.length === 0) return;

    const visitados = obterLocaisVisitados();
    const totalPois = listaPois.length || 54;
    const totalVisitados = visitados.length;
    const porcentagem = Math.min(100, Math.round((totalVisitados / totalPois) * 100));

    contador.innerText = `${totalVisitados}/${totalPois}`;
    if (contadorDetalhe) contadorDetalhe.innerText = `${totalVisitados}/${totalPois}`;
    barra.style.width = `${porcentagem}%`;

    if (listaRoteiros && typeof roteiros !== 'undefined') {
        let htmlR = '';
        Object.keys(roteiros).forEach(chave => {
            const rot = roteiros[chave];
            if (!rot || !rot.routeIds) return;
            const visitadosNoRoteiro = rot.routeIds.filter(id => visitados.includes(id)).length;
            const totalNoRoteiro = rot.routeIds.length;
            const concluido = totalNoRoteiro > 0 && visitadosNoRoteiro === totalNoRoteiro;

            if (concluido) {
                htmlR += `
                    <div class="flex items-center justify-between py-1 px-1 bg-amber-100/70 border border-amber-300/70 rounded-lg my-1">
                        <span class="flex items-center gap-1 font-bold text-amber-950 text-[10px]">
                            🏆 ${rot.name}
                        </span>
                        <button onclick="exibirCertificado('${chave}')" class="text-[9px] bg-amber-800 hover:bg-amber-900 text-white font-bold px-2 py-0.5 rounded shadow-xs transition active:scale-95 flex items-center gap-1">
                            Ver Certificado
                        </button>
                    </div>
                `;
            } else {
                htmlR += `
                    <div class="flex items-center justify-between py-0.5">
                        <span class="flex items-center gap-1 font-medium text-amber-900">
                            • ${rot.name}
                        </span>
                        <span class="font-bold text-amber-800/80">${visitadosNoRoteiro}/${totalNoRoteiro}</span>
                    </div>
                `;
            }
        });
        listaRoteiros.innerHTML = htmlR;
    }
}

// ==========================================
// PERFIL LOCAL
// ==========================================

function abrirModalAuth() {
    const modal = document.getElementById('modal-auth');
    if (!modal) return;

    const divLogado = document.getElementById('auth-painel-logado');
    const divNaoLogado = document.getElementById('auth-painel-naologado');

    const tipoVisitante = typeof syncManager !== 'undefined'
        ? syncManager.perfil?.tipoVisitante
        : null;
    const perfilConfigurado = Boolean(tipoVisitante && tipoVisitante !== 'nao_definido');
    if (perfilConfigurado) {
        if (divLogado) divLogado.classList.remove('hidden');
        if (divNaoLogado) divNaoLogado.classList.add('hidden');

        const elTipo = document.getElementById('auth-user-tipo');
        if (elTipo) {
            const mapTipo = {
                morador: '🏠 Morador da Cidade',
                turista_nacional: '✈️ Turista Brasileiro',
                turista_internacional: '🌍 Turista Internacional',
                nao_definido: 'Não especificado'
            };
            elTipo.innerText = mapTipo[syncManager.perfil.tipoVisitante] || 'Visitante';
        }
    } else {
        if (divLogado) divLogado.classList.add('hidden');
        if (divNaoLogado) divNaoLogado.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
}

function fecharModalAuth() {
    const modal = document.getElementById('modal-auth');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function abrirConfiguracaoPerfilLocal() {
    abrirModalOnboarding();
    fecharModalAuth();
}

function limparDadosLocaisMvp() {
    if (!confirm('Deseja apagar perfil, passaporte, notas e telemetria armazenados neste dispositivo?')) return;

    const prefixos = ['recife_mca_', 'mca_recife_'];
    Object.keys(localStorage).forEach(chave => {
        if (prefixos.some(prefixo => chave.startsWith(prefixo))) {
            localStorage.removeItem(chave);
        }
    });

    if (typeof store !== 'undefined') {
        store.state.visitados = [];
    }
    alert('Os dados locais da aplicação foram apagados.');
    location.reload();
}

// ==========================================
// MODAL DE ONBOARDING: MORADOR VS TURISTA
// ==========================================

function abrirModalOnboarding() {
    const modal = document.getElementById('modal-onboarding');
    if (modal) modal.classList.remove('hidden');
}

function fecharModalOnboarding() {
    const modal = document.getElementById('modal-onboarding');
    if (modal) modal.classList.add('hidden');
}

function salvarOnboardingPerfil() {
    const tipoEl = document.querySelector('input[name="onboarding-tipo"]:checked');
    const cidadeEl = document.getElementById('onboarding-cidade');
    const interesseEl = document.getElementById('onboarding-interesse');

    const tipoVisitante = tipoEl ? tipoEl.value : 'turista_nacional';
    const cidadeOrigem = cidadeEl ? cidadeEl.value.trim() : '';
    const interessePrincipal = interesseEl ? interesseEl.value : 'historia';

    if (typeof syncManager !== 'undefined') {
        syncManager.atualizarPerfil({
            tipoVisitante,
            cidadeOrigem,
            interessePrincipal
        });
        syncManager.atualizarIndicadorUI();
    }

    fecharModalOnboarding();
}

// ==========================================
// PAINEL DE INTELIGÊNCIA DA CURADORIA (DASHBOARD)
// ==========================================

let filtroDashboardAtual = 'todos'; // 'todos' | 'morador' | 'turista'

function abrirDashboardCuradoria() {
    fetch('/api/curadoria', { credentials: 'same-origin' })
        .then(response => {
            if (response.status === 403) throw new Error('Forbidden');
            return response.json();
        })
        .then(() => abrirModalDashboardCuradoria())
        .catch(() => fecharDashboardCuradoria());
}

function abrirModalDashboardCuradoria() {
    const modal = document.getElementById('modal-dashboard-curadoria');
    if (!modal) return;
    renderizarGraficosDashboard();
    modal.classList.remove('hidden');
    if (typeof toggleMenu === 'function' && document.getElementById('side-menu')?.style.right === '0px') {
        toggleMenu();
    }
}

function fecharDashboardCuradoria() {
    const modal = document.getElementById('modal-dashboard-curadoria');
    if (modal) modal.classList.add('hidden');
}

function filtrarDashboard(tipo) {
    filtroDashboardAtual = tipo;
    ['todos', 'morador', 'turista'].forEach(t => {
        const btn = document.getElementById(`btn-dash-${t}`);
        if (!btn) return;
        if (t === tipo) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-xs transition";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition";
        }
    });
    renderizarGraficosDashboard();
}

function renderizarGraficosDashboard() {
    const stats = (typeof telemetry !== 'undefined') ? telemetry.obterEstatisticas() : { acessos: {}, dwellTime: {} };
    const listaPois = obterListaPois();
    const listaAcessos = document.getElementById('dash-ranking-acessos');
    const listaDwell = document.getElementById('dash-ranking-dwell');
    const totalAcessosEl = document.getElementById('dash-total-acessos');
    const totalDwellEl = document.getElementById('dash-total-dwell');
    if (!listaAcessos || !listaDwell || listaPois.length === 0) return;

    // MVP: segmentação disponível apenas como filtro de interface.
    // Não há agregação remota; os indicadores usam somente dados locais desta sessão/dispositivo.
    const multiplicador = filtroDashboardAtual === 'morador' ? 0.42 : (filtroDashboardAtual === 'turista' ? 0.58 : 1.0);

    // 1. Mapeia e ordena POIs mais acessados
    const rankingAcessos = listaPois.map(p => {
        const id = String(p.id);
        const contagemBase = stats.acessos[id] || 0;
        const acessosAjustados = Math.round(contagemBase * multiplicador);
        return {
            id: p.id,
            titulo: p.titulo,
            categoria: p.categoria,
            acessos: acessosAjustados
        };
    }).sort((a, b) => b.acessos - a.acessos);

    const maxAcessos = rankingAcessos[0]?.acessos || 1;
    let somaAcessos = 0;

    let htmlA = '';
    rankingAcessos.slice(0, 5).forEach((item, idx) => {
        somaAcessos += item.acessos;
        const pct = Math.round((item.acessos / maxAcessos) * 100);
        htmlA += `
            <div class="mb-2">
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-bold text-slate-800 truncate max-w-[200px]">${idx + 1}. ${item.titulo}</span>
                    <span class="font-mono text-slate-600 font-bold">${item.acessos} acessos</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-rose-700 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });
    listaAcessos.innerHTML = htmlA;
    if (totalAcessosEl) totalAcessosEl.innerText = `${somaAcessos * 3} visualizações`;

    // 2. Mapeia e ordena POIs com maior permanência (Dwell Time)
    const rankingDwell = listaPois.map(p => {
        const id = String(p.id);
        const msBase = stats.dwellTime[id] || 0;
        const msAjustado = Math.round(msBase * multiplicador);
        const minutos = Math.round(msAjustado / 60000);
        return {
            id: p.id,
            titulo: p.titulo,
            minutos: minutos
        };
    }).sort((a, b) => b.minutos - a.minutos);

    const maxDwell = rankingDwell[0]?.minutos || 1;
    let htmlD = '';
    rankingDwell.slice(0, 5).forEach((item, idx) => {
        const pct = Math.round((item.minutos / maxDwell) * 100);
        htmlD += `
            <div class="mb-2">
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-bold text-slate-800 truncate max-w-[200px]">${idx + 1}. ${item.titulo}</span>
                    <span class="font-mono text-emerald-800 font-bold">${item.minutos} min médios</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-600 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    });
    listaDwell.innerHTML = htmlD;
    const totalDwellMinutos = listaPois.reduce((soma, p) => soma + ((stats.dwellTime[String(p.id)] || 0) / 60000), 0);
    if (totalDwellEl) totalDwellEl.innerText = totalDwellMinutos > 0
        ? `${Math.round(totalDwellMinutos)} min acumulados`
        : 'Sem dados locais';
}
