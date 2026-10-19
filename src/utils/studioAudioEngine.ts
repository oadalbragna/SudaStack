// Web Audio API Synth Engine for Studio Player & Ringtone Playback
class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackName: string = 'Female Lead Cover';
  private durationSec: number = 158; // 2:38
  private currentTimeSec: number = 0;
  private intervalId: any = null;
  private listeners: Array<() => void> = [];
  private activeOscillators: OscillatorNode[] = [];

  constructor() {
    // Lazy init audio context on user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      trackName: this.currentTrackName,
      currentTime: this.currentTimeSec,
      duration: this.durationSec,
      progressRatio: this.durationSec > 0 ? this.currentTimeSec / this.durationSec : 0,
      formattedCurrentTime: this.formatTime(this.currentTimeSec),
      formattedDuration: this.formatTime(this.durationSec),
    };
  }

  public setTrack(name: string, durationSec: number = 158) {
    this.stop();
    this.currentTrackName = name;
    this.durationSec = durationSec;
    this.currentTimeSec = 0;
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play() {
    this.initContext();
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Start synthesizer loop to play melodic music chords & ringtone tones
    this.startMelodyLoop();

    // Timer ticker
    this.intervalId = setInterval(() => {
      this.currentTimeSec += 1;
      if (this.currentTimeSec >= this.durationSec) {
        this.currentTimeSec = 0;
      }
      this.notify();
    }, 1000);

    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopAudioNodes();
    this.notify();
  }

  public stop() {
    this.pause();
    this.currentTimeSec = 0;
    this.notify();
  }

  public seek(ratio: number) {
    this.currentTimeSec = Math.floor(ratio * this.durationSec);
    this.notify();
  }

  private formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Play a smooth musical chord sequence using Web Audio synthesizer
  private startMelodyLoop() {
    if (!this.ctx) return;

    // Romantic / Melodic pentatonic notes
    const notes = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      659.25, // E5
      587.33, // D5
    ];

    let noteIdx = 0;
    const playNoteStep = () => {
      if (!this.isPlaying || !this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = notes[noteIdx % notes.length];
        noteIdx++;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Soft romantic attack and release
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.85);

        this.activeOscillators.push(osc);

        // Schedule next note
        if (this.isPlaying) {
          setTimeout(playNoteStep, 450);
        }
      } catch (e) {
        // audio context handling
      }
    };

    playNoteStep();
  }

  private stopAudioNodes() {
    try {
      this.activeOscillators.forEach((osc) => {
        try { osc.stop(); } catch (e) { /* ignore */ }
      });
      this.activeOscillators = [];
    } catch (e) {
      // ignore
    }
  }
}

export const studioAudio = new StudioAudioEngine();
