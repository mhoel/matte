(function () {
  'use strict';

  window.BrokApp = window.BrokApp || {};

  const COLORS = [
    '#FACC15',
    '#EF4444',
    '#FB923C',
    '#84CC16',
    '#3B82F6',
    '#A855F7',
    '#EC4899'
  ];

  let activeRafId = null;

  function isReducedMotionPreferred() {
    return Boolean(
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function stop() {
    if (activeRafId !== null) {
      cancelAnimationFrame(activeRafId);
      activeRafId = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function burst() {
    // Respekter prefers-reduced-motion: feiringskortet i DOM viser rolig merke i stedet
    if (isReducedMotionPreferred()) {
      stop();
      return;
    }

    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || typeof canvas.getContext !== 'function') {
      return;
    }

    stop();

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth || document.documentElement.clientWidth || 1024;
    const height = window.innerHeight || document.documentElement.clientHeight || 768;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particleCount = 95;
    const particles = [];

    for (let i = 0; i < particleCount; i += 1) {
      const fromLeft = i % 2 === 0;
      const startX = fromLeft ? width * (0.2 + Math.random() * 0.25) : width * (0.55 + Math.random() * 0.25);
      const startY = height * (0.18 + Math.random() * 0.14);
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.5;
      const speed = 5 + Math.random() * 8;

      particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        w: 7 + Math.random() * 6,
        h: 5 + Math.random() * 5,
        isCircle: i % 4 === 0,
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.24,
        gravity: 0.22 + Math.random() * 0.08,
        drag: 0.985
      });
    }

    const durationMs = 2500;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      if (elapsed >= durationMs) {
        stop();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const fadeProgress = elapsed > durationMs * 0.68
        ? 1 - (elapsed - durationMs * 0.68) / (durationMs * 0.32)
        : 1;
      const alpha = Math.max(0, Math.min(1, fadeProgress));

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.isCircle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
        }

        ctx.restore();
      }

      activeRafId = requestAnimationFrame(frame);
    }

    activeRafId = requestAnimationFrame(frame);
  }

  window.BrokApp.Confetti = {
    burst: burst,
    stop: stop
  };
})();
