

class BirthdayScratchCard {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.isDrawing = false;
    this.isCompleted = false;
    this.lastPoint = null;
    this.brushRadius = options.brushRadius || 26;
    this.threshold = options.threshold || 45; // 45% descubierto
    this.onComplete = options.onComplete || (() => {});
    this.onScratch = options.onScratch || (() => {});

    this.init();
  }

  init() {
    this.resize();
    this.drawCover();
    this.bindEvents();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 340, height: 420 };
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.max(280, Math.floor(rect.width));
    this.height = Math.max(420, Math.floor(rect.height));
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  drawCover() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Fondo dorado satinado elegante
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d4af37');
    grad.addColorStop(0.3, '#f9e79f');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(0.8, '#f5cba7');
    grad.addColorStop(1, '#aa7c11');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Chispas y textura de purpurina
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(130, 95, 20, 0.4)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Marco interior decorativo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Texto instructivo central
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a3407';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✨ RASPA CON TU DEDO AQUÍ ✨', w / 2, h / 2 - 12);

    ctx.fillStyle = '#684b0c';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Descubre tu Pase VIP de Cumpleaños', w / 2, h / 2 + 14);
  }

  bindEvents() {
    const c = this.canvas;

    const start = (e) => {
      if (this.isCompleted) return;
      this.isDrawing = true;
      this.lastPoint = this.getPos(e);
      this.scratch(this.lastPoint.x, this.lastPoint.y);
      this.onScratch();
    };

    const move = (e) => {
      if (!this.isDrawing || this.isCompleted) return;
      e.preventDefault(); // Evitar scroll mientras se raspa en celular
      const pos = this.getPos(e);
      this.scratchLine(this.lastPoint.x, this.lastPoint.y, pos.x, pos.y);
      this.lastPoint = pos;
      this.onScratch();
      this.checkProgressThrottled();
    };

    const end = () => {
      this.isDrawing = false;
      this.lastPoint = null;
      if (!this.isCompleted) {
        this.checkProgress();
      }
    };

    // Eventos táctiles móviles
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);

    // Eventos ratón
    c.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    // Redimensionado responsive
    window.addEventListener('resize', () => {
      if (!this.isCompleted) {
        this.resize();
        this.drawCover();
      }
    });
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  scratch(x, y) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  scratchLine(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = this.brushRadius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  checkProgressThrottled() {
    if (this._throttleTimer) return;
    this._throttleTimer = setTimeout(() => {
      this.checkProgress();
      this._throttleTimer = null;
    }, 180);
  }

  checkProgress() {
    if (this.isCompleted) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    // Muestreo rápido de píxeles para no ralentizar el teléfono
    const imgData = this.ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;
    const totalSamples = 1000;
    const step = Math.floor(pixels.length / (totalSamples * 4));
    let clearedCount = 0;

    for (let i = 0; i < pixels.length; i += step * 4) {
      if (pixels[i + 3] === 0) { // Canal Alpha transparente
        clearedCount++;
      }
    }

    const percent = (clearedCount / (pixels.length / (step * 4))) * 100;

    if (percent >= this.threshold) {
      this.isCompleted = true;
      this.revealAll();
    }
  }

  revealAll() {
    // Animación de desvanecimiento suave de la capa rascada restante
    this.canvas.style.transition = 'opacity 0.6s ease-out';
    this.canvas.style.opacity = '0';
    setTimeout(() => {
      this.canvas.style.display = 'none';
      if (this.onComplete) {
        this.onComplete();
      }
    }, 600);
  }
}
