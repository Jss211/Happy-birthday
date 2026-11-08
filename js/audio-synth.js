/**
 */

class BirthdayAudioEngine {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.isMuted = false;
    this._lastScratchTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (this.noiseBuffer || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPlayingMelody) {
      this.stopMelody();
    }
    return this.isMuted;
  }

  // Sonido de clic sutil
  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Sonido de error / fecha incorrecta
  playError() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(140, t);
    osc1.frequency.setValueAtTime(110, t + 0.12);
    osc2.frequency.setValueAtTime(145, t);
    osc2.frequency.setValueAtTime(115, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }

  // Sonido mágico al desbloquear la foto
  playUnlock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + (idx * 0.08);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  // Fanfarria divertida para Cristiano Ronaldo / Banter
  playFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [
      { f: 587.33, d: 0.12 }, // D5
      { f: 587.33, d: 0.12 }, // D5
      { f: 587.33, d: 0.12 }, // D5
      { f: 880.00, d: 0.45 }  // A5 (Siuuuu vibes)
    ];

    let start = this.ctx.currentTime;
    notes.forEach((item) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + item.d);

      start += item.d + 0.04;
    });
  }

  // Sonido de rascado suave y ligero (fricción sutil de papel, sedoso y agradable)
  playScratch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;

    // Ritmo espaciado y suave para que no suene saturado al deslizar el dedo
    const now = Date.now();
    if (this._lastScratchTime && (now - this._lastScratchTime < 55)) {
      return;
    }
    this._lastScratchTime = now;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const offset = Math.random() * 1.5;

    // Filtro suave de banda en frecuencias medias-cálidas (1600Hz - 2200Hz) sin frecuencias chillonas
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1600 + (Math.random() * 600), t);
    bandpass.Q.setValueAtTime(0.85, t); // Q bajo para una textura sedosa y nada estridente

    // Filtro pasabajos para redondear el sonido y quitar cualquier aspereza metálica
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2800, t);

    // Envolvente de volumen muy suave y delicada
    const gain = this.ctx.createGain();
    const duration = 0.038 + (Math.random() * 0.015); // 38ms a 53ms

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.045, t + 0.012); // Volumen bajo y ataque progresivo
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    // Conectar nodos: Source -> Bandpass -> Lowpass -> Gain -> Destination
    source.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(t, offset, duration);
    source.stop(t + duration + 0.01);
  }

  // Explosión festiva de confeti
  playCelebration() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      [523.25, 659.25, 783.99], // Do mayor
      [587.33, 739.99, 880.00], // Re mayor
      [659.25, 830.61, 987.77], // Mi mayor
      [783.99, 987.77, 1174.66] // Sol mayor
    ];

    let t = this.ctx.currentTime;
    chords.forEach((chord, i) => {
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + (i * 0.12));

        gain.gain.setValueAtTime(0.12, t + (i * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.001, t + (i * 0.12) + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + (i * 0.12));
        osc.stop(t + (i * 0.12) + 0.55);
      });
    });
  }
}

window.birthdayAudio = new BirthdayAudioEngine();
