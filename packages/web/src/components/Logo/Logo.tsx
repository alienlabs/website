import {
  type BaseType,
  type Selection,
  easeCubicInOut,
  easeLinear,
  interpolateNumber,
  interpolateRgb,
  rgb,
  select,
} from 'd3';
import type { JSX } from 'solid-js';
import { createUniqueId, onCleanup, onMount, splitProps } from 'solid-js';

import rustUrl from '../../../assets/images/rust.jpg?url';
import {
  BLUE,
  DEEP_BLUE,
  GRAY,
  INSET_HEIGHT,
  OPEN_GAP,
  OPEN_MS,
  type Point,
  R,
  type Shape,
  SIDE,
  centroid,
  tile,
  trianglePath,
} from './geometry';

/**
 * Intro states, in order: `hidden` (closed hexagon, monochrome, invisible) → `visible` (fades in and
 * turns blue) → `spun` (spins while growing to full size) → `open` (segments unfold into the row and
 * the A appears).
 */
const LOGO_STATES = ['hidden', 'visible', 'spun', 'open'] as const;
export type LogoState = (typeof LOGO_STATES)[number];

export type LogoController = {
  /** Current (or target, while transitioning) state. */
  state: () => LogoState;
  /**
   * Animate to `state`, stepping through any intermediate states in order; going backwards resets
   * first. Resolves when the target state is reached (or the run is superseded).
   */
  set: (state: LogoState) => Promise<void>;
  /** Run the whole intro from `hidden`; resolves when open. */
  play: () => Promise<void>;
  /** Interrupt any running transition and return to `hidden`. */
  reset: () => void;
};

export type LogoProps = JSX.SvgSVGAttributes<SVGSVGElement> & {
  /**
   * `true` (default): play the hexagon spin + unfold intro on mount (skipped under prefers-reduced-motion).
   * `false`: render the final logo. `'manual'`: start hidden and wait for the controller.
   */
  animate?: boolean | 'manual';
  /** Receives the state controls once mounted. */
  controller?: (controller: LogoController) => void;
  /** Rotate (with motion blur) while growing in the `spun` state (default: false: it only grows). */
  spin?: boolean;
};

/** The logo's viewBox. */
export const LOGO_SIZE = { width: 2000, height: 960 } as const;

// Final layout: a row of five, alternating up/down.
const STEP = SIDE / 2 + OPEN_GAP / 2; // Distance between adjacent triangle centers.
const CENTER_X = 1005;
const UP_BASE = 780; // Inset base of the up-pointing triangles.
const DOWN_TOP = 225; // Inset top of the down-pointing triangles.

/**
 * Closed layout: a tight hexagon centred on the final centroid of the bottom triangle, so opening
 * lifts the whole shape until that triangle sits where the hexagon was. While closed the hexagon is
 * drawn at CLOSED_SCALE about this point.
 */
export const HEX_CENTER: Point = { x: CENTER_X, y: UP_BASE - INSET_HEIGHT / 3 };
export const CLOSED_SCALE = 0.5;
const EXIT_Y = 3000; // Where the top-centre segment drops to when opening (well off screen).

/**
 * All segments are translucent so the A shows through them (only the A is solid), alternating
 * between two levels: up-pointing segments lighter, down-pointing ones denser.
 */
const SEGMENT_OPACITY = { up: 0.4, down: 0.7 } as const;
const segmentOpacity = ({ up }: Shape) => (up ? SEGMENT_OPACITY.up : SEGMENT_OPACITY.down);

// Texture: the segments are filled with a tiling of the rust image, tinted by a colour matrix
// (luminance × tint colour × TEXTURE_GAIN) so the tint can fade from monochrome to blue.
const TEXTURE_SIZE = { width: 1440, height: 1080 };
const TEXTURE_GAIN = 1.6;
const tintMatrix = (color: string) => {
  const { r, g, b } = rgb(color);
  const channels = [r, g, b].map((v) => (v / 255) * TEXTURE_GAIN);
  const lum = [0.2126, 0.7152, 0.0722];
  return [...channels.map((c) => [...lum.map((l) => l * c), 0, 0].join(' ')), '0 0 0 1 0'].join(' ');
};

const A_PATH = 'M855 75 H1155 L1660 900 H1390 L1005 271 L620 900 H350 Z';

// Durations (ms): fade in (monochrome → blue); spin SPIN_TURNS times while growing from CLOSED_SCALE;
// rest closed (autoplay only); open (segments spread, wings unfold); the A fades in.
const PHASES = { fadeIn: 2000, spin: 2400, grow: 600, closed: 400, open: OPEN_MS, letter: 500 } as const;
const SPIN_TURNS = 4;

// Angular motion blur while spinning: ghost copies trail the hexagon by GHOST_LAG degrees each, with
// lag and opacity scaled by angular speed, and a Gaussian blur peaks with speed. All vanish as the
// spin decelerates.
const GHOST_OPACITY = [0.35, 0.2, 0.1];
const GHOST_LAG = 6;
const BLUR_MAX = 6;

type Triangle = Shape & {
  /** Displacement of the closed position from the final one. */
  offset: Point;
  /** Wings additionally start rotated by `sweep` degrees about `pivot` (before `offset` is applied). */
  fold?: { sweep: number; pivot: Point };
  /** The top-centre segment has no place in the row: it drops to `exit` and fades out when opening. */
  exit?: Point;
};

/** Transform placing a segment at fraction `t` of the way from closed (0) to final (1). */
const transformAt = ({ offset, fold, exit }: Triangle, t: number) => {
  // Exits fall away, accelerating (t² on top of the transition's easing).
  const fly = exit ? t * t : 0;
  const parts = [
    `translate(${offset.x * (1 - t) + (exit?.x ?? 0) * fly} ${offset.y * (1 - t) + (exit?.y ?? 0) * fly})`,
  ];
  if (fold) {
    parts.push(`rotate(${-fold.sweep * (1 - t)} ${fold.pivot.x} ${fold.pivot.y})`);
  }
  return parts.join(' ');
};

/** Pivot of the rotation by `angle` degrees that maps `from` onto `to`: solve (I - R) p = to - R from. */
const pivotFor = (from: Point, to: Point, angle: number): Point => {
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const bx = to.x - (c * from.x - s * from.y);
  const by = to.y - (s * from.x + c * from.y);
  const det = (1 - c) ** 2 + s ** 2;
  return { x: ((1 - c) * bx - s * by) / det, y: (s * bx + (1 - c) * by) / det };
};

const offsetBetween = (closed: Shape, final: Shape): Point => ({ x: closed.cx - final.cx, y: closed.y - final.y });

/** Down-triangle: left (side = -1) or right (side = 1) of the hexagon centre. */
const down = (side: -1 | 1): Triangle => {
  const final: Shape = { cx: CENTER_X + side * STEP, up: false, y: DOWN_TOP };
  return { ...final, offset: offsetBetween(tile(HEX_CENTER, 0, side), final) };
};

/** Bottom segment: apex at the hexagon centre when closed. */
const bottom = (): Triangle => {
  const final: Shape = { cx: CENTER_X, up: true, y: UP_BASE };
  return { ...final, offset: offsetBetween(tile(HEX_CENTER, 0, 0), final) };
};

/**
 * Wing: rests on top of the adjacent down-triangle when closed (so it shares that triangle's
 * offset). Its final position is the ±120° rotation about the hexagon's outer corner, but it swings
 * the long way round (∓240°), outwards and away from the neighbouring segment rather than through it.
 */
const wing = (side: -1 | 1): Triangle => {
  const neighbour = down(side);
  const closed = tile(HEX_CENTER, -1, side);
  const folded: Shape = { ...closed, cx: closed.cx - neighbour.offset.x, y: closed.y - neighbour.offset.y };
  const final: Shape = { cx: CENTER_X + side * 2 * STEP, up: true, y: UP_BASE };
  const angle = -side * 120;
  const pivot = pivotFor(centroid(folded), centroid(final), angle);
  return { ...final, offset: neighbour.offset, fold: { sweep: angle + side * 360, pivot } };
};

/** Sixth segment: closes the hexagon at the top centre; it only exists in the closed state. */
const top = (): Triangle => ({
  ...tile(HEX_CENTER, -1, 0),
  offset: { x: 0, y: 0 },
  exit: { x: 0, y: EXIT_Y },
});

// The top segment is drawn first so it drops behind the others.
const TRIANGLES: Triangle[] = [top(), wing(-1), down(-1), bottom(), down(1), wing(1)];

/**
 * Logo consists of five translucent rounded equilateral triangles as shown below.
 * Behind them sits the letter A (a crossbar-less Λ with a flat top), whose legs extend below the
 * triangles, in a solid deep blue; the triangles are translucent brand blue (alternating between two
 * levels) so the A shows through where they overlap.
 *
 *  /\ \  / /\ \  / /\
 * /  \ \/ /  \ \/ /  \
 *
 * Intro: the triangles start as the six segments of a closed, monochrome hexagon at half scale;
 * they turn blue, then (1) grow to full size (spinning about the centre if `spin`), (2) rest closed,
 * then (3) open: the top-centre segment drops away,
 * the rest spread apart and lift while the wings unfold about the hexagon's outer corners into the
 * row, and the A fades in. Layout and animation are driven by d3. See Mesh for the
 * matching full-screen tiling the closed hexagon can emerge from.
 */
export const Logo = (props: LogoProps) => {
  const [local, rest] = splitProps(props, ['class', 'animate', 'controller', 'spin']);
  let ref!: SVGSVGElement;

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = reduced ? false : (local.animate ?? true);

    const svg = select(ref);
    const id = createUniqueId();
    const blurId = `${id}-blur`;
    const textureId = `${id}-texture`;
    const tintId = `${id}-tint`;
    const defs = svg.append('defs');
    const blur = defs.append('filter').attr('id', blurId).append('feGaussianBlur').attr('stdDeviation', 0);
    defs
      .append('pattern')
      .attr('id', textureId)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', TEXTURE_SIZE.width)
      .attr('height', TEXTURE_SIZE.height)
      .append('image')
      .attr('href', rustUrl)
      .attr('width', TEXTURE_SIZE.width)
      .attr('height', TEXTURE_SIZE.height)
      .attr('preserveAspectRatio', 'xMidYMid slice');
    const tint = defs
      .append('filter')
      .attr('id', tintId)
      .attr('color-interpolation-filters', 'sRGB')
      .append('feColorMatrix')
      .attr('type', 'matrix')
      .attr('values', tintMatrix(GRAY));
    const letter = svg.append('path').attr('d', A_PATH).attr('fill', DEEP_BLUE);

    // Ghost copies lag the hexagon while it spins (angular motion blur); the real one is on top.
    const spinner = svg.append('g');
    const segments = <E extends BaseType>(g: Selection<E, unknown, null, undefined>) =>
      g
        .attr('fill', BLUE)
        .attr('stroke', BLUE)
        .attr('stroke-width', R * 2)
        .attr('stroke-linejoin', 'round')
        .selectAll('path')
        .data(TRIANGLES)
        .join('path')
        .attr('d', trianglePath)
        .attr('opacity', segmentOpacity);
    const ghosts = spinner
      .selectAll('g.ghost')
      .data(GHOST_OPACITY)
      .join('g')
      .attr('class', 'ghost')
      .attr('opacity', 0)
      .each(function () {
        segments(select(this)).attr('transform', (d) => transformAt(d, 0));
      });
    // The real hexagon is textured and tinted; the ghosts stay flat blue.
    const hex = spinner.append('g').attr('filter', `url(#${tintId})`);
    const triangles = segments(hex).attr('fill', `url(#${textureId})`).attr('stroke', `url(#${textureId})`);
    // The closed hexagon extends below the final bounding box.
    ref.style.overflow = 'visible';

    // Rotate and scale about the hexagon centre (translate to origin, transform, translate back).
    const spinTransform = (angle: number, scale: number) =>
      `translate(${HEX_CENTER.x} ${HEX_CENTER.y}) rotate(${angle}) scale(${scale}) translate(${-HEX_CENTER.x} ${-HEX_CENTER.y})`;
    // Spin angle and normalised angular speed (0..1) at raw time t; easing is applied here so the
    // speed is known to the ghosts and the blur.
    const spinAngle = (t: number) => (local.spin ? -360 * SPIN_TURNS * (1 - easeCubicInOut(t)) : 0);
    const spinSpeed = (t: number) => (t < 0.5 ? 12 * t * t : 12 * (1 - t) ** 2) / 3;
    const spinScale = (t: number) => CLOSED_SCALE + (1 - CLOSED_SCALE) * easeCubicInOut(t);

    // Transition into each state from the previous one. Each resolves when done (or rejects if
    // interrupted, which `set` swallows).
    const steps: Record<Exclude<LogoState, 'hidden'>, () => Promise<unknown>> = {
      visible: () => {
        const color = interpolateRgb(GRAY, BLUE);
        tint
          .transition()
          .duration(PHASES.fadeIn)
          .attrTween('values', () => (t) => tintMatrix(color(t)));
        return hex.transition().duration(PHASES.fadeIn).attr('opacity', 1).end();
      },
      spun: () => {
        if (!local.spin) {
          return hex
            .transition()
            .duration(PHASES.grow)
            .ease(easeLinear)
            .attrTween('transform', () => (t) => spinTransform(0, spinScale(t)))
            .on('end', () => hex.attr('transform', null))
            .end();
        }
        spinner.attr('filter', `url(#${blurId})`);
        blur
          .transition()
          .duration(PHASES.spin)
          .ease(easeLinear)
          .attrTween('stdDeviation', () => (t) => String(BLUR_MAX * spinSpeed(t)));
        ghosts
          .transition()
          .duration(PHASES.spin)
          .ease(easeLinear)
          .attrTween(
            'transform',
            (_, i) => (t) => spinTransform(spinAngle(t) - (i + 1) * GHOST_LAG * spinSpeed(t), spinScale(t)),
          )
          // Ghosts fade with speed so they never stack on the resting hexagon (which would shift its intensity).
          .attrTween('opacity', (d) => (t) => String(d * spinSpeed(t)))
          .on('end', function () {
            select(this).attr('display', 'none');
          });
        return hex
          .transition()
          .duration(PHASES.spin)
          .ease(easeLinear)
          .attrTween('transform', () => (t) => spinTransform(spinAngle(t), spinScale(t)))
          .on('end', () => {
            hex.attr('transform', null);
            spinner.attr('filter', null);
          })
          .end();
      },
      open: () => {
        triangles
          .transition()
          .duration(PHASES.open)
          .ease(easeCubicInOut)
          .attrTween('transform', (d) => (t) => transformAt(d, t))
          .attrTween('opacity', (d) => {
            const fade = interpolateNumber(segmentOpacity(d), 0);
            return (t) => String(d.exit ? fade(t) : segmentOpacity(d));
          })
          .on('end', function (d) {
            select(this).attr(d.exit ? 'visibility' : 'transform', d.exit ? 'hidden' : null);
          });
        return letter.transition().delay(PHASES.open).duration(PHASES.letter).attr('opacity', 1).end();
      },
    };

    let current: LogoState = 'hidden';
    let run = 0; // Incremented by reset/set so a superseded run stops stepping.

    const reset = () => {
      run++;
      current = 'hidden';
      svg.selectAll('*').interrupt();
      letter.attr('opacity', 0);
      spinner.attr('filter', null);
      blur.attr('stdDeviation', 0);
      ghosts
        .attr('display', null)
        .attr('opacity', 0)
        .attr('transform', spinTransform(spinAngle(0), spinScale(0)));
      tint.interrupt().attr('values', tintMatrix(GRAY));
      hex.attr('opacity', 0).attr('transform', spinTransform(spinAngle(0), spinScale(0)));
      triangles
        .attr('transform', (d) => transformAt(d, 0))
        .attr('opacity', segmentOpacity)
        .attr('visibility', null);
    };

    const set = async (target: LogoState) => {
      const from = LOGO_STATES.indexOf(current);
      const to = LOGO_STATES.indexOf(target);
      if (to <= from) {
        reset();
      }
      const id = ++run;
      for (const state of LOGO_STATES.slice(Math.max(from, 0) + 1, to + 1)) {
        if (state === 'hidden') {
          continue;
        }
        current = state;
        try {
          await steps[state]();
        } catch {
          return; // Interrupted.
        }
        if (id !== run) {
          return; // Superseded.
        }
      }
    };

    const play = async () => {
      reset();
      const id = run;
      await set('spun');
      if (id + 1 !== run) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, PHASES.closed));
      await set('open');
    };

    if (animate === false) {
      current = 'open';
      tint.attr('values', tintMatrix(BLUE));
      letter.attr('opacity', 1);
      ghosts.attr('display', 'none');
      triangles.filter((d) => d.exit !== undefined).attr('visibility', 'hidden');
    } else {
      reset();
      if (animate === true) {
        void play();
      }
    }

    local.controller?.({ state: () => current, set, play, reset });
    onCleanup(() => svg.selectAll('*').interrupt());
  });

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${LOGO_SIZE.width} ${LOGO_SIZE.height}`}
      role='img'
      aria-label='Alien Labs'
      class={local.class ?? 'h-24 w-auto'}
      {...rest}
    />
  );
};
