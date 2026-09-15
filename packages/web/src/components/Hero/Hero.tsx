import {
  type Accessor,
  type JSX,
  type ParentProps,
  Show,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  splitProps,
  useContext,
} from 'solid-js';

import { CLOSED_SCALE, HEX_CENTER, Logo, LOGO_SIZE, type LogoController } from '../Logo';
import { type Point } from '../Logo/geometry';
import { LogoType, type LogoTypeController } from '../LogoType';
import { type Drift, Mesh, type MeshController, NO_DRIFT } from '../Mesh';
import { createAmbience } from './sound';

/**
 * Hero states, in order: the Mesh fades in and rests; drifts; dims; the Logo fades in; spins;
 * opens (the mesh widens its gaps with it); the LogoType appears beneath.
 * @public
 */
export const HERO_STATES = ['static', 'drift', 'faded', 'visible', 'spun', 'open', 'named'] as const;
/** @public */
export type HeroState = (typeof HERO_STATES)[number];

/** @public */
export type HeroController = {
  /** Current (or target, while transitioning) state. */
  state: () => HeroState;
  /** Animate to `state`, stepping through intermediate states in order; going backwards resets first. */
  set: (state: HeroState) => Promise<void>;
  /** Advance to the next state (wrapping round to the start). */
  step: () => Promise<void>;
  /** Run the whole intro from the start; resolves when done. */
  play: () => Promise<void>;
  /** Interrupt and return to the start state. */
  reset: () => void;
};

// Autoplay holds (ms) before leaving a state that has no transition of its own.
const HOLD = { static: 600, drift: 2000, spun: 400 } as const;

type Layout = { origin: Point; unit: number };

type Parts = {
  mesh?: MeshController;
  logo?: LogoController;
  /** The Logo's <svg>, for aligning the mesh. */
  logoElement?: SVGSVGElement;
  logoType?: LogoTypeController;
};

type HeroContext = {
  parts: Parts;
  layout: Accessor<Layout | undefined>;
  drift: Accessor<Drift>;
  setDrift: (drift: Drift) => void;
  /** Re-measure the logo (call once its element is registered). */
  measure: () => void;
};

const Context = createContext<HeroContext>();

const useHero = (part: string) => {
  const context = useContext(Context);
  if (!context) {
    throw new Error(`Hero.${part} must be inside Hero.Root`);
  }
  return context;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** @public */
export type HeroRootProps = ParentProps<{
  class?: string;
  /** Play on mount (default: true). */
  autoplay?: boolean;
  /** Play the ambience while the mesh drifts (default: true; browsers may refuse until a gesture). */
  sound?: boolean;
  /** Receives the state controls once mounted. */
  controller?: (controller: HeroController) => void;
}>;

/**
 * Full-screen hero (logo intro). Composite: `Root` owns the state machine and alignment; `Mesh` is the
 * monochrome tiling layer; `Content` is the layer that follows the mesh's drift; `Logo` and
 * `LogoType` go inside it.
 *
 *   <Hero.Root>
 *     <Hero.Mesh />
 *     <Hero.Content>
 *       <Hero.Logo />
 *       <Hero.LogoType />
 *     </Hero.Content>
 *   </Hero.Root>
 */
const Root = (props: HeroRootProps) => {
  let container!: HTMLDivElement;
  const parts: Parts = {};
  const [layout, setLayout] = createSignal<Layout>();
  const [drift, setDrift] = createSignal<Drift>(NO_DRIFT);

  // Where the Logo's closed hexagon centre sits (px, relative to the undrifted container) and its
  // px-per-unit. Measured rects are drifted: q = c + s (p - c) + shift about the container centre c.
  const measure = () => {
    const svg = parts.logoElement;
    if (!svg) {
      return;
    }
    const box = container.getBoundingClientRect();
    const rect = svg.getBoundingClientRect();
    const { shift, scale: s } = drift();
    const c = { x: box.width / 2, y: box.height / 2 };
    const q = { x: rect.left - box.left, y: rect.top - box.top };
    const p = { x: c.x + (q.x - c.x - shift.x) / s, y: c.y + (q.y - c.y - shift.y) / s };
    const scale = rect.width / s / LOGO_SIZE.width;
    setLayout({
      origin: { x: p.x + HEX_CENTER.x * scale, y: p.y + HEX_CENTER.y * scale },
      unit: scale * CLOSED_SCALE,
    });
  };

  let current: HeroState = 'static';
  let run = 0; // Incremented by reset/set so a superseded run stops stepping.
  const ambience = createAmbience();
  onCleanup(() => ambience.stop());

  const reset = () => {
    run++;
    current = 'static';
    ambience.stop();
    parts.mesh?.reset();
    void parts.mesh?.set('static'); // Fades the mesh back in.
    parts.logo?.reset();
    parts.logoType?.reset();
  };

  // Each state is owned by one part (both mesh and logo for `open`); the others keep their state.
  const enter = (state: HeroState) => {
    switch (state) {
      case 'drift':
        if (props.sound ?? true) {
          ambience.play();
        }
        return parts.mesh?.set(state);
      case 'static':
      case 'faded':
        return parts.mesh?.set(state);
      case 'open':
        return Promise.all([parts.mesh?.set(state), parts.logo?.set(state)]);
      case 'named':
        return parts.logoType?.set('visible');
      default:
        return parts.logo?.set(state);
    }
  };

  const set = async (target: HeroState) => {
    const from = HERO_STATES.indexOf(current);
    const to = HERO_STATES.indexOf(target);
    if (to <= from) {
      reset();
    }
    const id = ++run;
    for (const state of HERO_STATES.slice(to <= from ? 1 : from + 1, to + 1)) {
      current = state;
      await enter(state);
      if (id !== run) {
        return;
      }
    }
  };

  const step = () => set(HERO_STATES[(HERO_STATES.indexOf(current) + 1) % HERO_STATES.length]!);

  const play = async () => {
    reset();
    for (const state of HERO_STATES) {
      const id = run;
      if (state !== 'static') {
        await set(state);
        if (run !== id + 1) {
          return; // Superseded.
        }
      }
      const hold = (HOLD as Partial<Record<HeroState, number>>)[state];
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
    <Context.Provider value={{ parts, layout, drift, setDrift, measure }}>
      <div ref={container} class={props.class ?? 'relative h-full w-full overflow-hidden'}>
        {props.children}
      </div>
    </Context.Provider>
  );
};

type HeroMeshProps = {
  class?: string;
  /** See Mesh `levels`. */
  levels?: number;
};

/** The tiling layer, aligned to the Logo's closed hexagon. */
const HeroMesh = (props: HeroMeshProps) => {
  const { parts, layout, setDrift } = useHero('Mesh');
  return (
    <Show when={layout()}>
      {(l) => (
        <Mesh
          class={props.class ?? 'absolute inset-0 h-full w-full'}
          origin={l().origin}
          unit={l().unit}
          levels={props.levels}
          controller={(controller) => (parts.mesh = controller)}
          onDrift={setDrift}
        />
      )}
    </Show>
  );
};

/** The layer that follows the mesh's drift; holds the Logo and LogoType, centred as a column. */
const Content = (props: ParentProps<{ class?: string }>) => {
  const { drift } = useHero('Content');
  return (
    <div
      class={props.class ?? 'absolute inset-0 flex origin-center flex-col items-center justify-center gap-8'}
      style={{ transform: `translate(${drift().shift.x}px, ${drift().shift.y}px) scale(${drift().scale})` }}
    >
      {props.children}
    </div>
  );
};

type HeroLogoProps = Omit<JSX.SvgSVGAttributes<SVGSVGElement>, 'children'>;

/** The six-segment logo, driven by the Root. */
const HeroLogo = (props: HeroLogoProps) => {
  const { parts, measure } = useHero('Logo');
  const [local, rest] = splitProps(props, ['class']);
  return (
    <Logo
      ref={(element: SVGSVGElement) => {
        parts.logoElement = element;
        queueMicrotask(measure); // After layout.
      }}
      class={local.class ?? 'h-48 w-auto'}
      animate='manual'
      controller={(controller) => (parts.logo = controller)}
      {...rest}
    />
  );
};

type HeroLogoTypeProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'>;

/** The wordmark, shown once the logo has opened. */
const HeroLogoType = (props: HeroLogoTypeProps) => {
  const { parts } = useHero('LogoType');
  return <LogoType animate='manual' controller={(controller) => (parts.logoType = controller)} {...props} />;
};

export const Hero = {
  Root,
  Mesh: HeroMesh,
  Content,
  Logo: HeroLogo,
  LogoType: HeroLogoType,
};
