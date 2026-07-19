class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
  }

  isEnabled() {
    return this.enabled;
  }

  playWoodKnock() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.15);

      gainNode.gain.setValueAtTime(0.6, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(600, time);
      noiseFilter.Q.setValueAtTime(3, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.16);
      noise.start(time);
      noise.stop(time + 0.1);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  playCardSlide() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      const duration = 0.25;

      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, time);
      filter.frequency.exponentialRampToValueAtTime(400, time + duration);
      filter.Q.setValueAtTime(1.5, time);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.0, time);
      gainNode.gain.linearRampToValueAtTime(0.12, time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      noise.start(time);
      noise.stop(time + duration);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  playCoinClink() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      const duration = 0.4;

      const frequencies = [850, 1075, 2200, 4400];
      const gains = [0.08, 0.06, 0.04, 0.02];

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.3, time);
      masterGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      masterGain.connect(this.ctx.destination);

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq - 15, time + 0.05);

        oscGain.gain.setValueAtTime(gains[idx], time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration * (idx === 0 ? 1 : 0.6));

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.start(time);
        osc.stop(time + duration);
      });
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }

  playPiecePlace() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      const duration = 0.12;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + duration);

      gainNode.gain.setValueAtTime(0.4, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
      noise.start(time);
      noise.stop(time + 0.06);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  }
}

export const audio = new AudioEngine();
