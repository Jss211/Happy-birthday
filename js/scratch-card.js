/**
 * Scratch Card Canvas Engine (Versión Ultra-Rendimiento para Celulares)
 * - Cero lag: Cálculo matricial O(1) sin lectura pesada de getImageData.
 * - Bloqueo total de scroll con PointerCapture (el estándar de juegos web).
 * - Despeje rápido y satisfactorio (2-3 pasadas con el pulgar revelan la sorpresa).
 */

class BirthdayScratchCard {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.isDrawing = false;
    this.isCompleted = false;
    this.lastPoint = null;
    this.brushRadius = options.brushRadius || 36;
    this.threshold = options.threshold || 30; // 30% descubierto para activar (2-3 pasadas)
    this.onComplete = options.onComplete || (() => {});
    this.onScratch = options.onScratch || (() => {});

    // Matriz de celdas virtuales (20x25 = 500 celdas) para porcentaje instantáneo O(1)
    this.cols = 20;
    this.rows = 25;
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
    
    // DPR de 1.0 para el lienzo de raspado: máximo rendimiento sin sobrecargar la GPU del celular
    this.canvas.width = this.width;
    this.canvas.height = this.height;

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
    for (let i = 0; i < 70; i++) {
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

    const onPointerDown = (e) => {
      if (this.isCompleted) return;
      if (e.cancelable) e.preventDefault();
      
      // Capturar puntero para que el navegador NUNCA mueva ni desplace la página
      try {
        c.setPointerCapture(e.pointerId);
      } catch (err) {}

      this.isDrawing = true;
      this.lastPoint = this.getPos(e);
      this.scratchAt(this.lastPoint.x, this.lastPoint.y);
      this.triggerAudio(0);
    };

    const onPointerMove = (e) => {
      if (!this.isDrawing || this.isCompleted) return;
      if (e.cancelable) e.preventDefault();

      const pos = this.getPos(e);
      const dx = pos.x - this.lastPoint.x;
      const dy = pos.y - this.lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Interpolación suave para cubrir el trazo sin dejar huecos
      const steps = Math.max(1, Math.ceil(dist / (this.brushRadius * 0.5)));
      for (let i = 1; i <= steps; i++) {
        const ix = this.lastPoint.x + (dx * (i / steps));
        const iy = this.lastPoint.y + (dy * (i / steps));
        this.scratchAt(ix, iy);
      }

      this.lastPoint = pos;
      this.triggerAudio(dist);
      this.checkProgress();
    };

    const onPointerUp = (e) => {
      if (e && e.cancelable) e.preventDefault();
      try {
        if (e.pointerId && c.hasPointerCapture(e.pointerId)) {
          c.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
      this.isDrawing = false;
      this.lastPoint = null;
    };

    // Usar Pointer Events (soporte universal moderno en Android e iOS)
    c.addEventListener('pointerdown', onPointerDown, { passive: false });
    c.addEventListener('pointermove', onPointerMove, { passive: false });
    c.addEventListener('pointerup', onPointerUp, { passive: false });
    c.addEventListener('pointercancel', onPointerUp, { passive: false });

    // Fallback táctil adicional con bloqueo de scroll
    c.addEventListener('touchstart', onPointerDown, { passive: false });
    c.addEventListener('touchmove', onPointerMove, { passive: false });
    c.addEventListener('touchend', onPointerUp, { passive: false });

    window.addEventListener('resize', () => {
      if (!this.isCompleted) {
        this.resize();
        this.drawCover();
      }
    });
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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

    // Actualizar celdas de la matriz virtual O(1)
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
    if (this.lastAudioDist >= 22) {
      this.lastAudioDist = 0;
      this.onScratch();
    }
  }

  checkProgress() {
    if (this.isCompleted) return;
    const percent = (this.clearedCells / this.totalCells) * 100;

    if (percent >= this.threshold) {
      this.revealAll();
    }
  }

  revealAll() {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.canvas.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    this.canvas.style.opacity = '0';
    this.canvas.style.transform = 'scale(1.02)';
    this.canvas.style.pointerEvents = 'none';

    setTimeout(() => {
      this.canvas.style.display = 'none';
      if (this.onComplete) {
        this.onComplete();
      }
    }, 400);
  }
}
