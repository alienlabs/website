import { Show, createSignal, onCleanup, onMount } from 'solid-js';

import { CLOSED_SCALE, HEX_CENTER, Logo, LOGO_SIZE, type LogoController } from '../Logo';
import { type Point } from '../Logo/geometry';
import { type Drift, Mesh, type MeshController, NO_DRIFT } from '../Mesh';

/**
 * Intro states, in order. The first three belong to the Mesh (at rest; drifting; dimmed), the last
 * three to the Logo (fades in; spins; opens) — the mesh widens its gaps along with the opening.
 * @public
 */
export const INTRO_STATES = ['static', 'drift', 'faded', 'visible', 'spun', 'open'] as const;
export type IntroState = (typeof INTRO_STATES)[number];

/** @public */
export type LogoIntroController = {
  /** Current (or target, while transitioning) state. */
  state: () => IntroState;
  /** Animate to `state`, stepping through intermediate states in order; going backwards resets first. */
  set: (state: IntroState) => Promise<void>;
  /** Advance to the next state (wrapping round to the start). */
  step: () => Promise<void>;
  /** Run the whole intro from the start; resolves when open. */
  play: () => Promise<void>;
  /** Interrupt and return to the start state. */
  reset: () => void;
};

export type LogoIntroProps = {
  class?: string;
  /** Play on mount (default: true). */
  autoplay?: boolean;
  /** Receives the state controls once mounted. */
  controller?: (controller: LogoIntroController) => void;
};

// Autoplay holds (ms) before leaving a state that has no transition of its own.
const HOLD = { static: 600, drift: 2000, spun: 400 } as const;

type Layout = { origin: Point; unit: number };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Full-screen logo intro composed of two parts: the Mesh (a monochrome triangular tiling of the
 * whole plane) and the Logo (its six-segment hexagon, hidden at first). The mesh comes alive and
 * dims into the background; the hexagon then fades in over it and plays the Logo's own intro. The
 * Mesh is aligned by measuring where the Logo's closed hexagon lands.
 */
export const LogoIntro = (props: LogoIntroProps) => {
  let container!: HTMLDivElement;
  let logoBox!: HTMLDivElement;
  let logo: LogoController | undefined;
  let mesh: MeshController | undefined;
  const [layout, setLayout] = createSignal<Layout>();
  // The logo box follows the mesh's drift (same box, same transform about its centre), so the
  // hexagon stays on the mesh's origin wherever it has drifted to.
  const [drift, setDrift] = createSignal<Drift>(NO_DRIFT);

  // Where the Logo's closed hexagon centre sits (px, relative to the undrifted container) and its
  // px-per-unit. Measured rects are drifted, so divide out the current scale; the logo box fills the
  // container, so offsets within it are offsets within the container.
  const measure = () => {
    const box = logoBox.getBoundingClientRect();
    const svg = logoBox.querySelector('svg')!.getBoundingClientRect();
    const { scale: s } = drift();
    const scale = svg.width / s / LOGO_SIZE.width;
    setLayout({
      origin: {
        x: (svg.left - box.left) / s + HEX_CENTER.x * scale,
        y: (svg.top - box.top) / s + HEX_CENTER.y * scale,
      },
      unit: scale * CLOSED_SCALE,
    });
  };

  let current: IntroState = 'static';
  let run = 0; // Incremented by reset/set so a superseded run stops stepping.

  const reset = () => {
    run++;
    current = 'static';
    mesh?.reset();
    logo?.reset();
  };

  // Each state is owned by one part (both for `open`); the other keeps whatever state it is in.
  const enter = (state: IntroState) => {
    switch (state) {
      case 'static':
      case 'drift':
      case 'faded':
        return mesh?.set(state);
      case 'open':
        return Promise.all([mesh?.set(state), logo?.set(state)]);
      default:
        return logo?.set(state);
    }
  };

  const set = async (target: IntroState) => {
    const from = INTRO_STATES.indexOf(current);
    const to = INTRO_STATES.indexOf(target);
    if (to <= from) {
      reset();
    }
    const id = ++run;
    for (const state of INTRO_STATES.slice(to <= from ? 1 : from + 1, to + 1)) {
      current = state;
      await enter(state);
      if (id !== run) {
        return;
      }
    }
  };

  const step = () => set(INTRO_STATES[(INTRO_STATES.indexOf(current) + 1) % INTRO_STATES.length]!);

  const play = async () => {
    reset();
    for (const state of INTRO_STATES) {
      const id = run;
      if (state !== 'static') {
        await set(state);
        if (run !== id + 1) {
          return; // Superseded.
        }
      }
      const hold = (HOLD as Partial<Record<IntroState, number>>)[state];
      if (hold) {
        await sleep(hold);
      }
    }
  };

  onMount(() => {
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    onCleanup(() => observer.disconnect());
    props.controller?.({ state: () => current, set, step, play, reset });
    if (props.autoplay ?? true) {
      void play();
    }
  });

  return (
    <div ref={container} class={props.class ?? 'relative h-full w-full overflow-hidden'}>
      <Show when={layout()}>
        {(l) => (
          <Mesh
            class='absolute inset-0 h-full w-full'
            origin={l().origin}
            unit={l().unit}
            controller={(controller) => (mesh = controller)}
            onDrift={setDrift}
          />
        )}
      </Show>
      <div
        ref={logoBox}
        class='relative flex h-full w-full origin-center items-center justify-center'
        style={{ transform: `translate(${drift().shift.x}px, ${drift().shift.y}px) scale(${drift().scale})` }}
      >
        <Logo class='h-48 w-auto' animate='manual' controller={(controller) => (logo = controller)} />
      </div>
    </div>
  );
};
