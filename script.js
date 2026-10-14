/* ===== НАВИГАЦИЯ ПО СТРАНИЦАМ ===== */
const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.page).classList.add('active');
  });
});

/* ===== ПОД-ВКЛАДКИ В «УСЛОВИЯХ» ===== */
const subTabs = document.querySelectorAll('.sub-tab');
const subPages = document.querySelectorAll('.sub-page');

subTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    subTabs.forEach(t => t.classList.remove('active'));
    subPages.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(tab.dataset.sub).classList.add('active');
  });
});

/* ===== МОДАЛЬНОЕ ОКНО ЗАКАЗА ===== */
const modal = document.getElementById('modal');
const modalPack = document.getElementById('modal-pack');
const formPack = document.getElementById('form-pack');

document.querySelectorAll('.order-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    modalPack.textContent = btn.dataset.pack;
    formPack.value = btn.dataset.pack;
    modal.classList.add('open');
  });
});

document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

/* ===== ТОГГЛ СОГЛАСИЯ ===== */
const consent = document.getElementById('consent');
const submitBtn = document.getElementById('submit-btn');

consent.addEventListener('change', () => {
  submitBtn.disabled = !consent.checked;
  submitBtn.classList.toggle('disabled', !consent.checked);
});

/* ===== ОТПРАВКА ЗАКАЗА + ВЗРЫВ ===== */
const boom = document.getElementById('boom');
const orderForm = document.getElementById('order-form');

orderForm.addEventListener('submit', e => {
  e.preventDefault();

  modal.classList.remove('open');
  boom.classList.add('active');

  setTimeout(() => boom.classList.remove('active'), 2700);

  orderForm.reset();
  submitBtn.disabled = true;
  submitBtn.classList.add('disabled');
});

/* ===== A/B ПЛЕЕР =====
   Звук генерируется прямо в браузере через Web Audio API:
   «ДО» — глухой (низкий фильтр), «ПОСЛЕ» — яркий (высокий фильтр). */
const players = [];

document.querySelectorAll('.ab-player').forEach(root => {
  const playBtn = root.querySelector('.play-btn');
  const tabs = root.querySelectorAll('.ab-tab');
  const bar = root.querySelector('.progress');
  const fill = root.querySelector('.progress-fill');
  const timeEl = root.querySelector('.time');

  const s = {
    playing: false,
    mode: 'before',
    pos: 0,
    duration: 24,
    ctx: null,
    osc: null,
    gain: null,
    filter: null,
    raf: null,
    last: 0
  };

  const fmt = sec => {
    const m = Math.floor(sec / 60);
    const r = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + r;
  };

  const render = () => {
    fill.style.width = (s.pos / s.duration * 100) + '%';
    timeEl.textContent = fmt(s.pos) + ' / ' + fmt(s.duration);
  };

  const ensureCtx = () => {
    if (!s.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = new AC();
    }
    if (s.ctx.state === 'suspended') s.ctx.resume();
    return s.ctx;
  };

  const startTone = () => {
    const ctx = ensureCtx();

    s.osc = ctx.createOscillator();
    s.filter = ctx.createBiquadFilter();
    s.gain = ctx.createGain();

    s.osc.type = 'sawtooth';
    s.osc.frequency.value = 110;
    s.filter.type = 'lowpass';
    s.filter.frequency.value = s.mode === 'after' ? 6000 : 450;
    s.gain.gain.value = 0.05;

    s.osc.connect(s.filter).connect(s.gain).connect(ctx.destination);
    s.osc.start();
  };

  const stopTone = () => {
    if (s.osc) {
      try { s.osc.stop(); } catch (e) { /* уже остановлен */ }
      s.osc.disconnect();
      s.osc = null;
    }
    if (s.gain) { s.gain.disconnect(); s.gain = null; }
    if (s.filter) { s.filter.disconnect(); s.filter = null; }
  };

  const loop = now => {
    if (!s.playing) return;

    const dt = (now - s.last) / 1000;
    s.last = now;
    s.pos += dt;

    if (s.pos >= s.duration) {
      s.pos = s.duration;
      render();
      pause();
      return;
    }

    render();
    s.raf = requestAnimationFrame(loop);
  };

  function play() {
    if (s.playing) return;
    if (s.pos >= s.duration) s.pos = 0;

    s.playing = true;
    playBtn.textContent = '⏸ ПАУЗА';
    playBtn.classList.add('playing');

    startTone();
    s.last = performance.now();
    s.raf = requestAnimationFrame(loop);
  }

  function pause() {
    s.playing = false;
    playBtn.textContent = '▶ ПОГНАЛИ';
    playBtn.classList.remove('playing');

    stopTone();
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = null; }
  }

  playBtn.addEventListener('click', () => (s.playing ? pause() : play()));

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      s.mode = tab.dataset.mode;
      if (s.filter) s.filter.frequency.value = s.mode === 'after' ? 6000 : 450;
    });
  });

  bar.addEventListener('click', e => {
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    s.pos = ratio * s.duration;
    render();
  });

  render();
  players.push({ pause });
});

/* Если переключили вкладку браузера — приостановить все плееры,
   чтобы звук не играл в фоне. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) players.forEach(p => p.pause());
});
