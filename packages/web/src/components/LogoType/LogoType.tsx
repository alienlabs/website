import { easeCubicOut, select } from 'd3';
import type { JSX } from 'solid-js';
import { onCleanup, onMount, splitProps } from 'solid-js';

/** States: `hidden` → `visible` (fades in, rising slightly). */
const LOGO_TYPE_STATES = ['hidden', 'visible'] as const;
export type LogoTypeState = (typeof LOGO_TYPE_STATES)[number];

export type LogoTypeController = {
  /** Current (or target, while transitioning) state. */
  state: () => LogoTypeState;
  /** Animate to `state`; resolves when done (or when superseded). */
  set: (state: LogoTypeState) => Promise<void>;
  /** Interrupt and return to `hidden`. */
  reset: () => void;
};

export type LogoTypeProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> & {
  /**
   * `true` (default): fade in on mount (skipped under prefers-reduced-motion). `false`: render
   * visible. `'manual'`: start hidden and wait for the controller.
   */
  animate?: boolean | 'manual';
  /** Receives the state controls once mounted. */
  controller?: (controller: LogoTypeController) => void;
};

const FADE_MS = 1200;
const RISE_PX = 12;

/** The wordmark: "ALIEN LABS" in the display face. */
export const LogoType = (props: LogoTypeProps) => {
  const [local, rest] = splitProps(props, ['class', 'animate', 'controller']);
  let ref!: HTMLDivElement;

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = reduced ? false : (local.animate ?? true);
    const el = select(ref);
    let current: LogoTypeState = 'hidden';

    const reset = () => {
      current = 'hidden';
      el.interrupt().style('opacity', 0).style('transform', `translateY(${RISE_PX}px)`);
    };

    const set = async (state: LogoTypeState) => {
      current = state;
      if (state === 'hidden') {
        reset();
        return;
      }
      try {
        await el
          .transition()
          .duration(FADE_MS)
          .ease(easeCubicOut)
          .style('opacity', 1)
          .style('transform', 'translateY(0px)')
          .end();
      } catch {
        // Interrupted.
      }
    };

    if (animate === false) {
      current = 'visible';
    } else {
      reset();
      if (animate === true) {
        void set('visible');
      }
    }

    local.controller?.({ state: () => current, set, reset });
    onCleanup(() => el.interrupt());
  });

  return (
    <div ref={ref} class={`font-display text-4xl tracking-[0.3em] select-none ${local.class ?? ''}`} {...rest}>
      {/* Brand name, not translated. */}
      {/* i18next-instrument-ignore-next-line */}
      ALIEN LABS
    </div>
  );
};
