/**
 * Arena = the box you can see. Its six faces are real Rapier colliders, so a
 * body that is thrown hard bounces off them instead of flying away.
 *
 * Drag bounds = the arena inset by the radius of the biggest body, fed to
 * `boundingBox` (DraggableRigidBody) so a pointer can never push a kinematic
 * body through a wall. In the spring modes the body stays dynamic, so the wall
 * colliders themselves contain it and no drag clamp is needed.
 *
 * `dragControlsProps.dragLimits` is deliberately NOT used: CustomDragControls
 * applies it to its own group's local matrix, which only moves during drags,
 * while physics motion is absorbed by the mesh inside the group. The two frames
 * drift apart the moment a body falls, so the clamp box would end up wherever
 * the body last rested — after the initial drop, bodies could barely be lifted.
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

/**
 * The five shared finishes from the three-dof-ultramock scene: a lead (chalk),
 * a counterweight (graphite) and three accents. Plain MeshStandard values —
 * the environment map is what makes the metals read.
 */
export const FINISHES = {
  chalk: { color: '#eef1f5', roughness: 0.6, metalness: 0 },
  graphite: { color: '#272c34', roughness: 0.35, metalness: 1 },
  coral: { color: '#ff5a36', roughness: 0.32, metalness: 0 },
  ink: { color: '#1b4fb0', roughness: 0.28, metalness: 0 },
  brass: { color: '#c79a2e', roughness: 0.24, metalness: 1 },
} as const;

export type FinishId = keyof typeof FINISHES;

export interface BodyDef {
  id: string;
  finish: FinishId;
  position: [number, number, number];
  /** Rapier collider generator that matches the geometry. */
  colliders: 'hull' | 'ball' | 'cuboid';
  /** Half-size of the invisible drag proxy: a slightly generous grab target. */
  proxy: [number, number, number];
}

/** Every start position sits inside the arena, so nothing spawns above the lid. */
export const BODIES: BodyDef[] = [
  { id: 'cube', finish: 'ink', position: [-3.0, 2.0, -1.1], colliders: 'cuboid', proxy: [0.85, 0.85, 0.85] },
  { id: 'ball', finish: 'coral', position: [-1.2, 4.4, 1.0], colliders: 'ball', proxy: [0.95, 0.95, 0.95] },
  { id: 'icosa', finish: 'brass', position: [1.1, 1.9, -1.4], colliders: 'hull', proxy: [1.0, 1.0, 1.0] },
  { id: 'capsule', finish: 'chalk', position: [2.9, 4.2, 0.9], colliders: 'hull', proxy: [0.8, 1.2, 0.8] },
  { id: 'dodeca', finish: 'chalk', position: [0.3, 3.2, 0.2], colliders: 'hull', proxy: [1.0, 1.0, 1.0] },
  { id: 'chrome', finish: 'graphite', position: [-2.3, 5.2, 1.6], colliders: 'ball', proxy: [0.9, 0.9, 0.9] },
];
