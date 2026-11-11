// Gerenciador de Roteiros, Distâncias e Navegação GPS

let isRouteMode = false;
let currentPolyline = null;
let userLatLng = null;
let userMarker = null;
let rotaPoiAtiva = false;
let ultimoGpsProcessado = 0;

function calcularHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raio da Terra em metros
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function iniciarGeolocalizacao() {
    if (!('geolocation' in navigator)) {
        const distEl = document.getElementById('distancia-valor');
        if (distEl) distEl.innerText = "GPS não suportado";
        return;
    }

    navigator.geolocation.watchPosition(
        (pos) => {
            const intervalo = rotaPoiAtiva ? 2000 : 10000;
            const agora = Date.now();
            if (agora - ultimoGpsProcessado < intervalo) return;
            ultimoGpsProcessado = agora;
            userLatLng = [pos.coords.latitude, pos.coords.longitude];
            
            if (!userMarker && map) {
                const userIcon = L.divIcon({
                    className: 'clear-default',
                    html: `<div style="width: 14px; height: 14px; background-color: #0ea5e9; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(14, 165, 233, 0.8);"></div>`,
                    iconSize: [14, 14], 
                    iconAnchor: [7, 7]
                });
                userMarker = L.marker(userLatLng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
            } else if (userMarker) {
                userMarker.setLatLng(userLatLng);
            }
            
            atualizarDistanciaPoi();
            if (rotaPoiAtiva && typeof openedPoi !== 'undefined' && openedPoi) {
                tracarRotaAtePoi();
            }
        },
        (err) => {
            console.warn("GPS indisponível ou permissão negada:", err);
            const distEl = document.getElementById('distancia-valor');
            if (distEl) distEl.innerText = "GPS Indisponível";
        },
        { 
            enableHighAccuracy: false,
            maximumAge: 30000,
            timeout: 10000
        }
    );
}

function atualizarDistanciaPoi() {
    if (typeof openedPoi === 'undefined' || !openedPoi) return;
    const distSpan = document.getElementById('distancia-valor');
    const badgeProximidade = document.getElementById('poi-proximidade-badge');
    if (!distSpan) return;

    if (!userLatLng) {
        distSpan.innerText = "Buscando GPS...";
        if (badgeProximidade) badgeProximidade.classList.add('hidden');
        return;
    }

    const pLng = openedPoi.lng;
    if (!openedPoi.lat || !pLng || isNaN(openedPoi.lat) || isNaN(pLng)) {
        distSpan.innerText = "Localização pendente";
        if (badgeProximidade) badgeProximidade.classList.add('hidden');
        return;
    }

    const distMeters = calcularHaversine(userLatLng[0], userLatLng[1], openedPoi.lat, pLng);
    if (isNaN(distMeters)) {
        distSpan.innerText = "Distância indisponível";
        if (badgeProximidade) badgeProximidade.classList.add('hidden');
        return;
    }

    if (distMeters < 1000) {
        distSpan.innerText = Math.round(distMeters) + " metros";
    } else {
        distSpan.innerText = (distMeters / 1000).toFixed(2) + " km";
    }

    // Ativação do badge de proximidade georreferenciada (Gamificação / Check-in) e Dwell Time
    if (badgeProximidade) {
        if (distMeters <= 75) {
            badgeProximidade.classList.remove('hidden');
            if (typeof telemetry !== 'undefined') telemetry.iniciarDwellTime(openedPoi.id);
        } else {
            badgeProximidade.classList.add('hidden');
            if (typeof telemetry !== 'undefined') telemetry.finalizarDwellTime();
        }
    }
}

function ativarRota(tipo) {
    if (currentPolyline) { 
        map.removeLayer(currentPolyline); 
        currentPolyline = null; 
    }
    const roteiro = (typeof roteiros !== 'undefined' && roteiros[tipo]) ? roteiros[tipo] : null;
    let pontosRota = [];

    const listaPois = typeof obterListaPois === 'function' ? obterListaPois() : (typeof pois !== 'undefined' ? pois : []);

    if (roteiro && Array.isArray(roteiro.routeIds)) {
        pontosRota = roteiro.routeIds
            .map(id => listaPois.find(p => p.id === id))
            .filter(Boolean);
    } else if (tipo === 'origens') {
        pontosRota = [1, 3, 4].map(id => listaPois.find(p => p.id === id)).filter(Boolean);
    } else if (tipo === 'sagrado') {
        pontosRota = listaPois.filter(p => p.categoria === 'Recife Sagrado');
    } else if (tipo === 'poesia') {
        pontosRota = listaPois.filter(p => p.categoria === 'Circuito da Poesia');
    }
    
    if (pontosRota.length === 0) return;
    
    isRouteMode = true;
    renderMarkers(pontosRota, true);
    
    const corRota = (roteiro && roteiro.color) ? roteiro.color : '#881337';
    const latlngs = pontosRota.map(p => [p.lat, p.lng]);
    
    currentPolyline = L.polyline(latlngs, {
        color: corRota, 
        weight: 4, 
        dashArray: '10, 8', 
        lineCap: 'round', 
        lineJoin: 'round'
    }).addTo(map);
    
    map.fitBounds(currentPolyline.getBounds(), { padding: [40, 40] });
    
    const btnLimpar = document.getElementById('btn-limpar-rota');
    if (btnLimpar) btnLimpar.classList.remove('hidden');
    
    if (typeof toggleMenu === 'function') {
        toggleMenu();
    }
}

function limparRota() {
    rotaPoiAtiva = false;
    if (currentPolyline) { 
        map.removeLayer(currentPolyline); 
        currentPolyline = null; 
    }
    const btnLimpar = document.getElementById('btn-limpar-rota');
    if (btnLimpar) btnLimpar.classList.add('hidden');
    
    isRouteMode = false;
    
    if (typeof filtrarGeral === 'function') {
        filtrarGeral(true); 
    }
    
    if (map) {
        map.setView([-8.0610, -34.8720], 15);
    }
}

function tracarRotaAtePoi() {
    rotaPoiAtiva = true;
    if (!userLatLng) { 
        alert("Por favor, ative a permissão de localização (GPS) para traçar a rota.");
        return; 
    }
    if (typeof openedPoi === 'undefined' || !openedPoi) return;
    if (currentPolyline) { 
        map.removeLayer(currentPolyline); 
        currentPolyline = null; 
    }
    
    const btnLimpar = document.getElementById('btn-limpar-rota');
    if (btnLimpar) btnLimpar.classList.remove('hidden');
    
    if (typeof fecharSheet === 'function') {
        fecharSheet();
    }

    const pLng = openedPoi.lng;
    
    if (!openedPoi.lat || !pLng) {
        const distEl = document.getElementById('distancia-valor');
        if (distEl) distEl.innerText = 'Destino indisponível';
        return;
    }

    const origem = L.latLng(userLatLng[0], userLatLng[1]);
    const destino = L.latLng(openedPoi.lat, pLng);
    currentPolyline = L.polyline([origem, destino], {
        color: '#0ea5e9',
        weight: 5,
        opacity: 0.9,
        dashArray: '10, 10',
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);
    map.fitBounds(currentPolyline.getBounds(), { padding: [40, 40] });

    const distanciaMetros = calcularHaversine(origem.lat, origem.lng, destino.lat, destino.lng);
    const distEl = document.getElementById('distancia-valor');
    if (distEl) {
        distEl.title = 'Linha reta geodésica; não segue vias reais.';
        distEl.innerText = distanciaMetros < 1000
            ? `${Math.round(distanciaMetros)} m em linha reta`
            : `${(distanciaMetros / 1000).toFixed(2)} km em linha reta`;
    }
}

function abrirNoGoogleMaps() {
    if (typeof openedPoi === 'undefined' || !openedPoi) return;
    const pLng = openedPoi.lng;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${openedPoi.lat},${pLng}&travelmode=walking`;
    window.open(url, '_blank', 'noopener,noreferrer');
}
