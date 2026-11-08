/**
 * Scratch Card Canvas Engine (Versión Ultra-Rendimiento para Celulares)
 * - NUNCA se borra al scrollear (ignora el cambio de barra de navegación del celular).
 * - Pantalla fija al raspar (bloqueo total de gestos mientras el dedo esté en la tarjeta).
 * - Trazo directo continuo de 60fps/120fps sin lag.
 * - Despeje rápido en 2-3 pasadas (umbral optimizado a 25%).
 */

class BirthdayScratchCard {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.isDrawing = false;
    this.isCompleted = false;
    this.lastPoint = null;
    this.brushRadius = options.brushRadius || 38;
    this.threshold = options.threshold || 25; // 25% para que con 2-3 pasadas se abra
    this.onComplete = options.onComplete || (() => {});
    this.onScratch = options.onScratch || (() => {});

    // Matriz virtual ligera (18x24 = 432 celdas) para calcular porcentaje en microsegundos
    this.cols = 18;
    this.rows = 24;
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

    // Chispas decorativas sutiles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
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

    const lockScreen = () => {
      document.body.style.touchAction = 'none';
      document.documentElement.style.touchAction = 'none';
    };

    const unlockScreen = () => {
      document.body.style.touchAction = '';
      document.documentElement.style.touchAction = '';
    };

    const onPointerDown = (e) => {
      if (this.isCompleted) return;
      if (e.cancelable) e.preventDefault();
      lockScreen();
      
      try {
        c.setPointerCapture(e.pointerId);
      } catch (err) {}

      this.isDrawing = true;
      this.lastPoint = this.getPos(e);
      this.scratchPoint(this.lastPoint.x, this.lastPoint.y);
      this.triggerAudio(0);
    };

    const onPointerMove = (e) => {
      if (!this.isDrawing || this.isCompleted) return;
      if (e.cancelable) e.preventDefault();

      const pos = this.getPos(e);
      const dx = pos.x - this.lastPoint.x;
      const dy = pos.y - this.lastPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= 2) {
        this.scratchStroke(this.lastPoint.x, this.lastPoint.y, pos.x, pos.y);
        this.lastPoint = pos;
        this.triggerAudio(dist);
        this.checkProgress();
      }
    };

    const onPointerUp = (e) => {
      unlockScreen();
      if (e && e.cancelable) e.preventDefault();
      try {
        if (e && e.pointerId && c.hasPointerCapture(e.pointerId)) {
          c.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
      this.isDrawing = false;
      this.lastPoint = null;
    };

    // Usar Pointer Events (soporte unificado en Android e iOS)
    c.addEventListener('pointerdown', onPointerDown, { passive: false });
    c.addEventListener('pointermove', onPointerMove, { passive: false });
    c.addEventListener('pointerup', onPointerUp, { passive: false });
    c.addEventListener('pointercancel', onPointerUp, { passive: false });

    // Fallback táctil adicional
    c.addEventListener('touchstart', onPointerDown, { passive: false });
    c.addEventListener('touchmove', onPointerMove, { passive: false });
    c.addEventListener('touchend', onPointerUp, { passive: false });

    // IMPORTANTE: NUNCA redibujar la lámina al hacer scroll vertical
    // Solo redibujar si el usuario gira físicamente el celular (ancho cambia más de 60px)
    let initialWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      const newWidth = window.innerWidth;
      if (Math.abs(newWidth - initialWidth) > 60 && !this.isCompleted) {
        initialWidth = newWidth;
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

  scratchPoint(x, y) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, this.brushRadius, 0, Math.PI * 2);
    ctx.fill();
    this.markGridPoint(x, y);
  }

  scratchStroke(x1, y1, x2, y2) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = this.brushRadius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    this.markGridPoint(x2, y2);
    const midX = (x1 + x2) * 0.5;
    const midY = (y1 + y2) * 0.5;
    this.markGridPoint(midX, midY);
  }

  markGridPoint(x, y) {
    const r = this.brushRadius;
    const minCol = Math.max(0, Math.floor((x - r) / this.cellW));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + r) / this.cellW));
    const minRow = Math.max(0, Math.floor((y - r) / this.cellH));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + r) / this.cellH));
    const r2 = r * r;

    for (let row = minRow; row <= maxRow; row++) {
      const cy = (row + 0.5) * this.cellH;
      const dy2 = (cy - y) * (cy - y);

      for (let col = minCol; col <= maxCol; col++) {
        const cx = (col + 0.5) * this.cellW;
        if ((cx - x) * (cx - x) + dy2 <= r2) {
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
    if (this.lastAudioDist >= 26) {
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
