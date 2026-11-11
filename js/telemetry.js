// Motor de Telemetria e Métricas de Uso Cultural (Privacy-First & Offline-First)
// Registra volume de acessos, tempo de permanência (Dwell Time) e hábitos de visitação

class TelemetryEngine {
    constructor() {
        this.storageKey = 'recife_mca_telemetria_v1';
        this.activeDwell = null; // { poiId, startTime }
        this.dados = this.carregarDados();
        this.saveTimeout = null;
        window.addEventListener('pagehide', () => {
            this.finalizarDwellTime();
            this.salvarDados(true);
        }, { once: true });
    }

    carregarDados() {
        try {
            const salvo = localStorage.getItem(this.storageKey);
            if (salvo) return JSON.parse(salvo);
        } catch (e) {
            console.warn('Erro ao carregar telemetria:', e);
        }
        return {
            poiAcessos: {},       // { [poiId]: totalCliques }
            poiDwellTimeMs: {},   // { [poiId]: totalMsPermanencia }
            poiAudioPlays: {},    // { [poiId]: totalAudios }
            buscasSemResultado: [],
            eventosFila: []
        };
    }

    salvarDados(imediato = false) {
        if (!imediato) {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.salvarDados(true), 500);
            return;
        }
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.dados));
        } catch (e) {
            console.warn('Falha ao persistir telemetria local:', e);
        }
    }

    // Registra visualização de detalhes de um POI
    registrarVisualizacaoPoi(poiId) {
        if (!poiId) return;
        const id = String(poiId);
        this.dados.poiAcessos[id] = (this.dados.poiAcessos[id] || 0) + 1;
        this.registrarEvento('poi_view', { poiId: id });
        this.salvarDados();
    }

    // Registra reprodução do audioguia
    registrarAudioPlay(poiId) {
        if (!poiId) return;
        const id = String(poiId);
        this.dados.poiAudioPlays[id] = (this.dados.poiAudioPlays[id] || 0) + 1;
        this.registrarEvento('audio_play', { poiId: id });
        this.salvarDados();
    }

    // Inicia cronômetro de permanência física (GPS < 75m)
    iniciarDwellTime(poiId) {
        if (!poiId) return;
        if (this.activeDwell && this.activeDwell.poiId === poiId) return; // Já monitorando
        
        // Finaliza anterior se houver
        this.finalizarDwellTime();

        this.activeDwell = {
            poiId: String(poiId),
            startTime: Date.now()
        };
    }

    // Finaliza cronômetro de permanência física
    finalizarDwellTime() {
        if (!this.activeDwell) return;

        const duracaoMs = Date.now() - this.activeDwell.startTime;
        const id = this.activeDwell.poiId;

        // Considera válido se ficou pelo menos 10 segundos no local e menos de 3 horas (evita anomalias)
        if (duracaoMs >= 10000 && duracaoMs <= 10800000) {
            this.dados.poiDwellTimeMs[id] = (this.dados.poiDwellTimeMs[id] || 0) + duracaoMs;
            this.registrarEvento('dwell_completed', { poiId: id, duracaoMs });
            this.salvarDados();
        }

        this.activeDwell = null;
    }

    // Registra busca por termo
    registrarBusca(termo, totalResultados) {
        if (!termo || typeof termo !== 'string') return;
        const limpo = termo.trim().toLowerCase();
        if (!limpo) return;

        if (totalResultados === 0 && !this.dados.buscasSemResultado.includes(limpo)) {
            this.dados.buscasSemResultado.push(limpo);
            if (this.dados.buscasSemResultado.length > 50) this.dados.buscasSemResultado.shift();
        }

        this.registrarEvento('search', { termo: limpo, totalResultados });
        this.salvarDados();
    }

    registrarEvento(tipo, payload = {}) {
        const evento = {
            tipo,
            payload,
            timestamp: new Date().toISOString(),
            perfilVisitante: (typeof syncManager !== 'undefined' && syncManager.perfil) 
                ? syncManager.perfil.tipoVisitante 
                : 'anonimo'
        };

        this.dados.eventosFila.push(evento);
        // Limita a fila local para os últimos 200 eventos
        if (this.dados.eventosFila.length > 200) {
            this.dados.eventosFila.shift();
        }
    }

    obterEstatisticas() {
        return {
            acessos: this.dados.poiAcessos,
            dwellTime: this.dados.poiDwellTimeMs,
            audios: this.dados.poiAudioPlays,
            buscasSemResultado: this.dados.buscasSemResultado
        };
    }
}

const telemetry = new TelemetryEngine();
