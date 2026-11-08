/**
 */

// Utilidades de conversión para Web Crypto API
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Normalizar texto para comparaciones flexibles (sin acentos, minúsculas)
function cleanText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// 1. SISTEMA DE CONFETI VECTORIAL (Canvas)
// ==========================================
class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.lastWidth = window.innerWidth;
    this.resize();
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - this.lastWidth) > 50) {
        this.lastWidth = window.innerWidth;
        this.resize();
      }
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 32) {
    const colors = ['#f43f5e', '#ec4899', '#d4af37', '#fef08a', '#3b82f6', '#10b981'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 3),
        gravity: 0.22,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        size: 5 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1,
        decay: 0.018 + Math.random() * 0.012
      });
    }

    if (!this.animId) {
      this.loop();
    }
  }

  loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height + 30) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.animId = null;
    }
  }
}

// ==========================================
// 2. MOTOR DE DESENCRIPTADO (Web Crypto)
// ==========================================
async function decryptPhotoData(normalizedDateString) {
  if (!window.ENCRYPTED_PHOTO_PAYLOAD) {
    throw new Error('No se encontró el archivo de datos encriptados');
  }

  const { salt, iv, data } = window.ENCRYPTED_PHOTO_PAYLOAD;
  const saltBytes = base64ToUint8Array(salt);
  const ivBytes = base64ToUint8Array(iv);
  const encryptedBytes = base64ToUint8Array(data);

  const subtle = window.crypto.subtle;
  const encoder = new TextEncoder();
  const passwordKey = encoder.encode(normalizedDateString.trim());

  // 1. Importar clave inicial
  const keyMaterial = await subtle.importKey(
    'raw',
    passwordKey,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 2. Derivar clave AES-GCM con PBKDF2 (100,000 iteraciones)
  const aesKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 3. Desencriptar mediante AES-GCM
  // Si la fecha es incorrecta, decrypt lanzará una excepción automática
  const decryptedBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    aesKey,
    encryptedBytes
  );

  // 4. Crear Blob URL en memoria
  const blob = new Blob([decryptedBuffer], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
}

// ==========================================
// 3. INICIALIZACIÓN DE LA EXPERIENCIA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const particleSys = new ParticleSystem('confetti-canvas');

  // Elementos DOM - Acertijo 1 (Fecha)
  const daySelect = document.getElementById('day-select');
  const monthSelect = document.getElementById('month-select');
  const yearSelect = document.getElementById('year-select');
  const btnUnlockDate = document.getElementById('btn-unlock-date');
  const dateFeedback = document.getElementById('date-feedback');
  const riddleDateCard = document.getElementById('riddle-date-card');

  // Elementos DOM - Sección 2 (Foto y Mensaje)
  const sectionPhoto = document.getElementById('section-photo-letter');
  const photoImage = document.getElementById('decrypted-photo-img');
  const photoSkeleton = document.getElementById('photo-skeleton');

  // Elementos DOM - Acertijo 2 (Fútbol / Banter)
  const inputFootball = document.getElementById('input-football');
  const btnCheckFootball = document.getElementById('btn-check-football');
  const footballFeedback = document.getElementById('football-feedback');
  const riddleFootballCard = document.getElementById('riddle-football-card');

  // Elementos DOM - Sección 3 (Sorpresa Final - Sobre Real)
  const sectionFinal = document.getElementById('section-final-surprise');
  const ticketReward = document.getElementById('ticket-reward');
  const btnMoreConfetti = document.getElementById('btn-more-confetti');

  // Popular selectores de fecha
  populateDateSelectors(daySelect, monthSelect, yearSelect);

  // Estado global
  let isDateSolved = false;
  let isFootballSolved = false;

  // ------------------------------------------
  // LÓGICA ACERTIJO 1: LA FECHA DE AMISTAD
  // ------------------------------------------
  btnUnlockDate.addEventListener('click', async () => {
    window.birthdayAudio.playClick();

    const d = daySelect.value.padStart(2, '0');
    const m = monthSelect.value.padStart(2, '0');
    const y = yearSelect.value;
    const formattedDate = `${y}-${m}-${d}`;

    // Mostrar feedback de carga
    setButtonLoading(btnUnlockDate, true, 'Descifrando recuerdo...');
    hideFeedback(dateFeedback);

    try {
      // Huevo de pascua si pone la fecha en que se conocieron (21 de octubre)
      if (formattedDate === '2026-10-21') {
        setButtonLoading(btnUnlockDate, false);
        window.birthdayAudio.playError();
        riddleDateCard.classList.add('shake-anim');
        setTimeout(() => riddleDateCard.classList.remove('shake-anim'), 600);

        showFeedback(
          dateFeedback,
          'banter',
          '¡Ojo! El 21 de octubre fue el día que nos conocimos 👀... pero acuérdate bien cuándo nos hicimos amigos oficialmente 😉'
        );
        return;
      }

      const photoUrl = await decryptPhotoData(formattedDate);

      // ¡FECHA CORRECTA! (28 de octubre de 2026)
      isDateSolved = true;
      setButtonLoading(btnUnlockDate, false);
      showFeedback(dateFeedback, 'success', '¡Fecha correcta! Desbloqueando recuerdo...');
      window.birthdayAudio.playUnlock();

      // Animación de éxito en tarjeta
      riddleDateCard.classList.add('card-solved');

      // Colocar foto desencriptada
      photoImage.src = photoUrl;
      photoImage.onload = () => {
        photoSkeleton.style.display = 'none';
        photoImage.style.display = 'block';
        const photoNote = document.getElementById('photo-overlay-note');
        if (photoNote) photoNote.style.display = 'inline-flex';
      };

      // Revelar Sección 2 con efecto suave
      sectionPhoto.classList.remove('hidden-section');
      sectionPhoto.classList.add('visible-section');

      // Lanzar confeti celebratorio
      particleSys.burst(window.innerWidth / 2, window.innerHeight * 0.4, 60);

      // Scroll fluido hacia la foto
      setTimeout(() => {
        sectionPhoto.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);

    } catch (err) {
      // FECHA INCORRECTA
      setButtonLoading(btnUnlockDate, false);
      window.birthdayAudio.playError();
      riddleDateCard.classList.add('shake-anim');
      setTimeout(() => riddleDateCard.classList.remove('shake-anim'), 600);

      showFeedback(
        dateFeedback,
        'error',
        'Mmm... esa no es la fecha exacta. ¿Ya se te olvidó? Piénsalo bien 😉'
      );
    }
  });

  // ------------------------------------------
  // LÓGICA ACERTIJO 2: MEJOR JUGADOR (CR7 / BANTER)
  // ------------------------------------------
  btnCheckFootball.addEventListener('click', () => {
    window.birthdayAudio.playClick();
    const answer = cleanText(inputFootball.value);

    if (!answer) {
      showFeedback(footballFeedback, 'error', 'Por favor ingresa un nombre para continuar.');
      return;
    }

    // Variaciones aceptadas para Cristiano Ronaldo
    const cr7Variants = [
      'cristiano ronaldo',
      'cristiano',
      'ronaldo',
      'cr7',
      'el bicho',
      'bicho',
      'siuu',
      'siu',
      'el bicho siu',
      'cr7 el bicho'
    ];

    // Variaciones de Messi
    const messiVariants = [
      'messi',
      'lionel messi',
      'leo messi',
      'la pulga',
      'el enano'
    ];

    const isCr7 = cr7Variants.includes(answer);
    const isMessi = messiVariants.includes(answer);

    if (isCr7) {
      // RESPUESTA PRINCIPAL PEDIDA POR EL USUARIO:
      // "es Messi pero esta correcto" (para joderla)
      isFootballSolved = true;
      window.birthdayAudio.playFanfare();
      riddleFootballCard.classList.add('card-solved');

      showFeedback(
        footballFeedback,
        'banter',
        'Es Messi 🐐... pero está correcto. Solo por ser tu cumpleaños te doy la razón 😉'
      );

      // Desbloquear Sección Final
      unlockFinalSurprise();

    } else if (isMessi) {
      // Huevo de pascua si pone a Messi
      isFootballSolved = true;
      window.birthdayAudio.playUnlock();
      riddleFootballCard.classList.add('card-solved');

      showFeedback(
        footballFeedback,
        'banter',
        '¡Tú sí sabes de buen fútbol! Pero sé sincera... tú venías con ganas de poner a Cristiano 😂 ¡Válido!'
      );

      unlockFinalSurprise();

    } else {
      // Cualquier otro nombre
      window.birthdayAudio.playError();
      riddleFootballCard.classList.add('shake-anim');
      setTimeout(() => riddleFootballCard.classList.remove('shake-anim'), 600);

      showFeedback(
        footballFeedback,
        'error',
        '¿Quién? Nah, no inventes jaja. Pista: Es portugués y hace "Siuuuu" ⚽'
      );
    }
  });

  // Enter en el input de fútbol
  inputFootball.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnCheckFootball.click();
    }
  });

  // ------------------------------------------
  // LÓGICA SECCIÓN 3: LA SORPRESA FINAL (SOBRE REAL DE GALA)
  // ------------------------------------------
  const envelopeBox = document.getElementById('envelope-box');
  const waxSeal = document.getElementById('wax-seal');
  const envelopeOuter = document.getElementById('envelope-outer');
  const envelopeHint = document.getElementById('envelope-hint');
  let isEnvelopeOpened = false;

  function openEnvelope() {
    if (isEnvelopeOpened) return;
    isEnvelopeOpened = true;

    // Sonido de desbloqueo y fanfarria
    window.birthdayAudio.playUnlock();

    // Activar animación 3D de apertura en el sobre
    envelopeOuter.classList.add('envelope-opened');

    if (envelopeHint) {
      envelopeHint.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>¡Invitación y Boleto Dorado Revelados!</span>
      `;
    }

    // Desplegar el Boleto Dorado VIP de adentro del sobre
    setTimeout(() => {
      ticketReward.style.display = 'flex';
      envelopeBox.style.display = 'none';
      window.birthdayAudio.playCelebration();
      particleSys.burst(window.innerWidth / 2, window.innerHeight * 0.45, 30);
      ticketReward.classList.add('ticket-revealed');
    }, 400);
  }

  if (waxSeal) {
    waxSeal.addEventListener('click', openEnvelope);
  }
  if (envelopeBox) {
    envelopeBox.addEventListener('click', openEnvelope);
  }

  function unlockFinalSurprise() {
    sectionFinal.classList.remove('hidden-section');
    sectionFinal.classList.add('visible-section');

    setTimeout(() => {
      sectionFinal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
  }

  // Botón para lanzar más confeti
  if (btnMoreConfetti) {
    btnMoreConfetti.addEventListener('click', () => {
      window.birthdayAudio.playClick();
      window.birthdayAudio.playCelebration();
      particleSys.burst(window.innerWidth * 0.5, window.innerHeight * 0.4, 25);
    });
  }
});

// Helper: popular selectores de Día, Mes y Año
function populateDateSelectors(daySel, monthSel, yearSel) {
  // Días 1 a 31
  for (let i = 1; i <= 31; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i < 10 ? `0${i}` : `${i}`;
    if (i === 1) opt.selected = true;
    daySel.appendChild(opt);
  }

  // Meses
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  months.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = idx + 1;
    opt.textContent = name;
    if (idx === 0) opt.selected = true; // Enero
    monthSel.appendChild(opt);
  });

  // Años (2018 a 2026)
  for (let y = 2026; y >= 2018; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === 2026) opt.selected = true; // Año 2026 seleccionado por defecto
    yearSel.appendChild(opt);
  }
}

function showFeedback(el, type, msg) {
  el.className = `feedback-box feedback-${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  el.style.display = 'flex';
}

function hideFeedback(el) {
  el.style.display = 'none';
}

function setButtonLoading(btn, isLoading, loadingText = 'Verificando...') {
  if (isLoading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-svg"></span> <span>${loadingText}</span>`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
    }
  }
}
