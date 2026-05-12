/* ============================================
   Safe&Sound Robotics — A1AN Web
   Landing Page JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Header scroll effect ---
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // --- Mobile hamburger menu ---
  const hamburger = document.getElementById('hamburger');
  const headerNav = document.getElementById('headerNav');
  const headerActions = document.getElementById('headerActions');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      headerNav.classList.toggle('open');
      headerActions.classList.toggle('open');
    });

    headerNav?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        headerNav.classList.remove('open');
        headerActions.classList.remove('open');
      });
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Scroll fade-in animations ---
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    fadeElements.forEach(el => observer.observe(el));
  }

  // --- Contact form ---
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const message = document.getElementById('contactMessage').value.trim();
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      if (!name || !email || !message) {
        showToast('Por favor, completa todos los campos.', 'danger');
        return;
      }

      if (!isValidEmail(email)) {
        showToast('Introduce un correo electrónico válido.', 'danger');
        return;
      }

      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Enviando...';
      submitBtn.disabled = true;

      try {
        if (typeof supabase !== 'undefined') {
          // Comprobar si hay sesión, pero no bloquear si no la hay
          const { data: { session } } = await supabase.auth.getSession();
          
          let insertData = {
            asunto: `Contacto web de ${name}`, 
            mensaje: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`
          };

          // Si hay sesión, lo vinculamos a su usuario
          if (session) {
            insertData.usuario_id = session.user.id;
          }

          const { error } = await supabase
            .from('consultas_soporte')
            .insert(insertData);

          if (error) throw error;
        } else {
          console.warn('Cliente Supabase no encontrado. Envío simulado.');
        }

        showToast('Consulta enviada correctamente. Te responderemos pronto.', 'success');
        contactForm.reset();
      } catch (err) {
        console.error('Error al enviar el mensaje:', err);
        showToast('Error al enviar el mensaje. Inténtalo de nuevo más tarde.', 'danger');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // --- Hero: interactive dot grid (canvas) ---
  initHeroDotsCanvas();

  // --- Auth state: update header buttons ---
  updateAuthState();
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type) toast.classList.add('toast-' + type);
  setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function updateAuthState() {
  const session = JSON.parse(localStorage.getItem('a1an_session') || 'null');
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn && session && session.loggedIn) {
    loginBtn.textContent = 'Mi panel';
    loginBtn.href = 'dashboard.html';
  }
}

/**
 * Rejilla de puntos blancos en el hero que reaccionan al cursor (tamaño / opacidad).
 */
/**
 * Rejilla de puntos blancos en el hero que reaccionan al cursor (tamaño / opacidad).
 * Implementado con un enfoque de "sensación premium": interpolación suave,
 * soporte de alta densidad de píxeles y transiciones elegantes.
 */
function initHeroDotsCanvas() {
  const hero = document.getElementById('inicio');
  const canvas = document.getElementById('heroDotsCanvas');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- Configuración ---
  const config = {
    spacing: 24,       // Espacio entre puntos en px
    baseRadius: 1.2,   // Radio normal del punto
    maxRadius: 5.5,    // Radio máximo con el mouse cerca
    baseAlpha: 0.1,    // Opacidad normal
    maxAlpha: 0.7,     // Opacidad máxima con el mouse cerca
    influence: 160,    // Radio de influencia del mouse
    ease: 0.12,        // Factor de suavizado (lerp)
    mouseEase: 0.15    // Suavizado del movimiento del mouse virtual
  };

  let dots = [];
  let w, h, dpr;
  let mx = -1000, my = -1000; // Mouse real
  let vmx = -1000, vmy = -1000; // Mouse virtual (con inercia)
  let rafId = null;
  let isMouseOver = false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  class Dot {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.r = config.baseRadius;
      this.a = config.baseAlpha;
      this.targetR = config.baseRadius;
      this.targetA = config.baseAlpha;
    }

    update(mouseActive) {
      if (mouseActive) {
        const dx = this.x - vmx;
        const dy = this.y - vmy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.influence) {
          const t = 1 - dist / config.influence;
          const easeT = t * t * (3 - 2 * t); // Smoothstep para una transición más natural
          this.targetR = config.baseRadius + (config.maxRadius - config.baseRadius) * easeT;
          this.targetA = config.baseAlpha + (config.maxAlpha - config.baseAlpha) * easeT;
        } else {
          this.targetR = config.baseRadius;
          this.targetA = config.baseAlpha;
        }
      } else {
        this.targetR = config.baseRadius;
        this.targetA = config.baseAlpha;
      }

      // Animación suave hacia el target
      this.r += (this.targetR - this.r) * config.ease;
      this.a += (this.targetA - this.a) * config.ease;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.a.toFixed(3)})`;
      ctx.fill();
    }
  }

  function initDots() {
    dots = [];
    const step = config.spacing;
    // Añadimos un pequeño margen para cubrir bordes al redimensionar
    for (let x = step * 0.5; x < w; x += step) {
      for (let y = step * 0.5; y < h; y += step) {
        dots.push(new Dot(x, y));
      }
    }
  }

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = hero.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    
    ctx.scale(dpr, dpr);
    initDots();
  }

  function render() {
    ctx.clearRect(0, 0, w, h);

    // Si el mouse no está sobre el hero, alejamos el mouse virtual suavemente
    // para que la transición de salida sea ultra-fluida.
    if (!isMouseOver) {
      vmx += (-1000 - vmx) * config.mouseEase;
      vmy += (-1000 - vmy) * config.mouseEase;
    } else {
      vmx += (mx - vmx) * config.mouseEase;
      vmy += (my - vmy) * config.mouseEase;
    }

    const mouseBusy = isMouseOver || (Math.abs(vmx - (-1000)) > 1);

    dots.forEach(dot => {
      dot.update(mouseBusy);
      dot.draw();
    });

    rafId = requestAnimationFrame(render);
  }

  // --- Eventos ---
  function onPointerMove(e) {
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
    isMouseOver = true;
  }

  function onPointerLeave() {
    isMouseOver = false;
  }

  function handleResize() {
    sizeCanvas();
  }

  // Soporte para "Reduced Motion"
  function checkMotionPreference() {
    if (reducedMotion.matches) {
      if (rafId) cancelAnimationFrame(rafId);
      // Dibujamos el estado base una vez
      ctx.clearRect(0, 0, w, h);
      dots.forEach(dot => {
        dot.targetR = config.baseRadius;
        dot.targetA = config.baseAlpha;
        dot.r = config.baseRadius;
        dot.a = config.baseAlpha;
        dot.draw();
      });
    } else {
      if (!rafId) render();
    }
  }

  hero.addEventListener('mousemove', onPointerMove, { passive: true });
  hero.addEventListener('mouseleave', onPointerLeave, { passive: true });
  hero.addEventListener('touchstart', (e) => {
    isMouseOver = true;
    onPointerMove(e.touches[0]);
  }, { passive: true });
  hero.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]), { passive: true });
  hero.addEventListener('touchend', onPointerLeave, { passive: true });

  const ro = new ResizeObserver(handleResize);
  ro.observe(hero);

  reducedMotion.addEventListener('change', checkMotionPreference);

  // Inicialización sincrónica
  sizeCanvas();
  checkMotionPreference();
}
