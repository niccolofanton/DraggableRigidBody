/**
 * Arena = the box you can see. Its six faces are real Rapier colliders, so a
 * body that is thrown hard bounces off them instead of flying away.
 *
 * Drag bounds = the arena inset by the radius of the biggest body. They are fed
 * to `boundingBox` (DraggableRigidBody) and to `dragControlsProps.dragLimits`
 * (CustomDragControls) so a pointer can never push a body through a wall.
 *
 * Both are needed: `boundingBox` is applied to the rigid body directly, but the
 * component short-circuits it when `enableSpringJoint` is on and steers the
 * spring anchor instead — `dragLimits` clamps that anchor.
 */
export const ARENA = {
  x: [-4.5, 4.5],
  y: [0, 6.2],
  z: [-3.2, 3.2],
} as const;

// Horizontal inset = radius of the largest body, so a drag can never push one
// through a wall. Vertically the floor is allowed to be nearly touched.
const INSET = 0.9;

export type Bounds3 = [[number, number], [number, number], [number, number]];

/** World-space clamp, handed to `boundingBox`. */
export const DRAG_BOUNDS: Bounds3 = [
  [ARENA.x[0] + INSET, ARENA.x[1] - INSET],
  [ARENA.y[0] + 0.35, ARENA.y[1] - INSET],
  [ARENA.z[0] + INSET, ARENA.z[1] - INSET],
];

/**
 * CustomDragControls writes into the *local* matrix of its own group, so its
 * `dragLimits` live in the parent group's space. Same box, shifted by wherever
 * the body was placed.
 */
export function localDragLimits(origin: [number, number, number]): Bounds3 {
  return DRAG_BOUNDS.map((axis, i) => [axis[0] - origin[i], axis[1] - origin[i]]) as Bounds3;
}

export type FeelId = 'rigid' | 'springy' | 'jelly';

export interface Feel {
  label: string;
  enableSpringJoint: boolean;
  stiffness: number;
  damping: number;
}

/**
 * The three settings of `enableSpringJoint` / `jointConfig` the panel switches
 * between. "None" is the plain component: the body is kinematic while held and
 * turns dynamic again on release, so a fling keeps its velocity and falls.
 * The two spring settings trade that for the wobble — the body trails the
 * pointer on a spring and, because the joint anchor is pinned in place when you
 * let go, it hangs and oscillates around the point where it was released.
 */
export const FEELS: Record<FeelId, Feel> = {
  rigid: { label: 'None', enableSpringJoint: false, stiffness: 0, damping: 0 },
  springy: { label: 'Spring', enableSpringJoint: true, stiffness: 420, damping: 14 },
  jelly: { label: 'Jelly', enableSpringJoint: true, stiffness: 110, damping: 1.5 },
};

export interface BodyDef {
  id: string;
  color: string;
  position: [number, number, number];
  /** Rapier collider generator that matches the geometry. */
  colliders: 'hull' | 'ball' | 'cuboid';
  /** Half-size of the invisible drag proxy: a slightly generous grab target. */
  proxy: [number, number, number];
  metalness?: number;
}

/** Every start position sits inside the arena, so nothing spawns above the lid. */
export const BODIES: BodyDef[] = [
  { id: 'cube', color: '#4f7cff', position: [-3.0, 2.0, -1.1], colliders: 'cuboid', proxy: [0.85, 0.85, 0.85] },
  { id: 'ball', color: '#ff6b6b', position: [-1.2, 4.4, 1.0], colliders: 'ball', proxy: [0.95, 0.95, 0.95] },
  { id: 'icosa', color: '#ffd166', position: [1.1, 1.9, -1.4], colliders: 'hull', proxy: [1.0, 1.0, 1.0] },
  { id: 'capsule', color: '#06d6a0', position: [2.9, 4.2, 0.9], colliders: 'hull', proxy: [0.8, 1.2, 0.8] },
  { id: 'dodeca', color: '#c77dff', position: [0.3, 3.2, 0.2], colliders: 'hull', proxy: [1.0, 1.0, 1.0] },
  { id: 'chrome', color: '#dfe6f0', position: [-2.3, 5.2, 1.6], colliders: 'ball', proxy: [0.9, 0.9, 0.9], metalness: 0.9 },
];
