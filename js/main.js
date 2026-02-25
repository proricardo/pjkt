/**
 * ============================================================
 * PROJEKT — JavaScript Principal
 * ============================================================
 * Módulos implementados:
 *   1.  Utilitários gerais
 *   2.  Cursor personalizado
 *   3.  Barra de progresso de scroll
 *   4.  Navbar (scroll + menu mobile)
 *   5.  Animações de scroll (Intersection Observer)
 *   6.  Partículas do hero
 *   7.  Animação de contadores (stats)
 *   8.  Carrossel de depoimentos
 *   9.  Formulário de contato
 *   10. GSAP ScrollTrigger (efeitos avançados)
 *   11. Smooth scroll para links âncora
 *   12. Footer: ano atual
 *   13. Init (ponto de entrada)
 *
 * Compatibilidade: ES2020+, todos os browsers modernos.
 * Sem dependências além de GSAP (carregado via CDN no HTML).
 * ============================================================
 */

'use strict';

/* ─────────────────────────────────────────────────────────
   1. UTILITÁRIOS GERAIS
───────────────────────────────────────────────────────── */

/**
 * Seleciona um único elemento DOM (alias para querySelector).
 * @param {string} selector - Seletor CSS
 * @param {Element} [context=document] - Contexto de busca
 * @returns {Element|null}
 */
const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Seleciona múltiplos elementos DOM (alias para querySelectorAll).
 * @param {string} selector - Seletor CSS
 * @param {Element} [context=document] - Contexto de busca
 * @returns {NodeList}
 */
const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Verifica se o usuário prefere movimento reduzido (acessibilidade).
 * Quando true, desabilita animações pesadas.
 * @returns {boolean}
 */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Verifica se o dispositivo tem suporte a hover (mouse/trackpad).
 * Em touch devices, o cursor personalizado não é exibido.
 * @returns {boolean}
 */
const hasHover = () => window.matchMedia('(hover: hover)').matches;

/**
 * Clamp um valor entre min e max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Debounce — limita a frequência de execução de uma função.
 * @param {Function} fn - Função a ser limitada
 * @param {number} delay - Tempo em ms
 * @returns {Function}
 */
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/* ─────────────────────────────────────────────────────────
   2. CURSOR PERSONALIZADO
   Dois elementos: ponto central (resposta rápida) +
   anel que segue com delay suave. Hover em links/botões
   expande o anel.
───────────────────────────────────────────────────────── */
function initCursor() {
  // Só ativa em dispositivos com mouse (hover support)
  if (!hasHover()) return;

  const cursor = $('#cursor');
  if (!cursor) return;

  const dot  = $('.cursor-dot', cursor);
  const ring = $('.cursor-ring', cursor);

  // Posição atual e alvo do anel (anel tem delay)
  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;

  // Fator de interpolação: quão rápido o anel segue o ponto
  // Valores menores = mais "preguiçoso" (lag) → mais elegante
  const LERP_FACTOR = 0.12;

  /**
   * Atualiza a posição do ponto com o mouse (sem delay)
   * e do anel com interpolação linear (com delay).
   */
  function updateCursor() {
    // Ponto central: segue o mouse imediatamente
    dot.style.left = `${mouseX}px`;
    dot.style.top  = `${mouseY}px`;

    // Anel: interpolação linear para o ponto alvo
    ringX += (mouseX - ringX) * LERP_FACTOR;
    ringY += (mouseY - ringY) * LERP_FACTOR;
    ring.style.left = `${ringX}px`;
    ring.style.top  = `${ringY}px`;

    // Continua o loop de animação
    requestAnimationFrame(updateCursor);
  }

  // Captura posição do mouse
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Inicia o loop de animação
  updateCursor();

  // ── Estado de hover em elementos interativos ──
  // Elementos que expandem o cursor ao serem hoverizados
  const hoverTargets = $$('a, button, [role="button"], input, textarea, select, label[for]');

  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
  });

  // Esconde cursor ao sair da janela
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
  });
}

/* ─────────────────────────────────────────────────────────
   3. BARRA DE PROGRESSO DE SCROLL
   Largura proporcional ao progresso de scroll na página.
───────────────────────────────────────────────────────── */
function initScrollProgress() {
  const progressBar = $('#scrollProgress');
  if (!progressBar) return;

  /**
   * Atualiza a largura da barra baseada no progresso de scroll.
   * Usa requestAnimationFrame para performance.
   */
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // Altura total scrollável = altura total - altura da viewport
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.scrollY;
        const progress = scrollableHeight > 0 ? (scrolled / scrollableHeight) * 100 : 0;

        progressBar.style.width = `${clamp(progress, 0, 100)}%`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────
   4. NAVBAR
   - Adiciona classe .scrolled após Y > 80px
   - Menu mobile: abre/fecha com o hambúrguer
   - Fecha o menu ao clicar em links âncora
───────────────────────────────────────────────────────── */
function initNavbar() {
  const navbar     = $('#navbar');
  const navToggle  = $('#navToggle');
  const mobileMenu = $('#mobileMenu');

  if (!navbar) return;

  // ── Scroll: controle da classe .scrolled ──
  const SCROLL_THRESHOLD = 80; // px a partir do topo

  function handleNavScroll() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // Checa estado inicial

  // ── Menu mobile: abrir/fechar ──
  if (!navToggle || !mobileMenu) return;

  /**
   * Abre ou fecha o menu mobile.
   * Gerencia aria-expanded e aria-hidden para acessibilidade.
   */
  function toggleMobileMenu() {
    const isOpen = mobileMenu.classList.contains('is-open');

    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function openMobileMenu() {
    mobileMenu.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    // Previne scroll do body enquanto menu está aberto
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', toggleMobileMenu);

  // Fecha menu ao clicar em um link âncora
  $$('.mobile-nav-link, .mobile-nav-cta').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Fecha menu ao pressionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      closeMobileMenu();
      navToggle.focus(); // Retorna foco ao botão
    }
  });
}

/* ─────────────────────────────────────────────────────────
   5. ANIMAÇÕES DE SCROLL (INTERSECTION OBSERVER)
   Elementos com classe .reveal-up recebem .is-revealed
   quando entram na viewport. O CSS cuida da transição.
───────────────────────────────────────────────────────── */
function initScrollAnimations() {
  // Respeita preferência de acessibilidade
  if (prefersReducedMotion()) {
    // Revela todos imediatamente sem animação
    $$('.reveal-up').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  /**
   * Intersection Observer: observa elementos .reveal-up
   * e adiciona .is-revealed quando ficam visíveis.
   *
   * rootMargin: inicia a animação quando o elemento está
   * a 10% do bottom da viewport (um pouco antes de aparecer)
   */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // Para de observar após revelar (performance)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,       // 10% do elemento visível
      rootMargin: '0px 0px -60px 0px'  // Antecipa a revelação
    }
  );

  // Observa todos os elementos de reveal
  $$('.reveal-up').forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────────────
   6. PARTÍCULAS DO HERO
   Cria partículas flutuantes no hero para dar profundidade.
   Inspiração: Linear.app, Vercel.com.
───────────────────────────────────────────────────────── */
function initHeroParticles() {
  if (prefersReducedMotion()) return;

  const container = $('#heroParticles');
  if (!container) return;

  const PARTICLE_COUNT = 20; // Ajuste para mais/menos partículas

  /**
   * Cria uma única partícula com posição, tamanho e
   * duração aleatórios.
   */
  function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Tamanho aleatório entre 2px e 6px
    const size = Math.random() * 4 + 2;
    particle.style.width  = `${size}px`;
    particle.style.height = `${size}px`;

    // Posição horizontal aleatória
    particle.style.left = `${Math.random() * 100}%`;

    // Inicia em posição vertical aleatória (não apenas na base)
    particle.style.bottom = `${Math.random() * 100}%`;

    // Duração e delay aleatórios para efeito orgânico
    const duration = Math.random() * 15 + 10; // 10s a 25s
    const delay    = Math.random() * 10;       // 0s a 10s

    particle.style.animationDuration  = `${duration}s`;
    particle.style.animationDelay     = `-${delay}s`; // Inicia já em andamento

    // Opacidade leve
    particle.style.opacity = (Math.random() * 0.2 + 0.05).toString();

    container.appendChild(particle);
  }

  // Cria todas as partículas
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    createParticle();
  }
}

/* ─────────────────────────────────────────────────────────
   7. ANIMAÇÃO DE CONTADORES
   Números nas métricas contam de 0 até o valor alvo
   quando a seção do manifesto entra na viewport.
───────────────────────────────────────────────────────── */
function initCounters() {
  if (prefersReducedMotion()) return;

  const counters = $$('.stat-number[data-target]');
  if (!counters.length) return;

  /**
   * Anima um contador de 0 até target em `duration` ms.
   * Usa easing easeOutCubic para desaceleração natural.
   *
   * @param {Element} el - Elemento DOM do número
   * @param {number} target - Valor final
   * @param {number} duration - Duração em ms
   */
  function animateCounter(el, target, duration = 2000) {
    const start     = performance.now();
    const startVal  = 0;

    /**
     * Easing easeOutCubic: começa rápido, desacelera no final.
     * @param {number} t - Progresso (0 a 1)
     * @returns {number}
     */
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function update(currentTime) {
      const elapsed  = currentTime - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased    = easeOutCubic(progress);
      const current  = Math.round(startVal + (target - startVal) * eased);

      el.textContent = current.toLocaleString('pt-BR');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Garante que o valor final é exato
        el.textContent = target.toLocaleString('pt-BR');
      }
    }

    requestAnimationFrame(update);
  }

  // Observa quando a grade de stats entra na viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Anima cada contador com delay escalonado
          counters.forEach((counter, index) => {
            const target = parseInt(counter.dataset.target, 10);

            setTimeout(() => {
              animateCounter(counter, target);
            }, index * 150); // 150ms de intervalo entre cada
          });

          // Para de observar após disparar uma vez
          observer.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );

  // Observa o primeiro stat-card (representativo do grupo)
  const firstCard = $('.stat-card');
  if (firstCard) observer.observe(firstCard);
}

/* ─────────────────────────────────────────────────────────
   8. CARROSSEL DE DEPOIMENTOS
   Navegação manual (botões e dots) + auto-play.
   Totalmente acessível com ARIA e teclado.
───────────────────────────────────────────────────────── */
function initTestimonialsCarousel() {
  const track   = $('#testimonialsTrack');
  const prevBtn = $('#testimonialPrev');
  const nextBtn = $('#testimonialNext');
  const dotsContainer = $('#testimonialDots');

  if (!track || !prevBtn || !nextBtn) return;

  const cards = $$('.testimonial-card', track);
  if (cards.length === 0) return;

  let currentIndex = 0;
  let autoPlayTimer = null;
  const AUTO_PLAY_INTERVAL = 6000; // 6 segundos entre slides

  // ── Cria os dots indicadores ──
  cards.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.className = 'testimonial-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Depoimento ${index + 1}`);
    dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');

    dot.addEventListener('click', () => {
      goToSlide(index);
      resetAutoPlay();
    });

    dotsContainer.appendChild(dot);
  });

  const dots = $$('.testimonial-dot', dotsContainer);

  /**
   * Move o carrossel para o slide de índice `index`.
   * Atualiza dots e aria-attributes.
   * @param {number} index
   */
  function goToSlide(index) {
    currentIndex = (index + cards.length) % cards.length; // Ciclo infinito
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Atualiza dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
      dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
    });

    // Atualiza aria-label dos botões de controle
    prevBtn.setAttribute('aria-label', `Ver depoimento anterior`);
    nextBtn.setAttribute('aria-label', `Ver próximo depoimento`);
  }

  // ── Navegação pelos botões ──
  prevBtn.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
    resetAutoPlay();
  });

  nextBtn.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
    resetAutoPlay();
  });

  // ── Suporte a teclado (← →) ──
  document.addEventListener('keydown', (e) => {
    // Só aplica se o carrossel está na viewport
    const rect = track.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    if (e.key === 'ArrowLeft')  { goToSlide(currentIndex - 1); resetAutoPlay(); }
    if (e.key === 'ArrowRight') { goToSlide(currentIndex + 1); resetAutoPlay(); }
  });

  // ── Auto-play ──
  function startAutoPlay() {
    if (prefersReducedMotion()) return;
    autoPlayTimer = setInterval(() => goToSlide(currentIndex + 1), AUTO_PLAY_INTERVAL);
  }

  function resetAutoPlay() {
    clearInterval(autoPlayTimer);
    startAutoPlay();
  }

  // Pausa auto-play quando o usuário está interagindo
  track.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
  track.addEventListener('mouseleave', startAutoPlay);

  // ── Touch/swipe support ──
  let touchStartX = 0;
  let touchEndX   = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    // Limiar de 50px para considerar como swipe
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToSlide(currentIndex + 1); // Swipe left → próximo
      else           goToSlide(currentIndex - 1); // Swipe right → anterior
      resetAutoPlay();
    }
  }, { passive: true });

  // Inicializa estado
  goToSlide(0);
  startAutoPlay();
}

/* ─────────────────────────────────────────────────────────
   9. FORMULÁRIO DE CONTATO
   Validação client-side + feedback visual.
   Para backend: substitua o bloco simulateFormSubmission()
   por uma chamada fetch() real para sua API.
───────────────────────────────────────────────────────── */
function initContactForm() {
  const form     = $('#contatoForm');
  const feedback = $('#formFeedback');

  if (!form) return;

  /**
   * Valida os campos obrigatórios do formulário.
   * @returns {{ valid: boolean, firstInvalidField: Element|null }}
   */
  function validateForm() {
    let valid = true;
    let firstInvalidField = null;

    // Remove erros anteriores
    $$('.form-input.has-error', form).forEach(el => {
      el.classList.remove('has-error');
    });

    // Valida nome
    const nome = $('#nomeInput', form);
    if (nome && nome.value.trim().length < 2) {
      markInvalid(nome, 'Nome deve ter ao menos 2 caracteres');
      if (!firstInvalidField) firstInvalidField = nome;
      valid = false;
    }

    // Valida email com regex simples
    const email = $('#emailInput', form);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.value.trim())) {
      markInvalid(email, 'E-mail inválido');
      if (!firstInvalidField) firstInvalidField = email;
      valid = false;
    }

    // Valida mensagem
    const mensagem = $('#mensagemInput', form);
    if (mensagem && mensagem.value.trim().length < 10) {
      markInvalid(mensagem, 'Mensagem deve ter ao menos 10 caracteres');
      if (!firstInvalidField) firstInvalidField = mensagem;
      valid = false;
    }

    return { valid, firstInvalidField };
  }

  /**
   * Marca um campo como inválido e cria o tooltip de erro.
   * @param {Element} field - Campo de input
   * @param {string} message - Mensagem de erro
   */
  function markInvalid(field, message) {
    field.classList.add('has-error');

    // Remove erro anterior se existir
    const existing = field.parentNode.querySelector('.field-error');
    if (existing) existing.remove();

    // Cria elemento de erro
    const error = document.createElement('span');
    error.className = 'field-error';
    error.textContent = message;
    error.style.cssText = `
      font-size: 0.75rem;
      color: var(--color-error);
      display: block;
      margin-top: 4px;
    `;

    field.parentNode.appendChild(error);

    // Remove o estilo de erro quando o campo é corrigido
    field.addEventListener('input', () => {
      field.classList.remove('has-error');
      error.remove();
    }, { once: true });
  }

  /**
   * Simula o envio do formulário (substituir por fetch() real).
   *
   * ╔══════════════════════════════════════════════════════╗
   * ║  INTEGRAÇÃO DE BACKEND                              ║
   * ║  Substitua esta função por:                         ║
   * ║                                                      ║
   * ║  const response = await fetch('/api/contact', {      ║
   * ║    method: 'POST',                                   ║
   * ║    headers: { 'Content-Type': 'application/json' },  ║
   * ║    body: JSON.stringify(formData)                    ║
   * ║  });                                                 ║
   * ║                                                      ║
   * ║  Ou para Formspree/EmailJS/etc, consulte a docs.    ║
   * ╚══════════════════════════════════════════════════════╝
   *
   * @param {Object} data - Dados do formulário
   * @returns {Promise<{success: boolean}>}
   */
  async function simulateFormSubmission(data) {
    // Remove quando tiver backend real
    console.log('Dados do formulário:', data);

    // Simula delay de rede (1.5s)
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true }), 1500);
    });
  }

  /**
   * Mostra o feedback de resultado do envio.
   * @param {'success'|'error'} type
   * @param {string} message
   */
  function showFeedback(type, message) {
    feedback.className = `form-feedback ${type}`;
    feedback.textContent = message;

    // Rola suavemente até o feedback
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Handler de submit ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Valida antes de enviar
    const { valid, firstInvalidField } = validateForm();
    if (!valid) {
      firstInvalidField?.focus();
      return;
    }

    // Coleta dados do formulário
    const formData = {
      nome:     $('#nomeInput',    form).value.trim(),
      email:    $('#emailInput',   form).value.trim(),
      empresa:  $('#empresaInput', form).value.trim(),
      servico:  $('#servicoSelect',form).value,
      mensagem: $('#mensagemInput',form).value.trim(),
    };

    // Estado de loading
    const submitBtn = form.querySelector('.form-submit');
    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;
    feedback.className = 'form-feedback';

    try {
      const result = await simulateFormSubmission(formData);

      if (result.success) {
        showFeedback('success', '✓ Mensagem enviada! Entraremos em contato em breve.');
        form.reset();
      } else {
        throw new Error('Resposta do servidor indicou falha');
      }
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      showFeedback('error', 'Ocorreu um erro. Por favor, tente pelo WhatsApp ou e-mail.');
    } finally {
      // Remove estado de loading independente do resultado
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });

  // Aplica estilo de erro em tempo real nos inputs
  const inputs = $$('.form-input', form);
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      // Minivalidação ao sair do campo (feedback imediato)
      if (input.hasAttribute('required') && input.value.trim() === '') {
        input.classList.add('has-error');
      }
    });
  });
}

/* ─────────────────────────────────────────────────────────
   10. GSAP SCROLL TRIGGER (EFEITOS AVANÇADOS)
   Efeitos que vão além do Intersection Observer simples.
   Requer GSAP + ScrollTrigger carregados no HTML.
───────────────────────────────────────────────────────── */
function initGSAP() {
  // Verifica se GSAP está disponível
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('Projekt: GSAP não encontrado. Efeitos avançados desabilitados.');
    return;
  }

  if (prefersReducedMotion()) return;

  // Registra o plugin ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // ── Efeito parallax no título do hero ──
  // O título sobe mais rápido que o scroll, criando profundidade
  gsap.to('.hero-content', {
    yPercent: -15,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-section',
      start: 'top top',
      end: 'bottom top',
      scrub: true, // 'true' = 1:1 com o scroll
    }
  });

  // ── Efeito de escala nos números das stats ──
  // Cada stat-card "entra" com uma leve escala
  gsap.fromTo('.stat-card', {
    scale: 0.92,
    opacity: 0
  }, {
    scale: 1,
    opacity: 1,
    duration: 0.6,
    stagger: 0.1, // Cada card com 100ms de atraso
    ease: 'back.out(1.5)',
    scrollTrigger: {
      trigger: '.stats-grid',
      start: 'top 80%',
      once: true, // Só anima uma vez
    }
  });

  // ── Efeito parallax nas imagens de fundo dos painéis ──
  // Em mobile, background-attachment: fixed causa bugs — verificar
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  if (!isMobile) {
    // Desktop: parallax nos painéis de serviço
    $$('.service-panel').forEach(panel => {
      gsap.to(panel, {
        backgroundPositionY: '20%',
        ease: 'none',
        scrollTrigger: {
          trigger: panel,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
      });
    });
  }

  // ── Animação do manifesto-quote: linha por linha ──
  // Cada linha aparece com um leve deslocamento horizontal
  gsap.fromTo('.manifesto-quote', {
    x: -30,
    opacity: 0
  }, {
    x: 0,
    opacity: 1,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.manifesto-quote',
      start: 'top 75%',
      once: true,
    }
  });

  // ── Cards de diferenciais: entrada em cascata ──
  gsap.fromTo('.diferencial-card', {
    y: 30,
    opacity: 0
  }, {
    y: 0,
    opacity: 1,
    duration: 0.5,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.diferenciais-grid',
      start: 'top 80%',
      once: true,
    }
  });

  // ── Steps da metodologia: entrada sequencial ──
  gsap.fromTo('.process-step', {
    y: 25,
    opacity: 0
  }, {
    y: 0,
    opacity: 1,
    duration: 0.4,
    stagger: 0.12,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.process-timeline',
      start: 'top 80%',
      once: true,
    }
  });
}

/* ─────────────────────────────────────────────────────────
   11. SMOOTH SCROLL PARA LINKS ÂNCORA
   Intercepta cliques em links #hash e faz scroll suave,
   considerando a altura do navbar fixo.
───────────────────────────────────────────────────────── */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      // Ignora links sem alvo válido (#, #!)
      if (!href || href === '#' || href === '#!') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      // Calcula offset considerando a navbar fixa
      const navbar = $('#navbar');
      const navbarHeight = navbar ? navbar.offsetHeight : 0;

      const targetPosition = target.getBoundingClientRect().top
        + window.scrollY
        - navbarHeight
        - 20; // 20px de margem extra

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Atualiza a URL sem disparar o scroll padrão
      history.pushState(null, '', href);

      // Foco acessível no elemento alvo
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

/* ─────────────────────────────────────────────────────────
   12. FOOTER: ANO ATUAL
   Atualiza o span do copyright com o ano corrente.
───────────────────────────────────────────────────────── */
function initFooterYear() {
  const yearEl = $('#currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* ─────────────────────────────────────────────────────────
   13. CSS EXTRA: Estilos que dependem de JS
   Pequenos ajustes aplicados via JS para estados dinâmicos
───────────────────────────────────────────────────────── */
function injectDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Estado de erro em campos de formulário */
    .form-input.has-error {
      border-color: var(--color-error) !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
    }

    /* Stat card: ajuste de layout flex para número + sufixo na mesma linha */
    .stat-card {
      display: grid;
      grid-template-areas:
        "num suf"
        "lab lab";
      grid-template-columns: auto auto;
      justify-content: center;
      align-items: baseline;
      gap: 0 4px;
    }

    .stat-number { grid-area: num; }
    .stat-suffix { grid-area: suf; }
    .stat-label  {
      grid-area: lab;
      margin-top: 8px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────
   PONTO DE ENTRADA — INIT
   Aguarda o DOM estar completamente carregado.
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  console.log('%c PROJEKT ', 'background: #0066ff; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;', '— Site carregado');

  // Inicializa cada módulo na ordem correta
  injectDynamicStyles();    // 1. Estilos dinâmicos primeiro
  initCursor();             // 2. Cursor personalizado
  initScrollProgress();     // 3. Barra de progresso
  initNavbar();             // 4. Navbar
  initScrollAnimations();   // 5. Animações de reveal
  initHeroParticles();      // 6. Partículas do hero
  initCounters();           // 7. Contadores de métricas
  initTestimonialsCarousel(); // 8. Carrossel
  initContactForm();        // 9. Formulário
  initSmoothScroll();       // 10. Smooth scroll
  initFooterYear();         // 11. Ano do footer

  // GSAP: inicializa depois de um micro-delay para garantir que
  // o DOM está totalmente pintado (evita cálculos errados de offset)
  requestAnimationFrame(() => {
    initGSAP();
  });

  // Registra service worker para cache offline (se disponível)
  // Para ativar, crie um sw.js na raiz do projeto
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('/sw.js');
  // }
});

/* ─────────────────────────────────────────────────────────
   RESIZE HANDLER
   Recalcula layouts que dependem do tamanho da janela.
   Debounced para evitar chamadas excessivas.
───────────────────────────────────────────────────────── */
window.addEventListener('resize', debounce(() => {
  // Recalcula ScrollTrigger após resize (se GSAP disponível)
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
}, 250));
