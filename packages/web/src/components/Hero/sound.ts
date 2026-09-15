// Ambience that plays while the mesh drifts. Browsers only allow playback after a user gesture, so
// autoplay may be refused (ignored) while a click-driven intro will sound.
import ambienceUrl from '@richburdon/ui-core/assets/sounds/ambience.m4a?url';

const FADE_MS = 2000;
const VOLUME = 0.6;

export type Sound = {
  /** Start (looping) from silence, fading in. */
  play: () => void;
  /** Stop and rewind. */
  stop: () => void;
};

export const createAmbience = (): Sound => {
  const audio = new Audio(ambienceUrl);
  audio.loop = true;
  audio.preload = 'auto';
  let fade: number | undefined;

  const stop = () => {
    clearInterval(fade);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  };

  const play = () => {
    stop();
    const started = performance.now();
    fade = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / FADE_MS);
      audio.volume = VOLUME * t;
      if (t === 1) {
        clearInterval(fade);
      }
    }, 50);
    audio.play().catch(() => {
      clearInterval(fade); // No gesture yet; stay silent.
    });
  };

  return { play, stop };
};
