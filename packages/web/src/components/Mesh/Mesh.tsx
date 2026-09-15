import { easeCubicInOut, easeSinInOut, select } from 'd3';
import type { JSX } from 'solid-js';
import { createEffect, onCleanup, onMount, splitProps } from 'solid-js';

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

/** Current drift: shift (px) and scale, both about the centre of the Mesh's box. */
export type Drift = { shift: Point; scale: number };
export const NO_DRIFT: Drift = { shift: { x: 0, y: 0 }, scale: 1 };

export type MeshController = {
  /** Current (or target, while transitioning) state. */
  state: () => MeshState;
  /** Animate to `state`; resolves when the transition completes (or is superseded). */
  set: (state: MeshState) => Promise<void>;
  /** Interrupt and return to `static`. */
  reset: () => void;
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
  /** Receives the state controls once mounted. */
  controller?: (controller: MeshController) => void;
  /** Called whenever the drift changes, so content aligned to the mesh can follow it. */
  onDrift?: (drift: Drift) => void;
};

const STATIC_OPACITY = 0.2;
const FADED_OPACITY = 0.1;
const FADE_IN_MS = 2000;
const DEFAULT_LEVELS = 6;
// Gaps widen by shrinking each tile about its centroid; the closed gap is already built into the tiles.
const OPEN_SCALE = (SIDE - (OPEN_GAP - HEX_GAP)) / SIDE;
const FADE_MS = 2000;
const SETTLE_MS = 800; // Returning to `static`.

// Drift: a slow ping-pong between rest and a slightly larger, shifted tiling.
const DRIFT_MS = 12000;
const DRIFT_SCALE = 1.15;
const DRIFT_SHIFT: Point = { x: -40, y: -25 }; // px

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
  const [local, rest] = splitProps(props, ['class', 'origin', 'unit', 'hole', 'levels', 'controller', 'onDrift']);
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
    };

    createEffect(layout); // Tracks `origin` and `unit`.
    const observer = new ResizeObserver(layout);
    observer.observe(ref);

    // Drift transform at phase p (0 = rest, 1 = fully drifted), about the box centre; reports it.
    let phase = 0;
    const driftTransform = (p: number) => {
      phase = p;
      const cx = size.width / 2;
      const cy = size.height / 2;
      const scale = 1 + (DRIFT_SCALE - 1) * p;
      local.onDrift?.({ shift: { x: DRIFT_SHIFT.x * p, y: DRIFT_SHIFT.y * p }, scale });
      return `translate(${cx + DRIFT_SHIFT.x * p} ${cy + DRIFT_SHIFT.y * p}) scale(${scale}) translate(${-cx} ${-cy})`;
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

    let current: MeshState = 'static';

    const tiles = () => plane.selectAll<SVGPathElement, Shape>('path');
    const shrink = (shape: Shape, scale: number) => {
      const { x, y } = centroid(shape);
      return `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`;
    };

    const reset = () => {
      current = 'static';
      svg.selectAll('*').interrupt();
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
            drift(0, 1);
            await plane.transition().duration(SETTLE_MS).attr('opacity', STATIC_OPACITY).end();
            break;
          case 'faded':
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

    local.controller?.({ state: () => current, set, reset });
    onCleanup(() => {
      observer.disconnect();
      svg.selectAll('*').interrupt();
    });
  });

  return <svg ref={ref} aria-hidden='true' class={local.class ?? 'h-full w-full'} {...rest} />;
};
