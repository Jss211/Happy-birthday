/**
 * Scratch Card Canvas Engine (Versión Ultra-Rendimiento para Celulares)
 * - Cero lag: Cálculo matricial O(1) sin lectura pesada de getImageData.
 * - Cero scroll involuntario: Bloqueo total de gestos nativos mientras se raspa.
 * - Interpolación suave para trazos rápidos a 60fps/120fps.
 */

class BirthdayScratchCard {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.isCompleted = false;
    this.lastPoint = null;
    this.brushRadius = options.brushRadius || 30;
    this.threshold = options.threshold || 38; // 38% descubierto para activar la sorpresa
    this.onComplete = options.onComplete || (() => {});
    this.onScratch = options.onScratch || (() => {});

    // Matriz de celdas virtuales (24x30 = 720 celdas) para calcular porcentaje en microsegundos
    this.cols = 24;
    this.rows = 30;
    this.totalCells = this.cols * this.rows;
    this.grid = new Uint8Array(this.totalCells);
    this.clearedCells = 0;
    this.lastAudioDist = 0;

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
    
    this.width = Math.max(280, Math.floor(rect.width));
    this.height = Math.max(420, Math.floor(rect.height));
    
    // Usar DPR estándar (1.0 o max 1.25) en el lienzo de rascado para rendimiento fluido en celulares
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.scale = dpr;
    this.ctx.scale(dpr, dpr);

    this.cellW = this.width / this.cols;
    this.cellH = this.height / this.rows;
  }

  drawCover() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Fondo dorado satinado con textura metalizada
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d4af37');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.5, '#d4af37');
    grad.addColorStop(0.75, '#f5cba7');
    grad.addColorStop(1, '#aa7c11');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Chispas decorativas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Marco interior
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Texto instructivo central
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2703';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✨ RASPA CON TU DEDO AQUÍ ✨', w / 2, h / 2 - 14);

    ctx.fillStyle = '#5c4007';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Descubre tu Pase de Reencuentro', w / 2, h / 2 + 14);

    ctx.restore();
  }

  bindEvents() {
    const c = this.canvas;

    const start = (e) => {
      if (this.isCompleted) return;
      // BLOQUEO ABSOLUTO DE SCROLL en touchstart
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      this.isDrawing = true;
      this.lastPoint = this.getPos(e);
      this.scratchAt(this.lastPoint.x, this.lastPoint.y);
      this.triggerAudio(0);
    };

    const move = (e) => {
      if (!this.isDrawing || this.isCompleted) return;
      // BLOQUEO ABSOLUTO DE SCROLL en touchmove
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      const pos = this.getPos(e);
      const dx = pos.x - this.lastPoint.x;
      const dy = pos.y - this.lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Interpolación suave para cubrir el trazo sin dejar huecos aunque muevan el dedo rápido
      const steps = Math.max(1, Math.ceil(dist / (this.brushRadius * 0.6)));
      for (let i = 1; i <= steps; i++) {
        const ix = this.lastPoint.x + (dx * (i / steps));
        const iy = this.lastPoint.y + (dy * (i / steps));
        this.scratchAt(ix, iy);
      }

      this.lastPoint = pos;
      this.triggerAudio(dist);
      this.checkProgress();
    };

    const end = (e) => {
      if (e && e.cancelable) e.preventDefault();
      this.isDrawing = false;
      this.lastPoint = null;
    };

    // Eventos táctiles móviles con passive: false para garantizar preventDefault
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end, { passive: false });
    c.addEventListener('touchcancel', end, { passive: false });

    // Eventos ratón para computadoras
    c.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    window.addEventListener('resize', () => {
      if (!this.isCompleted) {
        this.resize();
        this.drawCover();
      }
    });
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  scratchAt(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Actualizar celdas de la matriz virtual en microsegundos O(1)
    const r = this.brushRadius;
    const minCol = Math.max(0, Math.floor((x - r) / this.cellW));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + r) / this.cellW));
    const minRow = Math.max(0, Math.floor((y - r) / this.cellH));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + r) / this.cellH));
    const r2 = r * r;

    for (let row = minRow; row <= maxRow; row++) {
      const cy = (row + 0.5) * this.cellH;
      const dy = cy - y;
      const dy2 = dy * dy;

      for (let col = minCol; col <= maxCol; col++) {
        const cx = (col + 0.5) * this.cellW;
        const dx = cx - x;
        if (dx * dx + dy2 <= r2) {
          const idx = row * this.cols + col;
          if (this.grid[idx] === 0) {
            this.grid[idx] = 1;
            this.clearedCells++;
          }
        }
      }
    }
  }

  triggerAudio(dist) {
    this.lastAudioDist += dist;
    if (this.lastAudioDist >= 18) {
      this.lastAudioDist = 0;
      this.onScratch();
    }
  }

  checkProgress() {
    if (this.isCompleted) return;
    const percent = (this.clearedCells / this.totalCells) * 100;

    if (percent >= this.threshold) {
      this.isCompleted = true;
      this.revealAll();
    }
  }

  revealAll() {
    this.canvas.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    this.canvas.style.opacity = '0';
    this.canvas.style.transform = 'scale(1.02)';
    this.canvas.style.pointerEvents = 'none';

    setTimeout(() => {
      this.canvas.style.display = 'none';
      if (this.onComplete) {
        this.onComplete();
      }
    }, 500);
  }
}
