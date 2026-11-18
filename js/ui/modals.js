// Módulo Desacoplado: Gerenciamento de Diálogos e Modais
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const ModalsModule = (() => {
    function abrirSobre() {
        const modal = document.getElementById('modal-sobre');
        if (modal) modal.classList.remove('hidden');
        if (typeof toggleMenu === 'function' && document.getElementById('side-menu')?.style.right === '0px') {
            toggleMenu();
        }
    }

    function fecharSobre() {
        const modal = document.getElementById('modal-sobre');
        if (modal) modal.classList.add('hidden');
    }

    function abrirModalPrivacidade() {
        const modal = document.getElementById('modal-privacidade');
        if (modal) modal.classList.remove('hidden');
    }

    function fecharModalPrivacidade() {
        const modal = document.getElementById('modal-privacidade');
        if (modal) modal.classList.add('hidden');
    }

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

    return {
        abrirSobre,
        fecharSobre,
        abrirModalPrivacidade,
        fecharModalPrivacidade,
        abrirModalAuth,
        fecharModalAuth,
        abrirConfiguracaoPerfilLocal,
        limparDadosLocaisMvp,
        abrirModalOnboarding,
        fecharModalOnboarding,
        salvarOnboardingPerfil
    };
})();

// Exportações globais para compatibilidade retroativa
window.ModalsModule = ModalsModule;
window.abrirSobre = ModalsModule.abrirSobre;
window.fecharSobre = ModalsModule.fecharSobre;
window.abrirModalPrivacidade = ModalsModule.abrirModalPrivacidade;
window.fecharModalPrivacidade = ModalsModule.fecharModalPrivacidade;
window.abrirModalAuth = ModalsModule.abrirModalAuth;
window.fecharModalAuth = ModalsModule.fecharModalAuth;
window.abrirConfiguracaoPerfilLocal = ModalsModule.abrirConfiguracaoPerfilLocal;
window.limparDadosLocaisMvp = ModalsModule.limparDadosLocaisMvp;
window.abrirModalOnboarding = ModalsModule.abrirModalOnboarding;
window.fecharModalOnboarding = ModalsModule.fecharModalOnboarding;
window.salvarOnboardingPerfil = ModalsModule.salvarOnboardingPerfil;
