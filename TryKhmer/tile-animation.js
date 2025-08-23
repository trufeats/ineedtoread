document.addEventListener('DOMContentLoaded', () => {
  // Year stamp
  document.getElementById('y').textContent = new Date().getFullYear();

  const tiles = document.querySelectorAll('.bg-tiles .tile');

  function getPalette() {
    const styles = getComputedStyle(document.body);
    return Array.from({ length: 7 }, (_, i) =>
      styles.getPropertyValue(`--tile${i + 1}`).trim()
    );
  }

  let palette = getPalette();

  function mixChannel(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function mix(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    return `rgb(${mixChannel(r1, r2, t)}, ${mixChannel(g1, g2, t)}, ${mixChannel(b1, b2, t)})`;
  }

  const states = Array.from(tiles, tile => {
    const index = Math.floor(Math.random() * palette.length);
    const progress = Math.random();
    const angle = Math.random() * 360;
    const speed = 8000 + Math.random() * 8000; // ms per color blend
    const rotSpeed = (Math.random() * 30 - 15) / 1000; // deg per ms
    const state = {
      el: tile,
      index,
      next: (index + 1) % palette.length,
      nextNext: (index + 2) % palette.length,
      progress,
      speed,
      angle,
      rotSpeed,
    };
    const c1 = mix(palette[state.index], palette[state.next], progress);
    const c2 = mix(palette[state.next], palette[state.nextNext], progress);
    tile.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
    return state;
  });

  let last;
  function step(ts) {
    if (!last) last = ts;
    const dt = ts - last;
    last = ts;

    states.forEach(s => {
      s.progress += dt / s.speed;
      if (s.progress >= 1) {
        s.index = s.next;
        s.next = s.nextNext;
        s.nextNext = (s.nextNext + 1) % palette.length;
        s.progress -= 1;
      }
      s.angle = (s.angle + s.rotSpeed * dt) % 360;
      const c1 = mix(palette[s.index], palette[s.next], s.progress);
      const c2 = mix(palette[s.next], palette[s.nextNext], s.progress);
      s.el.style.background = `linear-gradient(${s.angle}deg, ${c1}, ${c2})`;
    });

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  // Theme toggle
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('change', () => {
      document.body.classList.toggle('dark', toggle.checked);
      palette = getPalette();
    });
  }
});

