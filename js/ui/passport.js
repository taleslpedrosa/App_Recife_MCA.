// Módulo Desacoplado: Passaporte Cultural & Gamificação Histórica
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const PassportModule = (() => {
    let roteiroCertificadoAtivo = null;

    function obterLocaisVisitados() {
        try {
            const salvo = localStorage.getItem('recife_mca_passaporte');
            return salvo ? JSON.parse(salvo) : [];
        } catch (e) {
            console.warn('Erro ao ler passaporte do localStorage:', e);
            return [];
        }
    }

    function salvarLocaisVisitados(visitados) {
        try {
            localStorage.setItem('recife_mca_passaporte', JSON.stringify(visitados));
        } catch (e) {
            console.warn('Erro ao salvar carimbo no passaporte:', e);
        }
    }

    function alternarCarimboPassaporte() {
        const poi = typeof openedPoi !== 'undefined' ? openedPoi : null;
        if (!poi) return;

        const visitados = obterLocaisVisitados();
        const id = poi.id;
        const index = visitados.indexOf(id);

        if (index > -1) {
            visitados.splice(index, 1);
        } else {
            visitados.push(id);
        }

        salvarLocaisVisitados(visitados);
        atualizarEstadoBotaoCarimbo();
        atualizarInterfacePassaporte();

        if (typeof store !== 'undefined' && store.emit) {
            store.emit('passport:updated', { visitados, lastPoiId: id });
        }
    }

    function atualizarEstadoBotaoCarimbo() {
        const poi = typeof openedPoi !== 'undefined' ? openedPoi : null;
        const btn = document.getElementById('btn-carimbar-passaporte');
        const ico = document.getElementById('ico-carimbo-passaporte');
        const txt = document.getElementById('txt-carimbo-passaporte');
        if (!btn || !ico || !txt || !poi) return;

        const visitados = obterLocaisVisitados();
        const jaVisitou = visitados.includes(poi.id);

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
        const listaPois = typeof obterListaPois === 'function' ? obterListaPois() : (typeof pontosDeInteresse !== 'undefined' ? pontosDeInteresse : []);
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
                        <div class="flex items-center justify-between p-2.5 rounded-xl border border-amber-300 bg-amber-50/70 shadow-xs mb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-base">🏆</span>
                                <div>
                                    <span class="text-xs font-bold text-amber-950 block">${rot.name}</span>
                                    <span class="text-[9.5px] font-semibold text-amber-700">100% Concluído (${visitadosNoRoteiro}/${totalNoRoteiro})</span>
                                </div>
                            </div>
                            <button onclick="exibirCertificado('${chave}')" class="bg-amber-800 hover:bg-amber-900 text-white text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition active:scale-95 shadow-xs">
                                Ver Certificado
                            </button>
                        </div>
                    `;
                } else {
                    const pctR = totalNoRoteiro > 0 ? Math.round((visitadosNoRoteiro / totalNoRoteiro) * 100) : 0;
                    htmlR += `
                        <div class="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 mb-2">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-xs font-medium text-slate-700">${rot.name}</span>
                                <span class="text-[10px] font-mono font-bold text-slate-500">${visitadosNoRoteiro}/${totalNoRoteiro}</span>
                            </div>
                            <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div class="bg-slate-700 h-full rounded-full transition-all duration-300" style="width: ${pctR}%"></div>
                            </div>
                        </div>
                    `;
                }
            });
            listaRoteiros.innerHTML = htmlR;
        }
    }

    function abrirModalPassaporte() {
        atualizarInterfacePassaporte();
        const modal = document.getElementById('modal-passaporte');
        if (modal) modal.classList.remove('hidden');
    }

    function fecharModalPassaporte() {
        const modal = document.getElementById('modal-passaporte');
        if (modal) modal.classList.add('hidden');
    }

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

    return {
        obterLocaisVisitados,
        alternarCarimboPassaporte,
        atualizarEstadoBotaoCarimbo,
        atualizarInterfacePassaporte,
        abrirModalPassaporte,
        fecharModalPassaporte,
        exibirCertificado,
        fecharCertificado,
        compartilharCertificado
    };
})();

// Exportações globais para compatibilidade retroativa
window.PassportModule = PassportModule;
window.obterLocaisVisitados = PassportModule.obterLocaisVisitados;
window.alternarCarimboPassaporte = PassportModule.alternarCarimboPassaporte;
window.atualizarEstadoBotaoCarimbo = PassportModule.atualizarEstadoBotaoCarimbo;
window.atualizarInterfacePassaporte = PassportModule.atualizarInterfacePassaporte;
window.abrirModalPassaporte = PassportModule.abrirModalPassaporte;
window.fecharModalPassaporte = PassportModule.fecharModalPassaporte;
window.exibirCertificado = PassportModule.exibirCertificado;
window.fecharCertificado = PassportModule.fecharCertificado;
window.compartilharCertificado = PassportModule.compartilharCertificado;
