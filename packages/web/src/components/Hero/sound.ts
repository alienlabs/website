// Sounds for the hero. Browsers only allow playback after a user gesture, so autoplay may be refused
// (ignored) while a click-driven intro will sound.
import airlockUrl from '@richburdon/ui-core/assets/sounds/airlock.m4a?url';
import ambienceUrl from '@richburdon/ui-core/assets/sounds/ambience.m4a?url';

export type Sound = {
  /** Start from the beginning (fading in, if configured). */
  play: () => void;
  /** Fade out (if configured), then pause and rewind (immediately when `hard`). */
  stop: (hard?: boolean) => void;
};

type SoundOptions = {
  loop?: boolean;
  volume?: number;
  /** Fade-in duration (ms); 0 starts at full volume. */
  fadeIn?: number;
  /** Fade-out duration (ms) on stop; 0 stops immediately. */
  fadeOut?: number;
};

const createSound = (url: string, { loop = false, volume = 1, fadeIn = 0, fadeOut = 0 }: SoundOptions): Sound => {
  const audio = new Audio(url);
  audio.loop = loop;
  audio.preload = 'auto';
  let fade: number | undefined;

  // Ramp the volume from its current level to `to` over `ms`, then `done`.
  const ramp = (to: number, ms: number, done?: () => void) => {
    clearInterval(fade);
    if (ms <= 0) {
      audio.volume = to;
      done?.();
      return;
    }
    const from = audio.volume;
    const started = performance.now();
    fade = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / ms);
      audio.volume = from + (to - from) * t;
      if (t === 1) {
        clearInterval(fade);
        done?.();
      }
    }, 50);
  };

  const halt = () => {
    clearInterval(fade);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  };

  const stop = (hard = false) => {
    if (hard || audio.paused) {
      halt();
    } else {
      ramp(0, fadeOut, halt);
    }
  };

  const play = () => {
    halt();
    ramp(volume, fadeIn);
    audio.play().catch(() => {
      clearInterval(fade); // No gesture yet; stay silent.
    });
  };

  return { play, stop };
};

/** Looping background ambience for the drift phase. */
export const createAmbience = () => createSound(ambienceUrl, { loop: true, volume: 0.6, fadeIn: 2000, fadeOut: 1500 });

/** One-shot "airlock" when the logo opens. */
export const createAirlock = () => createSound(airlockUrl, { volume: 0.8 });
