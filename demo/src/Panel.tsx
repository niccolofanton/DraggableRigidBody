import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import { createDriftpane } from '@niccolofanton/driftpane';
import '@niccolofanton/driftpane/theme.css';
import { FEELS, type FeelId } from './config';

export interface PanelState {
  feel: FeelId;
  gravityScale: number;
  showBounds: boolean;
}

interface PanelProps {
  initial: PanelState;
  onChange: (state: PanelState) => void;
  onReset: () => void;
}

export default function Panel({ initial, onChange, onReset }: PanelProps) {
  const onChangeRef = useRef(onChange);
  const onResetRef = useRef(onReset);
  onChangeRef.current = onChange;
  onResetRef.current = onReset;

  useEffect(() => {
    const params: PanelState = { ...initial };

    const pane = new Pane({ title: 'DraggableRigidBody' });
    const emit = () => onChangeRef.current({ ...params });

    pane
      .addBinding(params, 'feel', {
        label: 'joint',
        options: Object.fromEntries(
          (Object.keys(FEELS) as FeelId[]).map((id) => [FEELS[id].label, id])
        ) as Record<string, FeelId>,
      })
      .on('change', emit);

    pane
      .addBinding(params, 'gravityScale', { label: 'gravity', min: 0, max: 4, step: 0.1 })
      .on('change', emit);

    pane.addBinding(params, 'showBounds', { label: 'bounds' }).on('change', emit);

    pane.addButton({ title: 'Drop again' }).on('click', () => onResetRef.current());

    // driftpane is wired only once the pane is fully built
    const drift = createDriftpane(pane, {
      storageNamespace: 'draggable-rigidbody-demo',
      draggable: true,
      presetsEnabled: true,
      clampToViewport: true,
      theme: 'dark',
      width: 236,
      urlSync: true,
    });

    // persisted / shared values have to reach the scene as well
    emit();

    return () => {
      drift.dispose();
      pane.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
