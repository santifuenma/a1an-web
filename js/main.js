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
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const message = document.getElementById('contactMessage').value.trim();

      if (!name || !email || !message) {
        showToast('Por favor, completa todos los campos.', 'danger');
        return;
      }

      if (!isValidEmail(email)) {
        showToast('Introduce un correo electrónico válido.', 'danger');
        return;
      }

      showToast('Mensaje enviado correctamente. ¡Gracias por contactarnos!', 'success');
      contactForm.reset();
    });
  }

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
