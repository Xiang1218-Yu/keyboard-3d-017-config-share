import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lights } from './Lights';
import { KeyboardCase } from './KeyboardCase';
import { KeyCap } from './KeyCap';
import { useLayout } from '@/store/useKeyboardStore';
import { LAYOUT_CONFIGS } from '@/data/layouts';
import { KeyZone } from '@/types/keyboard';
import * as THREE from 'three';

interface KeyboardContentProps {
  selectedZone: KeyZone | null;
}

function KeyboardContent({ selectedZone }: KeyboardContentProps) {
  const layout = useLayout();
  const layoutConfig = LAYOUT_CONFIGS[layout];
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  const keys = useMemo(() => {
    return layoutConfig.keys.map((keyConfig) => (
      <KeyCap
        key={keyConfig.id}
        keyConfig={keyConfig}
        selectedZone={selectedZone}
      />
    ));
  }, [layoutConfig.keys, selectedZone]);

  return (
    <group ref={groupRef}>
      <KeyboardCase />
      <group position={[-layoutConfig.width / 2, 0.35, -layoutConfig.height / 2]}>
        {keys}
      </group>
    </group>
  );
}

interface KeyboardSceneProps {
  selectedZone: KeyZone | null;
}

export function KeyboardScene({ selectedZone }: KeyboardSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 18, 22], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 15, 35]} />
      
      <Lights />
      <KeyboardContent selectedZone={selectedZone} />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={12}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 8}
        enablePan={true}
        target={[0, 0, 0]}
      />
      
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={0.5}
        />
      </EffectComposer>
    </Canvas>
  );
}
