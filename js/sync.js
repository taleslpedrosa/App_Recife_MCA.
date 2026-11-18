// Gerenciador do perfil local do visitante

class SyncManager {
    constructor() {
        this.profileStorageKey = 'recife_mca_profile_v1';
        this.perfil = this.carregarPerfil();
    }

    carregarPerfil() {
        try {
            const salvo = localStorage.getItem(this.profileStorageKey);
            return salvo ? JSON.parse(salvo) : {
                tipoVisitante: 'nao_definido', // 'morador' | 'turista_nacional' | 'turista_internacional'
                cidadeOrigem: '',
                interessePrincipal: 'historia'
            };
        } catch (e) {
            return { tipoVisitante: 'nao_definido', cidadeOrigem: '', interessePrincipal: 'historia' };
        }
    }

    salvarEstado() {
        try {
            localStorage.setItem(this.profileStorageKey, JSON.stringify(this.perfil));
        } catch (e) {
            console.warn('Erro ao persistir perfil local:', e);
        }
        this.atualizarIndicadorUI();
    }

    autenticar(dados = {}) {
        return this.atualizarPerfil(dados);
    }

    atualizarPerfil(dados) {
        this.perfil = {
            ...this.perfil,
            ...dados,
            updatedAt: new Date().toISOString()
        };
        this.salvarEstado();
    }

    isMorador() {
        return this.perfil.tipoVisitante === 'morador';
    }

    isTurista() {
        return this.perfil.tipoVisitante === 'turista_nacional' || this.perfil.tipoVisitante === 'turista_internacional';
    }

    atualizarIndicadorUI() {
        const btnAuth = document.getElementById('btn-auth-user');
        const txtUser = document.getElementById('txt-auth-username');
        if (!btnAuth) return;

        const label = typeof i18n !== 'undefined' ? i18n.t('perfilLocal') : 'Perfil local';
        if (txtUser) txtUser.innerText = label;
        btnAuth.setAttribute('aria-label', label);
        btnAuth.title = label;
    }
}

const syncManager = new SyncManager();
