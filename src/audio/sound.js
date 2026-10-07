// Web Audio sound design — fully synthesized, no audio assets.
// Ambient pad (two detuned chord stacks slowly crossfading under a
// breathing lowpass, over a soft low "air" bed) that loops forever,
// hover tick, press thock. A user-supplied music file can replace the
// ambient later via setMusicUrl().
//
// The ambient never stops on its own: source nodes loop indefinitely and
// an auto-resume watchdog revives the AudioContext if the browser suspends
// it (tab switch, mobile interruption, output-device change).

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.ambient = null;
    this.musicEl = null;
    this.musicUrl = null; // set when the user supplies a track

    // revive a suspended context whenever the page regains attention
    const revive = () => {
      if (this.enabled && this.ctx && this.ctx.state !== 'running') {
        this.ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('focus', revive);
    window.addEventListener('pointerdown', revive, { passive: true });
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
    this.ctx.onstatechange = () => {
      if (this.enabled && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
  }

  enable() {
    this.ensure();
    this.enabled = true; // set synchronously — toggle() reads this right away

    const go = () => {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0.9, t + 0.8);
      if (this.musicUrl) this.playMusic();
      else this.startAmbient();
    };

    if (this.ctx.state !== 'running') this.ctx.resume().then(go).catch(go);
    else go();
  }

  disable() {
    if (!this.ctx) return;
    this.enabled = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.4);
    this.musicEl?.pause();
  }

  toggle() {
    this.enabled ? this.disable() : this.enable();
    return this.enabled;
  }

  /* ---- ambient pad: crossfading chord stacks + soft air, loops forever ---- */
  startAmbient() {
    if (this.ambient || !this.ctx) return;
    const ctx = this.ctx;
    const started = [];
    const start = (n) => { n.start(); started.push(n); return n; };

    // pad bus through a slowly breathing lowpass keeps the top end soft
    const padBus = ctx.createGain();
    padBus.gain.value = 0.3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 850;
    lp.Q.value = 0.4;
    padBus.connect(lp).connect(this.master);
    const lpLfo = start(ctx.createOscillator());
    lpLfo.frequency.value = 0.05;
    const lpDepth = ctx.createGain();
    lpDepth.gain.value = 260;
    lpLfo.connect(lpDepth).connect(lp.frequency);

    // two chords crossfaded by one ultra-slow LFO (~50s cycle); the gain
    // swings 0.05–0.95 around a 0.5 base so neither chord ever fully drops out
    const fade = start(ctx.createOscillator());
    fade.frequency.value = 0.02;
    const chord = (freqs, dir) => {
      const g = ctx.createGain();
      g.gain.value = 0.5;
      const depth = ctx.createGain();
      depth.gain.value = 0.45 * dir;
      fade.connect(depth).connect(g.gain);
      g.connect(padBus);
      freqs.forEach((f, i) => {
        [-4, 4].forEach((cents) => {
          const o = start(ctx.createOscillator());
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = f;
          o.detune.value = cents;
          const og = ctx.createGain();
          og.gain.value = i === 0 ? 0.16 : 0.1;
          o.connect(og);
          let tail = og;
          if (ctx.createStereoPanner) {
            const pan = ctx.createStereoPanner();
            pan.pan.value = cents > 0 ? 0.35 : -0.35;
            og.connect(pan);
            tail = pan;
          }
          tail.connect(g);
        });
      });
      return g;
    };
    chord([110, 164.81, 220, 246.94], 1);    // Am(add9): A2 E3 A3 B3
    chord([87.31, 130.81, 174.61, 220], -1); // Fmaj7:    F2 C3 F3 A3

    // soft "air" bed — noise pushed low and low-passed so it reads as
    // room tone, not static
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true; // loops forever
    const airLp = ctx.createBiquadFilter();
    airLp.type = 'lowpass';
    airLp.frequency.value = 240;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.04;
    noise.connect(airLp).connect(airGain).connect(this.master);
    const airLfo = start(ctx.createOscillator());
    airLfo.frequency.value = 0.07;
    const airDepth = ctx.createGain();
    airDepth.gain.value = 90;
    airLfo.connect(airDepth).connect(airLp.frequency);
    start(noise);

    // sub anchor — felt on real speakers, harmless on laptops
    const sub = start(ctx.createOscillator());
    sub.frequency.value = 55;
    const subG = ctx.createGain();
    subG.gain.value = 0.05;
    sub.connect(subG).connect(this.master);

    this.ambient = { started, padBus, lp, airGain, subG };
  }

  /* -------- interaction sounds -------- */
  hoverTick() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1400, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
    o.connect(g).connect(this.master);
    o.start(); o.stop(ctx.currentTime + 0.09);
  }

  pressThock() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(210, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.16);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    o.connect(g).connect(this.master);
    o.start(); o.stop(ctx.currentTime + 0.25);
  }

  /* -------- optional user-supplied music (loops forever too) -------- */
  setMusicUrl(url) {
    this.musicUrl = url;
    if (this.enabled) this.playMusic();
  }

  playMusic() {
    if (!this.musicUrl || !this.ctx) return;
    if (!this.musicEl) {
      this.musicEl = new Audio(this.musicUrl);
      this.musicEl.loop = true;
      const node = this.ctx.createMediaElementSource(this.musicEl);
      node.connect(this.master);
    }
    this.musicEl.play().catch(() => {});
  }
}

export const sound = new Sound();
