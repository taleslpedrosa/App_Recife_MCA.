// Módulo Desacoplado: Audioguia Nativo (SpeechSynthesis)
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const AudioGuideModule = (() => {
    let isAudioTocando = false;
    let synthUtterance = null;

    function atualizarBotaoAudio(tocando) {
        const btn = document.getElementById('btn-audio-guia');
        const ico = document.getElementById('ico-audio-guia');
        const txt = document.getElementById('txt-audio-guia');
        if (!btn || !ico || !txt) return;

        if (tocando) {
            btn.classList.add('bg-rose-100', 'text-rose-700', 'audio-playing-pulse');
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            ico.innerText = 'stop_circle';
            txt.innerText = 'Parar';
        } else {
            btn.classList.remove('bg-rose-100', 'text-rose-700', 'audio-playing-pulse');
            btn.classList.add('bg-slate-100', 'text-slate-700');
            ico.innerText = 'volume_up';
            txt.innerText = 'Ouvir';
        }
    }

    function parar() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        isAudioTocando = false;
        atualizarBotaoAudio(false);
    }

    function tocar(poiAlvo) {
        if (!('speechSynthesis' in window)) {
            alert('Seu navegador não possui suporte nativo à síntese de voz (audioguia).');
            return;
        }

        const poi = poiAlvo || (typeof openedPoi !== 'undefined' ? openedPoi : null);
        if (!poi) return;

        parar();
        if (typeof telemetry !== 'undefined') {
            telemetry.registrarAudioPlay(poi.id);
        }

        const lang = typeof i18n !== 'undefined' ? i18n.getIdioma() : (localStorage.getItem('recife_mca_idioma') || 'pt');
        const audiodescricao = poi[`audiodescricao_${lang}`] || poi.audiodescricao;

        const getTextoLocalizado = (p, campo) => {
            if (typeof textoPoiLocalizado === 'function') {
                return textoPoiLocalizado(p, campo);
            }
            return p[campo] || '';
        };

        let textoNarracao = getTextoLocalizado(poi, 'titulo') || '';
        if (poi.categoria) {
            textoNarracao += `. Categoria: ${poi.categoria}. `;
        } else {
            textoNarracao += '. ';
        }

        if (audiodescricao) {
            textoNarracao += audiodescricao;
        } else {
            textoNarracao += getTextoLocalizado(poi, 'descricao');
        }

        if (poi.observacao) {
            textoNarracao += ` Nota complementar: ${poi.observacao}`;
        }

        synthUtterance = new SpeechSynthesisUtterance(textoNarracao);
        synthUtterance.rate = 0.95; // Cadência amigável para audição histórica
        synthUtterance.pitch = 1.0;

        if (lang === 'en') {
            synthUtterance.lang = 'en-US';
        } else if (lang === 'es') {
            synthUtterance.lang = 'es-ES';
        } else {
            synthUtterance.lang = 'pt-BR';
        }

        const vozes = window.speechSynthesis.getVoices();
        const prefixo = synthUtterance.lang.slice(0, 2);
        const vozCompativel = vozes.find(v => v.lang && v.lang.toLowerCase().startsWith(prefixo));
        if (vozCompativel) {
            synthUtterance.voice = vozCompativel;
        }

        synthUtterance.onstart = () => {
            isAudioTocando = true;
            atualizarBotaoAudio(true);
        };

        synthUtterance.onend = () => {
            isAudioTocando = false;
            atualizarBotaoAudio(false);
        };

        synthUtterance.onerror = (e) => {
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.warn('Audioguia finalizado:', e);
            }
            isAudioTocando = false;
            atualizarBotaoAudio(false);
        };

        window.speechSynthesis.speak(synthUtterance);
    }

    function alternar(poiAlvo) {
        if (isAudioTocando) {
            parar();
        } else {
            tocar(poiAlvo);
        }
    }

    return {
        tocar,
        parar,
        alternar,
        atualizarBotaoAudio,
        estaTocando: () => isAudioTocando
    };
})();

// Exportações globais para compatibilidade retroativa
window.AudioGuideModule = AudioGuideModule;
window.alternarAudioGuia = () => AudioGuideModule.alternar();
window.tocarAudioGuia = (poi) => AudioGuideModule.tocar(poi);
window.pararAudioGuia = () => AudioGuideModule.parar();
window.atualizarBotaoAudio = (tocando) => AudioGuideModule.atualizarBotaoAudio(tocando);
