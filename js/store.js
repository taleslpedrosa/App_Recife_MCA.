// Gerenciador de Estado Reativo e EventBus (Arquitetura Desacoplada)

class AppStore {
    constructor() {
        this.listeners = new Map();
        this.state = {
            pois: [],
            openedPoi: null,
            filtros: {
                busca: '',
                categoria: null,
                tag: null,
                epoca: null
            },
            userLocation: null,
            isRouteMode: false,
            activeRouteId: null,
            idioma: localStorage.getItem('recife_mca_idioma') || 'pt',
            visitados: this.carregarVisitadosIniciais()
        };
    }

    carregarVisitadosIniciais() {
        try {
            const salvo = localStorage.getItem('recife_mca_passaporte');
            return salvo ? JSON.parse(salvo) : [];
        } catch (e) {
            console.warn('Erro ao carregar passaporte inicial:', e);
            return [];
        }
    }

    getState() {
        return this.state;
    }

    // Sistema de Inscrição e Emissão de Eventos (EventBus / Observer)
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Retorna função para cancelar inscrição (clean-up)
        return () => {
            const cbs = this.listeners.get(event);
            if (cbs) cbs.delete(callback);
        };
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data, this.state);
                } catch (err) {
                    console.error(`Erro ao executar ouvinte do evento '${event}':`, err);
                }
            });
        }
    }

    // Ações de Estado
    setPois(novosPois) {
        // Valida e sanitiza cada POI via Schema Validator se disponível
        if (typeof validarESanitizarPoi === 'function') {
            this.state.pois = novosPois
                .map((p, idx) => {
                    const res = validarESanitizarPoi(p, idx + 1);
                    return res.poi;
                })
                .filter(Boolean);
        } else {
            this.state.pois = novosPois;
        }

        // Mantém compatibilidade com window.pois
        window.pois = this.state.pois;
        this.emit('pois:updated', this.state.pois);
    }

    setOpenedPoi(poi) {
        this.state.openedPoi = poi;
        window.openedPoi = poi;
        this.emit('poi:selected', poi);
    }

    setFiltro(tipo, valor) {
        if (tipo === 'busca') this.state.filtros.busca = valor || '';
        if (tipo === 'categoria') this.state.filtros.categoria = valor;
        if (tipo === 'tag') this.state.filtros.tag = valor;
        if (tipo === 'epoca') this.state.filtros.epoca = valor;

        this.emit('filters:changed', this.state.filtros);
    }

    setUserLocation(latLng) {
        this.state.userLocation = latLng;
        window.userLatLng = latLng;
        this.emit('location:updated', latLng);
    }

    setRouteMode(ativo, routeId = null) {
        this.state.isRouteMode = ativo;
        this.state.activeRouteId = routeId;
        window.isRouteMode = ativo;
        this.emit('route:changed', { ativo, routeId });
    }

    setIdioma(lang) {
        this.state.idioma = lang;
        localStorage.setItem('recife_mca_idioma', lang);
        this.emit('language:changed', lang);
    }

    toggleVisitado(poiId) {
        const idNum = parseInt(poiId, 10);
        const idx = this.state.visitados.indexOf(idNum);

        if (idx > -1) {
            this.state.visitados.splice(idx, 1);
        } else {
            this.state.visitados.push(idNum);
        }

        try {
            localStorage.setItem('recife_mca_passaporte', JSON.stringify(this.state.visitados));
        } catch (e) {
            console.warn('Erro ao salvar no passaporte:', e);
        }

        this.emit('passport:updated', this.state.visitados);
        return this.state.visitados.includes(idNum);
    }

    isVisitado(poiId) {
        return this.state.visitados.includes(parseInt(poiId, 10));
    }
}

// Instância única global (Singleton)
const store = new AppStore();
