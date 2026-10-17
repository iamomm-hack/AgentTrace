(() => {
  "use strict";

  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const menuOverlay = document.querySelector(".menu-overlay");
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-sign-in");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const setMenuOpen = (isOpen) => {
    if (!menuToggle || !mobileMenu) return;

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    mobileMenu.hidden = !isOpen;
    document.body.classList.toggle("menu-open", isOpen);
  };

  menuToggle?.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  menuOverlay?.addEventListener("click", () => setMenuOpen(false));
  mobileLinks.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) setMenuOpen(false);
  });

  const formatValue = (value, decimals) => value.toFixed(decimals);

  const countUp = (valueElement, index) => {
    const target = Number(valueElement.dataset.target);
    const decimals = Number(valueElement.dataset.decimals || 0);

    if (!Number.isFinite(target)) return;

    if (reduceMotion.matches) {
      valueElement.textContent = formatValue(target, decimals);
      return;
    }

    const duration = 1500 + index * 80;
    const startOffset = 480 + index * 90;
    const startTime = performance.now() + startOffset;

    const tick = (now) => {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      valueElement.textContent = formatValue(target * eased, decimals);

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const statItems = document.querySelectorAll(".stat-item");
  const statObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const valueElement = entry.target.querySelector(".stat-value");
        const index = [...statItems].indexOf(entry.target);
        if (valueElement) countUp(valueElement, index);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.25 },
  );

  statItems.forEach((stat) => statObserver.observe(stat));
})();
