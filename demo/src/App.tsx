import { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import Panel, { type PanelState } from './Panel';
import type { FeelId } from './config';

const INITIAL: PanelState = { feel: 'rigid', gravityScale: 1.6, showBounds: true };

export default function App() {
  const [feel, setFeel] = useState<FeelId>(INITIAL.feel);
  const [gravityScale, setGravityScale] = useState(INITIAL.gravityScale);
  const [showBounds, setShowBounds] = useState(INITIAL.showBounds);
  const [epoch, setEpoch] = useState(0);
  const [ready, setReady] = useState(false);

  const onPanelChange = useCallback((state: PanelState) => {
    setFeel(state.feel);
    setGravityScale(state.gravityScale);
    setShowBounds(state.showBounds);
  }, []);

  const onReset = useCallback(() => setEpoch((n) => n + 1), []);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <>
      <Canvas
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [0, 5.5, 14], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true }}
      >
        <Scene
          feel={feel}
          gravityScale={gravityScale}
          showBounds={showBounds}
          epoch={epoch}
          onReady={onReady}
        />
      </Canvas>

      {!ready && <div className="loader">loading physics…</div>}

      <div className="hud">
        <p className="brand">DraggableRigidBody</p>
        <p>
          Grab a shape and fling it: the bounding box keeps it in, the walls bounce it back. Set
          <em> joint </em> to Spring or Jelly for the wobbly variant. Drag the background to orbit.
        </p>
        <p>
          <a href="https://github.com/niccolofanton/DraggableRigidBody" target="_blank" rel="noreferrer">
            github.com/niccolofanton/DraggableRigidBody
          </a>
        </p>
      </div>

      <Panel initial={INITIAL} onChange={onPanelChange} onReset={onReset} />
    </>
  );
}
