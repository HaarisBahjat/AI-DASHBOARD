import React, { useEffect, useRef } from 'react';

function ParticlesBackground({
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = '#ffffff',
  vx = 0,
  vy = 0,
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const host = canvas.parentElement;
    if (!host) return;

    let rafId;
    let width = 0;
    let height = 0;

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const particles = [];

    const deviceRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const randomBetween = (min, max) => Math.random() * (max - min) + min;

    const createParticles = () => {
      particles.length = 0;
      for (let i = 0; i < quantity; i += 1) {
        particles.push({
          x: randomBetween(0, width),
          y: randomBetween(0, height),
          alpha: randomBetween(0.28, 0.95),
          baseRadius: randomBetween(size * 1.2, size * 6),
          dx: randomBetween(-0.1, 0.1) + vx,
          dy: randomBetween(-0.1, 0.1) + vy,
          twinkle: randomBetween(0.004, 0.02),
        });
      }
    };

    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      canvas.width = Math.floor(width * deviceRatio);
      canvas.height = Math.floor(height * deviceRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      createParticles();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      target.x += (pointer.x - target.x) / ease;
      target.y += (pointer.y - target.y) / ease;

      const offsetX = (target.x / staticity) * -1;
      const offsetY = (target.y / staticity) * -1;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        p.alpha += Math.sin(Date.now() * p.twinkle) * 0.002;
        p.alpha = Math.max(0.2, Math.min(1, p.alpha));

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = p.alpha;
        ctx.arc(p.x + offsetX, p.y + offsetY, p.baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left - width / 2;
      pointer.y = event.clientY - rect.top - height / 2;
    };

    const onPointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    resize();
    draw();

    window.addEventListener('resize', resize);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [color, ease, quantity, refresh, size, staticity, vx, vy]);

  return <canvas ref={canvasRef} className={`mk-particles-canvas ${className}`.trim()} aria-hidden="true" />;
}

export default ParticlesBackground;
