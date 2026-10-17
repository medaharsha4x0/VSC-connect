/**
 * Web Audio Engine for VSC-connect
 * Generates synchronized musical chords, bass, and rhythms procedurally matching track BPM,
 * with millisecond seeking, playbackRate drift-tuning, and real-time frequency analysis.
 */

class AudioPlayerEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string | null = null;
  private startTime: number = 0; // audioContext.currentTime when playback started
  private pauseOffset: number = 0; // seconds already played
  private playbackRate: number = 1.0;
  private currentBpm: number = 120;
  private beatTimer: number | null = null;
  private onTimeUpdateCallback: ((time: number) => void) | null = null;

  constructor() {
    // Lazy init on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public async play(trackId: string, startAtSeconds: number = 0, bpm: number = 120) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.currentTrackId = trackId;
    this.currentBpm = bpm;
    this.pauseOffset = Math.max(0, startAtSeconds);
    this.startTime = this.ctx.currentTime;
    this.isPlaying = true;

    this.startMusicSynthesis();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.pauseOffset = this.getCurrentTime();
    this.isPlaying = false;
    this.stopMusicSynthesis();
  }

  public seek(seconds: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stopMusicSynthesis();
    }
    this.pauseOffset = Math.max(0, seconds);
    if (this.ctx) {
      this.startTime = this.ctx.currentTime;
    }
    if (wasPlaying) {
      this.startMusicSynthesis();
    }
  }

  public setVolume(volPercent: number) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(100, volPercent)) / 100;
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.03);
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.8, Math.min(1.2, rate));
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.pauseOffset;
    }
    const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
    return this.pauseOffset + elapsed;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public onTimeUpdate(cb: (time: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  // Procedural music generator that produces actual audio via Web Audio oscillators & envelopes
  private startMusicSynthesis() {
    if (this.beatTimer) {
      clearInterval(this.beatTimer);
    }

    // Interval for notes and update loop
    const beatIntervalMs = (60 / this.currentBpm) * 500; // eighth-note tick
    let tickCount = 0;

    // Chord progressions in minor key (synthwave / lofi vibe)
    // Root frequencies: A2 (110Hz), F2 (87.31Hz), C3 (130.81Hz), G2 (98Hz)
    const chords = [
      [220, 261.63, 329.63, 392], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392, 493.88], // Cmaj7
      [196, 246.94, 293.66, 349.23], // G7
    ];

    this.beatTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;

      const currentTime = this.getCurrentTime();
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(currentTime);
      }

      // Schedule synth sounds
      const chordIndex = Math.floor(currentTime / 4) % chords.length;
      const currentChord = chords[chordIndex];

      // Kick on beat 0 and 4
      if (tickCount % 4 === 0) {
        this.playKick(this.ctx.currentTime);
      }
      // Hi-hat on every off-beat
      if (tickCount % 2 === 1) {
        this.playHiHat(this.ctx.currentTime);
      }
      // Snare on beat 2 and 6
      if (tickCount % 4 === 2) {
        this.playSnare(this.ctx.currentTime);
      }

      // Warm synth chord arpeggio
      const noteFreq = currentChord[tickCount % currentChord.length];
      this.playSynthNote(noteFreq, this.ctx.currentTime);

      tickCount++;
    }, beatIntervalMs);
  }

  private stopMusicSynthesis() {
    if (this.beatTimer) {
      clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
  }

  private playSynthNote(freq: number, when: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, when);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, when);
      filter.frequency.exponentialRampToValueAtTime(300, when + 0.35);

      noteGain.gain.setValueAtTime(0.08, when);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.4);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(when);
      osc.stop(when + 0.45);
    } catch {
      // Audio node scheduling guard
    }
  }

  private playKick(when: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, when);
      osc.frequency.exponentialRampToValueAtTime(35, when + 0.12);
      gain.gain.setValueAtTime(0.3, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(when);
      osc.stop(when + 0.16);
    } catch {
      // Audio node scheduling guard
    }
  }

  private playSnare(when: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Noise burst for snare
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, when);
      gain.gain.setValueAtTime(0.12, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(when);
      osc.stop(when + 0.12);
    } catch {
      // Audio node scheduling guard
    }
  }

  private playHiHat(when: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, when);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, when);

      gain.gain.setValueAtTime(0.04, when);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(when);
      osc.stop(when + 0.06);
    } catch {
      // Audio node scheduling guard
    }
  }

  public destroy() {
    this.stopMusicSynthesis();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioPlayer = new AudioPlayerEngine();
