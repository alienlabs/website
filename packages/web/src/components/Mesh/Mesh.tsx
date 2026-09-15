import { type Selection, easeCubicInOut, easeSinInOut, select, timer } from 'd3';
import type { JSX } from 'solid-js';
import { createEffect, createUniqueId, onCleanup, onMount, splitProps } from 'solid-js';

import {
  GRAY,
  HEX_DX,
  HEX_GAP,
  HEX_PITCH,
  OPEN_GAP,
  OPEN_MS,
  type Point,
  R,
  type Shape,
  SIDE,
  centroid,
  isHexagonTile,
  opacityOf,
  tile,
  trianglePath,
} from '../Logo/geometry';

/**
 * States: `static` (fades in from nothing to STATIC_OPACITY, at rest) → `drift` (slowly drifts and
 * breathes) → `faded` (dimmed to FADED_OPACITY; keeps drifting if it was) → `open` (gaps widen to
 * the open logo's, in step with it).
 */
const MESH_STATES = ['static', 'drift', 'faded', 'open'] as const;
export type MeshState = (typeof MESH_STATES)[number];

/** Current drift: shift (px), scale and rotation (degrees), all about the centre of the Mesh's box. */
export type Drift = { shift: Point; scale: number; rotate: number };
export const NO_DRIFT: Drift = { shift: { x: 0, y: 0 }, scale: 1, rotate: 0 };

export type MeshController = {
  /** Current (or target, while transitioning) state. */
  state: () => MeshState;
  /** Animate to `state`; resolves when the transition completes (or is superseded). */
  set: (state: MeshState) => Promise<void>;
  /** Interrupt and return to `static`. */
  reset: () => void;
  /** Start or stop the flickering (it runs while `static` and stops when the mesh starts moving). */
  flicker: (on: boolean) => void;
};

export type MeshProps = Omit<JSX.SvgSVGAttributes<SVGSVGElement>, 'children'> & {
  /** Position of the tiling origin (a hexagon centre) in px, relative to the component's box. */
  origin: Point;
  /** Scale: px per logo viewBox unit. */
  unit: number;
  /** Leave the six tiles that form the Logo's closed hexagon empty (default: false). */
  hole?: boolean;
  /** Each tile gets a random intensity snapped to one of this many levels (default: 6). */
  levels?: number;
  /** While at rest, a few random tiles flicker like failing fluorescent tubes (default: true). */
  flicker?: boolean;
  /** Also rotate while drifting (default: true); the rotation settles back once the drift phase ends. */
  rotate?: boolean;
  /** Receives the state controls once mounted. */
  controller?: (controller: MeshController) => void;
  /** Called whenever the drift changes, so content aligned to the mesh can follow it. */
  onDrift?: (drift: Drift) => void;
};

const STATIC_OPACITY = 0.2;
const FADED_OPACITY = 0.1;
const FADE_IN_MS = 2000;
const DEFAULT_LEVELS = 6;

// Flicker: up to FLICKER_COUNT "lamps" at a time. A lamp is a random tile that glows in a random
// run of dark / dim / bright pulses (eased between steps) for FLICKER_MS, rests for FLICKER_REST_MS,
// does so once more, and is then replaced by a new random tile. Runs while the mesh is at rest.
const FLICKER_COUNT = 3;
const FLICKER_MS = 2000;
const FLICKER_REST_MS: [number, number] = [2000, 4000];
const FLICKER_CYCLES = 2;
const FLICKER_STEP_MS: [number, number] = [150, 500];
const FLICKER_INTENSITY = 0.5; // Peak opacity of the glowing copy.
const FLICKER_LEVELS: [level: number, weight: number][] = [
  [0, 0.4],
  [0.6, 0.35],
  [1, 0.25],
];
const FLICKER_COLOR = '#8ed0ff'; // Bright cool blue: reads as a glow on both themes.
const FLICKER_GLOW = 40; // Blur radius (viewBox units).

type FlickerStep = { until: number; level: number };

const flickerPattern = (): FlickerStep[] => {
  const steps: FlickerStep[] = [];
  let t = 0;
  while (t < FLICKER_MS) {
    t += FLICKER_STEP_MS[0] + Math.random() * (FLICKER_STEP_MS[1] - FLICKER_STEP_MS[0]);
    let pick = Math.random();
    const [level] = FLICKER_LEVELS.find(([, weight]) => (pick -= weight) <= 0) ?? FLICKER_LEVELS[0]!;
    steps.push({ until: t, level });
  }
  return steps;
};
// Gaps widen by shrinking each tile about its centroid; the closed gap is already built into the tiles.
const OPEN_SCALE = (SIDE - (OPEN_GAP - HEX_GAP)) / SIDE;
const FADE_MS = 2000;
const SETTLE_MS = 800; // Returning to `static`.

// Drift: a slow ping-pong between rest and a slightly larger, shifted, turned tiling.
const DRIFT_MS = 12000;
const DRIFT_SCALE = 1.15;
const DRIFT_SHIFT: Point = { x: -40, y: -25 }; // px
const DRIFT_ROTATE = 8; // degrees
const ROTATE_SETTLE_MS = 6000; // Rotation eases back to zero once the drift phase ends.

/** Stable pseudo-random intensity for tile (s, k), snapped to `levels` steps in (0, 1]. */
const intensity = (s: number, k: number, levels: number) => {
  // Integer hash of the tile coordinates (deterministic, so resizing does not reshuffle).
  let h = (s * 73856093) ^ (k * 19349663);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  h ^= h >>> 15;
  const level = 1 + ((h >>> 0) % levels);
  return level / levels;
};

/**
 * Fills its box with the triangular mesh the Logo's closed hexagon belongs to (same tiles, gaps and
 * opacities) in monochrome, each tile at a random stepped intensity, aligned so that the hexagon
 * sits at `origin`. Re-tiles on resize.
 */
export const Mesh = (props: MeshProps) => {
  const [local, rest] = splitProps(props, [
    'class',
    'origin',
    'unit',
    'hole',
    'levels',
    'rotate',
    'flicker',
    'controller',
    'onDrift',
  ]);
  let ref!: SVGSVGElement;

  onMount(() => {
    const svg = select(ref);
    const drifter = svg.append('g');
    const plane = drifter
      .append('g')
      .attr('fill', GRAY)
      .attr('stroke', GRAY)
      .attr('stroke-width', R * 2)
      .attr('stroke-linejoin', 'round');
    // Flickering tiles are drawn as bright, glowing copies above the (dimmed) plane.
    const glowId = `${createUniqueId()}-glow`;
    const glowFilter = svg
      .append('defs')
      .append('filter')
      .attr('id', glowId)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', FLICKER_GLOW)
      .attr('result', 'blur');
    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
    const glow = drifter
      .append('g')
      .attr('fill', FLICKER_COLOR)
      .attr('stroke', FLICKER_COLOR)
      .attr('stroke-width', R * 2)
      .attr('stroke-linejoin', 'round')
      .attr('filter', `url(#${glowId})`)
      .attr('pointer-events', 'none');

    let size = { width: 0, height: 0 };
    const layout = () => {
      size = ref.getBoundingClientRect();
      const { origin, unit } = local;
      // Strips and columns needed to cover the box on either side of the origin (plus one for the overhang).
      const above = Math.ceil(origin.y / unit / HEX_PITCH) + 1;
      const below = Math.ceil((size.height - origin.y) / unit / HEX_PITCH) + 1;
      const left = Math.ceil(origin.x / unit / HEX_DX) + 1;
      const right = Math.ceil((size.width - origin.x) / unit / HEX_DX) + 1;
      const levels = local.levels ?? DEFAULT_LEVELS;
      const tiles = [];
      for (let s = -above; s < below; s++) {
        for (let k = -left; k <= right; k++) {
          if (!local.hole || !isHexagonTile(s, k)) {
            tiles.push({ ...tile({ x: 0, y: 0 }, s, k), intensity: intensity(s, k, levels) });
          }
        }
      }
      plane
        .attr('transform', `translate(${origin.x} ${origin.y}) scale(${unit})`)
        .selectAll('path')
        .data(tiles)
        .join('path')
        .attr('d', trianglePath)
        .attr('opacity', (d) => opacityOf(d) * d.intensity);
      glow.attr('transform', `translate(${origin.x} ${origin.y}) scale(${unit})`);
    };

    createEffect(layout); // Tracks `origin` and `unit`.
    const observer = new ResizeObserver(layout);
    observer.observe(ref);

    // Drift transform at phase p (0 = rest, 1 = fully drifted) and the current rotation, about the
    // box centre; reports it. The rotation follows the phase while in the `drift` state and then
    // settles back to zero on its own while the shift/scale ping-pong carries on.
    let phase = 0;
    let rotation = 0;
    let rotating = false;
    let settling: ReturnType<typeof timer> | undefined;
    const driftTransform = (p: number) => {
      phase = p;
      if (rotating && (local.rotate ?? true)) {
        rotation = DRIFT_ROTATE * p;
      }
      const cx = size.width / 2;
      const cy = size.height / 2;
      const scale = 1 + (DRIFT_SCALE - 1) * p;
      local.onDrift?.({ shift: { x: DRIFT_SHIFT.x * p, y: DRIFT_SHIFT.y * p }, scale, rotate: rotation });
      return `translate(${cx + DRIFT_SHIFT.x * p} ${cy + DRIFT_SHIFT.y * p}) rotate(${rotation}) scale(${scale}) translate(${-cx} ${-cy})`;
    };
    // Ping-pong forever between rest and drifted (named so it coexists with the opacity transition).
    const drift = (from: number, to: number) => {
      drifter
        .transition('drift')
        .duration(DRIFT_MS)
        .ease(easeSinInOut)
        .attrTween('transform', () => (t) => driftTransform(from + (to - from) * t))
        .on('end', () => drift(to, from));
    };
    const settleRotation = () => {
      rotating = false;
      settling?.stop();
      const from = rotation;
      settling = timer((elapsed) => {
        const t = Math.min(1, elapsed / ROTATE_SETTLE_MS);
        rotation = from * (1 - easeSinInOut(t));
        drifter.attr('transform', driftTransform(phase)); // The drift tween also picks this up.
        if (t === 1) {
          settling?.stop();
        }
      });
    };

    let current: MeshState = 'static';

    const tiles = () => plane.selectAll<SVGPathElement, Shape>('path');

    // Flicker: each lamp is a bright copy of a random tile following a schedule of flicker / rest
    // phases; when its schedule ends it is replaced by a new lamp on another tile.
    type Phase = { until: number; steps?: FlickerStep[] }; // No steps: resting (dark).
    type Lamp = { el: Selection<SVGPathElement, unknown, null, undefined>; start: number; phases: Phase[] };
    const lamps: Lamp[] = [];
    let flickerTimer: ReturnType<typeof timer> | undefined;
    const between = ([min, max]: [number, number]) => min + Math.random() * (max - min);
    const schedule = (delay: number): Phase[] => {
      const phases: Phase[] = [{ until: delay }];
      let t = delay;
      for (let cycle = 0; cycle < FLICKER_CYCLES; cycle++) {
        phases.push({ until: (t += FLICKER_MS), steps: flickerPattern() });
        phases.push({ until: (t += between(FLICKER_REST_MS)) });
      }
      return phases;
    };
    const light = (now: number, delay = 0): Lamp | undefined => {
      const nodes = tiles()
        .nodes()
        .filter((node) => !lamps.some(({ el }) => el.attr('d') === node.getAttribute('d')));
      const node = nodes[Math.floor(Math.random() * nodes.length)];
      if (!node) {
        return undefined;
      }
      const el = glow
        .append('path')
        .attr('d', node.getAttribute('d'))
        .attr('transform', node.getAttribute('transform'))
        .attr('opacity', 0);
      return { el, start: now, phases: schedule(delay) };
    };
    const stopFlicker = () => {
      flickerTimer?.stop();
      flickerTimer = undefined;
      lamps.length = 0;
      glow.selectAll('*').remove();
    };
    const startFlicker = () => {
      if (flickerTimer) {
        return;
      }
      flickerTimer = timer((now) => {
        // Keep FLICKER_COUNT lamps lit, staggering new ones so they do not pulse in unison.
        while (lamps.length < FLICKER_COUNT) {
          const lamp = light(now, lamps.length ? between(FLICKER_REST_MS) : 0);
          if (!lamp) {
            break;
          }
          lamps.push(lamp);
        }
        for (const lamp of [...lamps]) {
          const t = now - lamp.start;
          const i = lamp.phases.findIndex(({ until }) => t < until);
          if (i < 0) {
            lamp.el.remove();
            lamps.splice(lamps.indexOf(lamp), 1);
            continue;
          }
          const phase = lamp.phases[i]!;
          const phaseStart = i > 0 ? lamp.phases[i - 1]!.until : 0;
          if (!phase.steps) {
            lamp.el.attr('opacity', 0);
            continue;
          }
          const local = t - phaseStart;
          const j = phase.steps.findIndex(({ until }) => local < until);
          const step = phase.steps[j] ?? phase.steps[phase.steps.length - 1]!;
          const from = j > 0 ? phase.steps[j - 1]! : { until: 0, level: 0 };
          // Pulse: ease from the previous step's level to this one's over the step.
          const progress = Math.min(1, (local - from.until) / (step.until - from.until));
          lamp.el.attr(
            'opacity',
            FLICKER_INTENSITY * (from.level + (step.level - from.level) * easeSinInOut(progress)),
          );
        }
      });
    };
    const flicker = (on: boolean) => (on ? startFlicker() : stopFlicker());
    const shrink = (shape: Shape, scale: number) => {
      const { x, y } = centroid(shape);
      return `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`;
    };

    const reset = () => {
      current = 'static';
      svg.selectAll('*').interrupt();
      settling?.stop();
      stopFlicker();
      rotating = false;
      rotation = 0;
      drifter.interrupt('drift').attr('transform', driftTransform(0));
      plane.attr('opacity', 0);
      tiles().attr('transform', null);
    };

    const set = async (state: MeshState) => {
      current = state;
      try {
        switch (state) {
          case 'static':
            drifter.interrupt('drift');
            settling?.stop();
            if (local.flicker ?? true) {
              startFlicker();
            }
            rotating = true; // So the settle tween below also unwinds the rotation with the phase.
            await Promise.all([
              plane.transition().duration(FADE_IN_MS).attr('opacity', STATIC_OPACITY).end(),
              drifter
                .transition('drift')
                .duration(SETTLE_MS)
                .attrTween('transform', () => {
                  const from = phase;
                  return (t) => driftTransform(from * (1 - t));
                })
                .end(),
              tiles()
                .transition()
                .duration(SETTLE_MS)
                .attr('transform', (d) => shrink(d, 1))
                .end(),
            ]);
            break;
          case 'drift':
            stopFlicker(); // The animation has started.
            rotating = true;
            drift(0, 1);
            await plane.transition().duration(SETTLE_MS).attr('opacity', STATIC_OPACITY).end();
            break;
          case 'faded':
            settleRotation();
            await plane.transition().duration(FADE_MS).attr('opacity', FADED_OPACITY).end();
            break;
          case 'open':
            await tiles()
              .transition()
              .duration(OPEN_MS)
              .ease(easeCubicInOut)
              .attr('transform', (d) => shrink(d, OPEN_SCALE))
              .end();
            break;
        }
      } catch {
        // Interrupted.
      }
    };

    reset();
    void set('static');

    local.controller?.({ state: () => current, set, reset, flicker });
    onCleanup(() => {
      observer.disconnect();
      settling?.stop();
      stopFlicker();
      svg.selectAll('*').interrupt();
    });
  });

  return <svg ref={ref} aria-hidden='true' class={local.class ?? 'h-full w-full'} {...rest} />;
};
