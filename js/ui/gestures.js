// Módulo Desacoplado: Gestos de Toque no Bottom Sheet
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const GesturesModule = (() => {
    function inicializarGestosBottomSheet() {
        const sheet = document.getElementById('bottom-sheet');
        const handle = document.getElementById('sheet-drag-handle');
        if (!sheet || !handle) return;

        let touchStartY = 0;
        let touchEndY = 0;

        handle.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            touchEndY = e.touches[0].clientY;
        }, { passive: true });

        handle.addEventListener('touchend', () => {
            const deltaY = touchEndY - touchStartY;
            // Se arrastou para baixo mais de 60px, fecha o painel
            if (deltaY > 60) {
                if (typeof fecharSheet === 'function') {
                    fecharSheet();
                }
            }
            touchStartY = 0;
            touchEndY = 0;
        }, { passive: true });
    }

    return {
        inicializarGestosBottomSheet
    };
})();

// Exportações globais para compatibilidade retroativa
window.GesturesModule = GesturesModule;
window.inicializarGestosBottomSheet = GesturesModule.inicializarGestosBottomSheet;
