function init() {
  // Year stamp
  const yearEl = document.getElementById('y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
    const speed = 6000 + Math.random() * 6000; // ms per color blend (slightly faster)
    const start = performance.now() - Math.random() * speed; // begin in-progress
    const angleOffset = Math.random() * 360;
    const rotSpeed = (Math.random() * 30 - 15) / 1000; // deg per ms
    const state = {
      el: tile,
      index,
      next: (index + 1) % palette.length,
      start,
      speed,
      angleOffset,
      rotSpeed,
    };
    const progress = (performance.now() - start) / speed;
    const c1 = mix(palette[state.index], palette[state.next], progress);
    const c2 = mix(palette[state.next], palette[(state.next + 1) % palette.length], progress);
    tile.style.background = `linear-gradient(${angleOffset}deg, ${c1}, ${c2})`;
    return state;
  });

  function step(now) {
    states.forEach(s => {
      let elapsed = now - s.start;
      let progress = elapsed / s.speed;
      if (progress >= 1) {
        const shifts = Math.floor(progress);
        s.index = (s.index + shifts) % palette.length;
        s.next = (s.index + 1) % palette.length;
        s.start += s.speed * shifts;
        progress -= shifts;
      }
      const c1 = mix(palette[s.index], palette[s.next], progress);
      const c2 = mix(palette[s.next], palette[(s.next + 1) % palette.length], progress);
      const angle = (s.angleOffset + now * s.rotSpeed) % 360;
      s.el.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

