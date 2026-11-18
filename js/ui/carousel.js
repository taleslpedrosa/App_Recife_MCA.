// Módulo Desacoplado: Carrossel de Imagens do Ponto de Interesse
// Projeto: Recife: Museu a Céu Aberto (untangle-codebase)

const CarouselModule = (() => {
    function sanitizarUrlImagem(url) {
        if (!url || typeof url !== 'string') return '';
        const limpa = url.trim();
        if (/^(https?:\/\/|\/|\.\/|imagens\/)/i.test(limpa) && 
            !limpa.includes("'") && !limpa.includes('"') && 
            !limpa.includes('(') && !limpa.includes(')') && 
            !limpa.includes(';')) {
            return limpa;
        }
        return '';
    }

    function normalizarUrlsImagens(poi) {
        let listaImagens = [];
        if (Array.isArray(poi?.imagem)) {
            listaImagens = poi.imagem.filter(img => typeof img === 'string' && img.trim() !== '');
        } else if (typeof poi?.imagem === 'string' && poi.imagem.trim() !== '') {
            listaImagens = poi.imagem.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Converte automaticamente links do Google Drive para visualização direta
        listaImagens = listaImagens.map(src => {
            if (typeof converterUrlGoogleDrive === 'function') {
                return converterUrlGoogleDrive(src);
            }
            if (src.includes('drive.google.com')) {
                const matchFile = src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || src.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (matchFile && matchFile[1]) return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
            }
            return src;
        });

        if (listaImagens.length === 0) {
            listaImagens = ['imagens/icone-192.png'];
        }
        return listaImagens;
    }

    function renderizar(container, poi) {
        if (!container) return;
        container.innerHTML = '';
        container.className = "carousel-container w-full bg-slate-100 mb-5 border border-slate-200/60 shadow-inner";

        const listaImagens = normalizarUrlsImagens(poi);
        let indiceAtual = 0;

        function renderizarSlide(index) {
            const slides = container.querySelectorAll('.carousel-slide');
            slides.forEach(s => s.classList.remove('active'));

            const dots = container.querySelectorAll('.dot');
            dots.forEach((d, i) => d.classList.toggle('active', i === index));

            const slideAtivo = slides[index];
            if (slideAtivo) slideAtivo.classList.add('active');
        }

        listaImagens.forEach((src, idx) => {
            const slide = document.createElement('div');
            slide.className = `carousel-slide ${idx === 0 ? 'active' : ''}`;

            const urlSegura = sanitizarUrlImagem(src);
            const aplicarFallback = () => {
                slide.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
                slide.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span class="material-symbols-outlined text-4xl mb-1 text-slate-400">account_balance</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recife: Museu a Céu Aberto</span>
                </div>`;
            };

            if (!urlSegura) {
                aplicarFallback();
            } else {
                const imgTest = new Image();
                imgTest.src = urlSegura;
                imgTest.onload = () => {
                    slide.style.backgroundImage = `url('${urlSegura}')`;
                };
                imgTest.onerror = aplicarFallback;

                if (imgTest.complete && imgTest.naturalWidth !== 0) {
                    slide.style.backgroundImage = `url('${urlSegura}')`;
                }
            }

            container.appendChild(slide);
        });

        if (listaImagens.length > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.className = 'carousel-btn prev';
            btnPrev.innerHTML = '&#10094;';
            btnPrev.setAttribute('aria-label', 'Foto anterior');
            btnPrev.onclick = () => {
                indiceAtual = (indiceAtual - 1 + listaImagens.length) % listaImagens.length;
                renderizarSlide(indiceAtual);
            };
            container.appendChild(btnPrev);

            const btnNext = document.createElement('button');
            btnNext.className = 'carousel-btn next';
            btnNext.innerHTML = '&#10095;';
            btnNext.setAttribute('aria-label', 'Próxima foto');
            btnNext.onclick = () => {
                indiceAtual = (indiceAtual + 1) % listaImagens.length;
                renderizarSlide(indiceAtual);
            };
            container.appendChild(btnNext);

            const indicators = document.createElement('div');
            indicators.className = 'carousel-indicators';
            listaImagens.forEach((_, idx) => {
                const dot = document.createElement('div');
                dot.className = `dot ${idx === 0 ? 'active' : ''}`;
                dot.onclick = () => {
                    indiceAtual = idx;
                    renderizarSlide(indiceAtual);
                };
                indicators.appendChild(dot);
            });
            container.appendChild(indicators);
        }
    }

    return {
        sanitizarUrlImagem,
        renderizar
    };
})();

// Exportações globais para compatibilidade retroativa
window.CarouselModule = CarouselModule;
window.sanitizarUrlImagem = CarouselModule.sanitizarUrlImagem;
