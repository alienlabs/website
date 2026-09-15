// Triangle geometry shared by the Logo and the Mesh, in logo viewBox units.

export type Point = { x: number; y: number };

/** A rounded equilateral triangle: centre x, orientation and inset base (up) or top (down) y. */
export type Shape = {
  cx: number;
  up: boolean;
  y: number;
};

export const BLUE = '#4a9fda';
/** Monochrome tint of the mesh and of the Logo before it comes alive. */
export const GRAY = '#a3a3a3';

// Corners are rounded by stroking an inset triangle with a round join: inset = 2r along each
// bisector, stroke = 2r.
export const SIDE = 600;
export const R = 30;
const INSET_HALF = SIDE / 2 - R * Math.sqrt(3); // Half side of the inset triangle.
export const INSET_HEIGHT = INSET_HALF * Math.sqrt(3); // Height of the inset triangle.
const HEIGHT = INSET_HEIGHT + 3 * R; // Visible height (apex extends 2r, base r).

/** Gap between the segments of the closed hexagon and between tiles of the mesh. */
export const HEX_GAP = 12;
/** Gap between the segments of the open logo; the mesh widens its gaps to match. */
export const OPEN_GAP = 55;
/** Duration (ms) of the opening, shared so the mesh widens in step with the logo. */
export const OPEN_MS = 800;
/** Horizontal distance between adjacent tile centres. */
export const HEX_DX = SIDE / 2 + HEX_GAP / 2;
/** Vertical distance between mesh strips. */
export const HEX_PITCH = HEIGHT + 1.5 * HEX_GAP;

export const trianglePath = ({ cx, up, y }: Shape) =>
  up
    ? `M${cx} ${y - INSET_HEIGHT} L${cx + INSET_HALF} ${y} L${cx - INSET_HALF} ${y} Z`
    : `M${cx - INSET_HALF} ${y} L${cx + INSET_HALF} ${y} L${cx} ${y + INSET_HEIGHT} Z`;

export const centroid = ({ cx, up, y }: Shape): Point => ({
  x: cx,
  y: up ? y - INSET_HEIGHT / 3 : y + INSET_HEIGHT / 3,
});

/** Up-pointing tiles are translucent; down-pointing ones opaque. */
export const opacityOf = ({ up }: Shape) => (up ? 0.5 : 1);

/**
 * Tile of the triangular mesh around `origin`, in strip `s` (0 = just below the origin's
 * horizontal line, -1 = just above) and column `k` (multiples of HEX_DX from the origin).
 * Down-triangles hang from a strip's upper boundary and up-triangles stand on its lower one,
 * alternating along the strip and between strips; strips -1 and 0 around columns -1..1 form the
 * closed hexagon of the Logo.
 */
export const tile = (origin: Point, s: number, k: number): Shape => {
  const cx = origin.x + k * HEX_DX;
  const up = (k + s) % 2 === 0;
  const boundary = origin.y + (s < 0 ? s + 1 : s) * HEX_PITCH;
  return up
    ? { cx, up, y: s < 0 ? boundary - HEX_GAP / 2 - R : boundary + HEX_GAP + 2 * R + INSET_HEIGHT }
    : { cx, up, y: s < 0 ? boundary - HEX_GAP - 2 * R - INSET_HEIGHT : boundary + HEX_GAP / 2 + R };
};

/** Whether tile (s, k) is one of the six hexagon segments. */
export const isHexagonTile = (s: number, k: number) => (s === 0 || s === -1) && Math.abs(k) <= 1;
