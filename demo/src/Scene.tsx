import { Suspense, useEffect, useMemo, useRef, type ReactElement } from 'react';
import * as THREE from 'three';
import { Grid, OrbitControls } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';
import DraggableRigidBody from '../../DraggableRigidBody';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ARENA, BODIES, DRAG_BOUNDS, FEELS, FINISHES, type BodyDef, type FeelId } from './config';

const ARENA_SIZE: [number, number, number] = [
  ARENA.x[1] - ARENA.x[0],
  ARENA.y[1] - ARENA.y[0],
  ARENA.z[1] - ARENA.z[0],
];

const ARENA_CENTER: [number, number, number] = [
  (ARENA.x[0] + ARENA.x[1]) / 2,
  (ARENA.y[0] + ARENA.y[1]) / 2,
  (ARENA.z[0] + ARENA.z[1]) / 2,
];

const WALL = 0.5;

function bodyGeometry(id: string): ReactElement {
  switch (id) {
    case 'cube':
      return <boxGeometry args={[1.4, 1.4, 1.4]} />;
    case 'ball':
      return <sphereGeometry args={[0.8, 32, 24]} />;
    case 'icosa':
      return <icosahedronGeometry args={[0.95, 0]} />;
    case 'capsule':
      return <capsuleGeometry args={[0.45, 0.9, 8, 24]} />;
    case 'dodeca':
      return <dodecahedronGeometry args={[0.9, 0]} />;
    default:
      return <sphereGeometry args={[0.75, 32, 24]} />;
  }
}

interface BodyProps {
  def: BodyDef;
  feel: FeelId;
  gravityScale: number;
}

function Body({ def, feel, gravityScale }: BodyProps) {
  const { enableSpringJoint, stiffness, damping } = FEELS[feel];

  return (
    // groupProps places both the body and its spring anchor: they have to start
    // in the same spot or the joint yanks the body away on the first frame.
    <DraggableRigidBody
      groupProps={{ position: def.position }}
      enableSpringJoint={enableSpringJoint}
      jointConfig={{ stiffness, damping }}
      boundingBox={DRAG_BOUNDS}
      dragControlsProps={{
        // without this, grabbing a body also drags whatever sits behind it
        preventOverlap: true,
      }}
      rigidBodyProps={{
        colliders: def.colliders,
        gravityScale,
        linearDamping: 0.15,
        angularDamping: 0.25,
        restitution: 0.45,
        friction: 0.7,
      }}
      visibleMesh={
        <mesh castShadow receiveShadow>
          {bodyGeometry(def.id)}
          <meshStandardMaterial {...FINISHES[def.finish]} />
        </mesh>
      }
      // A plain box, a little larger than the shape, is what the pointer
      // actually hits. Easier to grab — especially with a thumb.
      invisibleMesh={
        <mesh>
          <boxGeometry args={[def.proxy[0] * 2, def.proxy[1] * 2, def.proxy[2] * 2]} />
          <meshBasicMaterial />
        </mesh>
      }
    />
  );
}

function ArenaWalls() {
  const [w, h, d] = ARENA_SIZE;
  const [cx, cy, cz] = ARENA_CENTER;

  return (
    <RigidBody type="fixed" colliders={false} restitution={0.5} friction={0.5}>
      {/* floor */}
      <CuboidCollider args={[w / 2 + WALL, WALL, d / 2 + WALL]} position={[cx, ARENA.y[0] - WALL, cz]} />
      {/* ceiling */}
      <CuboidCollider args={[w / 2 + WALL, WALL, d / 2 + WALL]} position={[cx, ARENA.y[1] + WALL, cz]} />
      {/* left / right */}
      <CuboidCollider args={[WALL, h / 2, d / 2]} position={[ARENA.x[0] - WALL, cy, cz]} />
      <CuboidCollider args={[WALL, h / 2, d / 2]} position={[ARENA.x[1] + WALL, cy, cz]} />
      {/* back / front */}
      <CuboidCollider args={[w / 2, h / 2, WALL]} position={[cx, cy, ARENA.z[0] - WALL]} />
      <CuboidCollider args={[w / 2, h / 2, WALL]} position={[cx, cy, ARENA.z[1] + WALL]} />
    </RigidBody>
  );
}

function ArenaOutline() {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...ARENA_SIZE)), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineSegments geometry={geometry} position={ARENA_CENTER}>
        <lineBasicMaterial color="#6d8cff" transparent opacity={0.7} depthWrite={false} />
      </lineSegments>
      {/* the footprint reads the box against the floor even when it is empty */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ARENA_CENTER[0], 0.004, ARENA_CENTER[2]]}>
        <planeGeometry args={[ARENA_SIZE[0], ARENA_SIZE[2]]} />
        <meshBasicMaterial color="#4f7cff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Frames the whole arena for the current viewport. Phones are narrow and tall,
 * so instead of guessing a distance it walks the camera back until all eight
 * corners of the box project inside the frustum. Re-frames only on a real
 * aspect change, not on the address-bar resize that a scroll produces.
 */
const VIEW_DIR = new THREE.Vector3(0, 0.44, 0.9).normalize();

function FitCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as { target: THREE.Vector3; update: () => void } | null;
  const lastAspect = useRef(0);

  useEffect(() => {
    const aspect = size.width / size.height;
    if (Math.abs(aspect - lastAspect.current) / (lastAspect.current || 1) < 0.15) return;
    lastAspect.current = aspect;

    const target = new THREE.Vector3(0, ARENA_SIZE[1] * 0.38, 0);
    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1])
          corners.push(
            new THREE.Vector3(
              ARENA_CENTER[0] + (sx * ARENA_SIZE[0]) / 2,
              ARENA_CENTER[1] + (sy * ARENA_SIZE[1]) / 2,
              ARENA_CENTER[2] + (sz * ARENA_SIZE[2]) / 2
            )
          );

    let distance = 16;
    for (let i = 0; i < 20; i += 1) {
      camera.position.copy(target).addScaledVector(VIEW_DIR, distance);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      // portrait phones are allowed to crop the sides of the box a little,
      // otherwise the whole scene shrinks into a band in the middle
      const marginX = aspect < 0.85 ? 1.12 : 0.94;
      let overflow = 0;
      for (const corner of corners) {
        const p = corner.clone().project(camera);
        overflow = Math.max(overflow, Math.abs(p.x) / marginX, Math.abs(p.y) / 0.88);
      }
      if (Math.abs(overflow - 1) < 0.01) break;
      distance = THREE.MathUtils.clamp(distance * overflow, 10, 40);
    }

    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, controls, size.width, size.height]);

  return null;
}

/**
 * three-starter's environment: three's generated RoomEnvironment through
 * PMREM, used as the scene light. No HDRI download, works offline.
 */
function RoomEnv() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      texture.dispose();
    };
  }, [gl, scene]);

  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export interface SceneProps {
  feel: FeelId;
  gravityScale: number;
  showBounds: boolean;
  /** bumped by "Reset" and by a feel change: remounts every body */
  epoch: number;
  onReady: () => void;
}

export default function Scene({ feel, gravityScale, showBounds, epoch, onReady }: SceneProps) {
  return (
    <>
      <color attach="background" args={['#0d1014']} />
      <fog attach="fog" args={['#0d1014', 20, 46]} />

      {/* three-starter lighting setup: the environment map is the main light.
          One shadow-only directional stays, because dynamic bodies with no cast
          shadow float visually — RoomEnvironment cannot cast one. */}
      <RoomEnv />
      <directionalLight
        position={[7, 12, 6]}
        intensity={0.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.9} metalness={0} />
      </mesh>

      <Grid
        position={[0, 0.002, 0]}
        args={[80, 80]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2b3542"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#3d4d6b"
        fadeDistance={38}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
      />

      {showBounds && <ArenaOutline />}

      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <ArenaWalls />
          <group key={`${feel}-${epoch}`}>
            {BODIES.map((def) => (
              <Body key={def.id} def={def} feel={feel} gravityScale={gravityScale} />
            ))}
          </group>
          <Ready onReady={onReady} />
        </Physics>
      </Suspense>

      <FitCamera />

      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0, ARENA_SIZE[1] * 0.38, 0]}
        minDistance={9}
        maxDistance={38}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2 - 0.06}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
