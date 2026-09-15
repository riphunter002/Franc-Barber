/* ==========================================================================
   FRANC BARBER — UI geral (menu mobile, ícones, rodapé)
   A lógica de agendamento e serviços vive em agendamento.js.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('nav-open');
      hamburger.classList.toggle('is-active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Fecha o menu ao clicar em qualquer link (útil no mobile).
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Fade-in discreto ao rolar a página: assim que o elemento entra na
  // viewport, ganha a classe que dispara a transição definida no CSS.
  const fadeElements = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window && fadeElements.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    fadeElements.forEach((el) => observer.observe(el));
  } else {
    fadeElements.forEach((el) => el.classList.add('is-visible'));
  }
});
