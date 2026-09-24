const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.main-nav');

menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
});

document.querySelectorAll('.main-nav a, .hero-actions a, .process-callout a, .explore-all, .footer a, .cap-card, .project-card').forEach(el => {
  el.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation menu');
  });
});

// Navigation active state: Home stays underlined on this page — Projects and Resume are
// destinations (separate pages/sections to route to), not scroll positions to track, so the
// underline no longer shifts as you scroll past #work or #resume. Home's "active" state and
// aria-current="page" are set directly in the markup.

// Project cards remain visual/interaction-ready without inventing case-study content.
// Clicking the card gives a small prototype affordance; detailed project pages can be connected later.
const toast = document.getElementById('toast');
let toastTimer;
document.querySelectorAll('.project-card, .cap-card').forEach(card => {
  card.setAttribute('tabindex', '0');
  const show = () => {
    toast.textContent = card.classList.contains('project-card')
      ? 'Project interaction ready — connect the case-study page in the next prototype iteration.'
      : 'Capability interaction ready — connect the detail view when the content is defined.';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  };
  card.addEventListener('click', show);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
  });
});

// ---------- Floating "back to top" affordance ----------
const toTop = document.getElementById('toTop');
if (toTop) {
  let ticking = false;
  const updateToTop = () => {
    toTop.classList.toggle('show', window.scrollY > 640);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateToTop); ticking = true; }
  }, { passive: true });
  updateToTop();
  toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotionQuery.matches ? 'auto' : 'smooth' });
  });
}

// ---------- Subtle scroll-reveal for section content (skipped for reduced motion) ----------
const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!prefersReducedMotionQuery.matches) {
  const revealTargets = document.querySelectorAll(
    '.section-intro, .capability-grid .cap-card, .process-heading, .process-card, .process-callout, .work-heading, .project-grid .project-card, .footer-copy, .footer-contact, .footer-note'
  );
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach(el => revealObserver.observe(el));

  // Safety net: never leave content permanently invisible if the observer
  // misses an element (e.g. a resized/zoomed viewport, or an unusual layout pass).
  window.addEventListener('load', () => {
    setTimeout(() => revealTargets.forEach(el => el.classList.add('in')), 2500);
  });
}

// Back-to-top footer link works through normal anchor navigation.

// ---------- Hero hover interactions: cursor parallax + liquid wave on the portrait ----------
const heroVisual = document.getElementById('heroVisual');
const portraitRing = document.getElementById('portraitRing');
const turbulence = document.getElementById('waveTurbulence');
const displace = document.getElementById('waveDisplace');

if (heroVisual && !prefersReducedMotionQuery.matches) {
  const depthEls = [...heroVisual.querySelectorAll('[data-depth]')];
  let rafId = null;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;

  const applyParallax = () => {
    curX += (targetX - curX) * 0.12;
    curY += (targetY - curY) * 0.12;
    depthEls.forEach(el => {
      const depth = Number(el.dataset.depth) || 20;
      el.style.setProperty('--px', `${(curX / depth).toFixed(2)}px`);
      el.style.setProperty('--py', `${(curY / depth).toFixed(2)}px`);
    });
    if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
      rafId = requestAnimationFrame(applyParallax);
    } else {
      rafId = null;
    }
  };

  const startLoop = () => { if (!rafId) rafId = requestAnimationFrame(applyParallax); };

  heroVisual.addEventListener('pointermove', (e) => {
    const rect = heroVisual.getBoundingClientRect();
    targetX = (e.clientX - rect.left - rect.width / 2);
    targetY = (e.clientY - rect.top - rect.height / 2);
    startLoop();
  });

  heroVisual.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
    startLoop();
  });
}

// Liquid wave ripple on the portrait, driven by an SVG feTurbulence/feDisplacementMap filter.
if (portraitRing && turbulence && displace) {
  if (prefersReducedMotionQuery.matches) {
    // Leave the filter inert; only the CSS grayscale remains.
    displace.setAttribute('scale', '0');
  } else {
    let waveRaf = null;
    let waveState = 0;        // 0 = settled, 1 = rippling in, 2 = holding, -1 = settling out
    let waveStart = 0;
    const rippleInMs = 900;
    const rippleOutMs = 650;
    // Kept low and slow on purpose: the earlier version re-seeded the noise pattern every
    // 90ms, which caused a visible "flutter" jump most noticeable over the middle of the
    // face. Now the seed is fixed for the whole hover and only frequency/scale ease smoothly.
    const holdFrequency = 0.006;
    const holdScale = 7;

    const setWave = (freq, scale) => {
      turbulence.setAttribute('baseFrequency', freq.toFixed(4));
      displace.setAttribute('scale', scale.toFixed(2));
    };

    const tick = (now) => {
      const elapsed = now - waveStart;
      if (waveState === 1) {
        const t = Math.min(elapsed / rippleInMs, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setWave(holdFrequency * eased, holdScale * eased);
        if (t >= 1) { waveState = 2; }
        waveRaf = requestAnimationFrame(tick);
      } else if (waveState === 2) {
        // Slow, even breathing while hovered — no seed changes, so the pattern drifts
        // continuously instead of jumping.
        const drift = Math.sin(elapsed / 1400) * 0.0008;
        setWave(holdFrequency + drift, holdScale + Math.sin(elapsed / 1100) * 0.8);
        waveRaf = requestAnimationFrame(tick);
      } else if (waveState === -1) {
        const t = Math.min(elapsed / rippleOutMs, 1);
        const eased = t * t;
        setWave(holdFrequency * (1 - eased), holdScale * (1 - eased));
        if (t >= 1) {
          waveState = 0;
          setWave(0, 0);
          waveRaf = null;
          return;
        }
        waveRaf = requestAnimationFrame(tick);
      }
    };

    const startWave = () => {
      waveState = 1;
      waveStart = performance.now();
      // Pick a fresh pattern per hover-in, but hold it steady for the whole interaction.
      turbulence.setAttribute('seed', String(3 + Math.floor(Math.random() * 12)));
      if (!waveRaf) waveRaf = requestAnimationFrame(tick);
    };
    const stopWave = () => {
      if (waveState === 0) return;
      waveState = -1;
      waveStart = performance.now();
      if (!waveRaf) waveRaf = requestAnimationFrame(tick);
    };

    portraitRing.addEventListener('pointerenter', startWave);
    portraitRing.addEventListener('pointerleave', stopWave);
    portraitRing.addEventListener('focus', startWave);
    portraitRing.addEventListener('blur', stopWave);
  }
}
