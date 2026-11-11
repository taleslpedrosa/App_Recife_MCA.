// Gerenciador do Mapa e Camadas Cartográficas

let map = null;
let mapaAtivo = null;
let markersLayer = null;

const colecaoMapas = {
    // 1. Estilo viário público da Esri
    voyager: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19, 
        maxZoom: 19, 
        attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, OpenStreetMap contributors'
    }),

    // 2. Estilo topográfico público da Esri
    classico: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19, 
        maxZoom: 19, 
        attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, Intermap, OpenStreetMap contributors'
    }),
    altoContraste: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 19,
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, OpenStreetMap contributors'
    })
};

// Alias para garantir compatibilidade se chamado por 'turistico'
colecaoMapas.turistico = colecaoMapas.voyager;

function initMap() {
    map = L.map('map', { 
        center: [-8.0610, -34.8720], 
        zoom: 15, 
        zoomControl: false 
    });

    map.on('error', (e) => { 
        console.error('Erro ao carregar mapa:', e); 
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Esri fornece tiles HTTPS com CORS habilitado e nao exige chave para
    // esta visualizacao publica.
    mapaAtivo = colecaoMapas.voyager.addTo(map);
    map.getContainer().classList.remove('map-high-contrast');
    markersLayer = L.layerGroup().addTo(map);

    return map;
}

function mudarMapa(estilo) {
    if (!map || !colecaoMapas[estilo]) return;
    map.removeLayer(mapaAtivo);
    mapaAtivo = colecaoMapas[estilo];
    mapaAtivo.addTo(map);
    map.getContainer().classList.toggle('map-high-contrast', estilo === 'altoContraste');
    if (typeof toggleMenu === 'function') {
        toggleMenu(); 
    }
}

function renderMarkers(lista = pois, numRoteiro = false) {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    
    lista.forEach((poi, index) => {
        const pLng = poi.lng;
        if (!poi.lat || !pLng) return;

        let markerHtml = '';
        let size = 16, anchor = 8;
        
        if (numRoteiro) {
            size = 26; 
            anchor = 13;
            markerHtml = `<div class="marker-number" style="width: 26px; height: 26px;">${index + 1}</div>`;
        } else {
            markerHtml = `<div class="custom-marker" style="width: 16px; height: 16px;"></div>`;
        }

        const icon = L.divIcon({ 
            className: 'clear-default', 
            html: markerHtml, 
            iconSize: [size, size], 
            iconAnchor: [anchor, anchor] 
        });

        const marker = L.marker([poi.lat, pLng], { icon: icon });
        marker.on('click', () => {
            if (typeof abrirDetalhesPoi === 'function') {
                abrirDetalhesPoi(poi);
            }
        });
        markersLayer.addLayer(marker);
    });

    if (typeof atualizarContador === 'function') {
        atualizarContador(lista.length);
    }
}
