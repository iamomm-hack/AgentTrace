(() => {
  "use strict";

  const menuToggle = document.querySelector(".menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const menuOverlay = document.querySelector(".menu-overlay");
  const page = document.querySelector(".page");
  const mobileLinks = document.querySelectorAll(".mobile-link, .mobile-sign-in");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bgVideo = document.querySelector(".bg-video");
  let previousFocus = null;

  const updateVideoMotion = () => {
    if (!bgVideo) return;
    if (reduceMotion.matches) {
      bgVideo.pause();
    } else {
      bgVideo.play().catch(() => {});
    }
  };

  updateVideoMotion();
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", updateVideoMotion);
  } else if (typeof reduceMotion.addListener === "function") {
    reduceMotion.addListener(updateVideoMotion);
  }

  const setMenuOpen = (isOpen) => {
    if (!menuToggle || !mobileMenu) return;

    if (isOpen && !previousFocus) previousFocus = document.activeElement;

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    mobileMenu.hidden = !isOpen;
    if (page) page.inert = isOpen;
    document.body.classList.toggle("menu-open", isOpen);

    if (isOpen) {
      window.requestAnimationFrame(() => mobileLinks[0]?.focus());
    } else {
      if (previousFocus && window.innerWidth <= 720 && document.contains(previousFocus)) previousFocus.focus();
      previousFocus = null;
    }
  };

  menuToggle?.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  menuOverlay?.addEventListener("click", () => setMenuOpen(false));
  mobileLinks.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      return;
    }

    if (event.key !== "Tab" || menuToggle?.getAttribute("aria-expanded") !== "true") return;

    const firstLink = mobileLinks[0];
    const lastLink = mobileLinks[mobileLinks.length - 1];
    if (event.shiftKey && document.activeElement === firstLink) {
      event.preventDefault();
      lastLink?.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      firstLink?.focus();
    }
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
  const startCounting = (stat) => {
    const valueElement = stat.querySelector(".stat-value");
    const index = [...statItems].indexOf(stat);
    if (valueElement) countUp(valueElement, index);
  };

  if ("IntersectionObserver" in window) {
    const statObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          startCounting(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.25 },
    );

    statItems.forEach((stat) => statObserver.observe(stat));
  } else {
    statItems.forEach(startCounting);
  }
})();
