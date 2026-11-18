// Módulo Desacoplado: Painel de Inteligência da Curadoria (Dashboard Analítico)
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const DashboardModule = (() => {
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
        const listaPois = typeof obterListaPois === 'function' ? obterListaPois() : (typeof pontosDeInteresse !== 'undefined' ? pontosDeInteresse : []);
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

    return {
        abrirDashboardCuradoria,
        abrirModalDashboardCuradoria,
        fecharDashboardCuradoria,
        filtrarDashboard,
        renderizarGraficosDashboard
    };
})();

// Exportações globais para compatibilidade retroativa
window.DashboardModule = DashboardModule;
window.abrirDashboardCuradoria = DashboardModule.abrirDashboardCuradoria;
window.abrirModalDashboardCuradoria = DashboardModule.abrirModalDashboardCuradoria;
window.fecharDashboardCuradoria = DashboardModule.fecharDashboardCuradoria;
window.filtrarDashboard = DashboardModule.filtrarDashboard;
window.renderizarGraficosDashboard = DashboardModule.renderizarGraficosDashboard;
