// Módulo Desacoplado: Notas Pessoais do Visitante e Colaboração Curatorial
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const NotesModule = (() => {
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
        const poi = typeof openedPoi !== 'undefined' ? openedPoi : null;
        if (!poi) return;

        const input = document.getElementById('poi-comentario-input');
        const status = document.getElementById('poi-nota-status');
        if (!input) return;

        const texto = input.value.trim();
        try {
            if (texto) {
                localStorage.setItem(`recife_mca_nota_${poi.id}`, texto);
            } else {
                localStorage.removeItem(`recife_mca_nota_${poi.id}`);
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
        const poi = typeof openedPoi !== 'undefined' ? openedPoi : null;
        if (!poi) return;
        const input = document.getElementById('poi-comentario-input');
        if (input) input.value = '';
        salvarNotaPoi();
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

    function enviarContribuicaoCuradoria() {
        abrirModalColaborar();
    }

    function confirmarEnvioColaboracao() {
        const poi = typeof openedPoi !== 'undefined' ? openedPoi : null;
        const nome = (document.getElementById('colaborar-nome')?.value || 'Anônimo').trim();
        const tipo = document.getElementById('colaborar-tipo')?.value || 'Contribuição Geral';
        const relato = (document.getElementById('colaborar-mensagem')?.value || '').trim();

        if (!relato) {
            alert('Por favor, descreva brevemente sua memória ou contribuição antes de enviar.');
            return;
        }

        const poiInfo = poi ? `${poi.titulo} (ID ${poi.id})` : 'Acervo Geral';
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

    return {
        carregarNotaPoi,
        salvarNotaPoi,
        limparNotaPoi,
        abrirModalColaborar,
        fecharModalColaborar,
        enviarContribuicaoCuradoria,
        confirmarEnvioColaboracao
    };
})();

// Exportações globais para compatibilidade retroativa
window.NotesModule = NotesModule;
window.carregarNotaPoi = NotesModule.carregarNotaPoi;
window.salvarNotaPoi = NotesModule.salvarNotaPoi;
window.limparNotaPoi = NotesModule.limparNotaPoi;
window.abrirModalColaborar = NotesModule.abrirModalColaborar;
window.fecharModalColaborar = NotesModule.fecharModalColaborar;
window.enviarContribuicaoCuradoria = NotesModule.enviarContribuicaoCuradoria;
window.confirmarEnvioColaboracao = NotesModule.confirmarEnvioColaboracao;
