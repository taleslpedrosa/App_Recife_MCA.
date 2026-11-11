// Orquestrador Principal da Aplicação (Bootstrap)

// Verifica se há um POI especificado na URL via query string (?poi=ID) ou hash (#poi-ID)
function verificarDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    let poiId = urlParams.get('poi');

    if (!poiId && window.location.hash) {
        const match = window.location.hash.match(/#poi[=-]?(\d+)/i);
        if (match) poiId = match[1];
    }

    if (!poiId || typeof pois === 'undefined') return;

    const idNum = parseInt(poiId, 10);
    const poiEncontrado = pois.find(p => p.id === idNum || String(p.id) === String(poiId));

    if (poiEncontrado && typeof abrirDetalhesPoi === 'function') {
        // Leve atraso para garantir que o mapa Leaflet calculou as dimensões do container
        setTimeout(() => {
            abrirDetalhesPoi(poiEncontrado);
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa o Mapa Leaflet
    if (typeof initMap === 'function') {
        initMap();
    }

    // Renderiza imediatamente os POIs locais. A sincronizacao remota e
    // opcional e nao pode deixar o mapa vazio enquanto aguarda ou falha.
    if (typeof store !== 'undefined' && typeof pois !== 'undefined' && store.setPois) {
        store.setPois(pois);
        if (typeof renderMarkers === 'function') {
            renderMarkers(window.pois);
        }
    }

    // 2. Inicializa os filtros da barra lateral
    if (typeof inicializarFiltros === 'function') {
        inicializarFiltros();
    }
    fetch('/api/curadoria', { credentials: 'same-origin' })
        .then(response => {
            if (!response.ok) throw new Error('Acesso negado');
            const acesso = document.getElementById('acesso-curadoria');
            if (acesso) acesso.classList.remove('hidden');
        })
        .catch(() => {
            const acesso = document.getElementById('acesso-curadoria');
            if (acesso) acesso.classList.add('hidden');
        });

    // 3. Inicializa Gamificação do Passaporte Cultural e Idioma
    if (typeof atualizarInterfacePassaporte === 'function') {
        atualizarInterfacePassaporte();
    }
    if (typeof mudarIdioma === 'function' && typeof idiomaAtual !== 'undefined') {
        mudarIdioma(idiomaAtual);
    }

    // Ouvinte reativo desacoplado para atualizações de dados
    document.addEventListener('mca:dados-atualizados', () => {
        if (typeof atualizarInterfacePassaporte === 'function') {
            atualizarInterfacePassaporte();
        }
    });

    // 5. Inicializa Gestos Mobile no Painel de Detalhes (Swipe Down)
    if (typeof inicializarGestosBottomSheet === 'function') {
        inicializarGestosBottomSheet();
    }

    // 5. Verifica se há Deep Link direto para um POI na URL
    verificarDeepLink();

    // 6. Sincroniza com o Google Sheets (se configurado, atualiza cache e mapa)
    if (typeof inicializarGoogleSheets === 'function') {
        inicializarGoogleSheets();
    }

    // 7. Inicia o Rastreamento GPS do Usuário
    if (typeof iniciarGeolocalizacao === 'function') {
        iniciarGeolocalizacao();
    }

    // 8. Registro do PWA Service Worker com Caminho Relativo Seguro
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('PWA Service Worker ativo com escopo:', reg.scope);
                })
                .catch(err => {
                    console.error('Falha ao registrar Service Worker:', err);
                });
        });
    }

    // 9. Inicializa Indicador de Sessão e Sincronização em Nuvem
    if (typeof syncManager !== 'undefined') {
        syncManager.atualizarIndicadorUI();
    }
});
