import { easeCubicOut, select } from 'd3';
import type { JSX } from 'solid-js';
import { onCleanup, onMount, splitProps } from 'solid-js';

import { mx } from '@alienlabs/ui-core/utils';

const LOGO_TYPE_TEXT = 'alien labs';

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

const FLASH_MS = 250; // Appears in a bright, glowing flash…
const SETTLE_MS = 1500; // …then settles to the normal text colour.
const RISE_PX = 12;
const FLASH_COLOR = '#ffffff';
const GLOW = '0 0 16px rgba(255, 255, 255, 1), 0 0 48px rgba(255, 255, 255, 0.8)';
const NO_GLOW = '0 0 0px rgba(255, 255, 255, 0), 0 0 0px rgba(255, 255, 255, 0)';

/** The wordmark: "ALIEN LABS" in the display face. */
export const LogoType = (props: LogoTypeProps) => {
  const [local, rest] = splitProps(props, ['class', 'animate', 'controller']);
  let ref!: HTMLDivElement;

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = reduced ? false : (local.animate ?? true);
    const el = select(ref);
    let current: LogoTypeState = 'hidden';
    let settle: number | undefined;

    const reset = () => {
      current = 'hidden';
      clearTimeout(settle);
      el.interrupt()
        .style('opacity', 0)
        .style('transform', `translateY(${RISE_PX}px)`)
        .style('transition', null)
        .style('color', null)
        .style('text-shadow', null);
    };

    const set = async (state: LogoTypeState) => {
      current = state;
      if (state === 'hidden') {
        reset();
        return;
      }
      try {
        // Colour and glow use CSS transitions: the theme colour is oklch(), which d3 cannot
        // interpolate; d3 drives opacity and position.
        el.style('transition', `color ${FLASH_MS}ms ease-out, text-shadow ${FLASH_MS}ms ease-out`)
          .style('color', FLASH_COLOR)
          .style('text-shadow', GLOW);
        await el
          .transition()
          .duration(FLASH_MS)
          .ease(easeCubicOut)
          .style('opacity', 1)
          .style('transform', 'translateY(0px)')
          .end();
        // Removing the inline colour transitions back to the theme colour.
        el.style('transition', `color ${SETTLE_MS}ms ease-out, text-shadow ${SETTLE_MS}ms ease-out`)
          .style('color', null)
          .style('text-shadow', NO_GLOW);
        settle = window.setTimeout(() => el.style('transition', null).style('text-shadow', null), SETTLE_MS);
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
    onCleanup(() => {
      clearTimeout(settle);
      el.interrupt();
    });
  });

  return (
    <div ref={ref} class={mx('font-display text-4xl tracking-[0.3em] select-none', local.class)} {...rest}>
      {/* Brand name, not translated. */}
      {/* i18next-instrument-ignore-next-line */}
      {LOGO_TYPE_TEXT}
    </div>
  );
};
