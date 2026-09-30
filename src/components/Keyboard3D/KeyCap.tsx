import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { KeyConfig } from '@/types/keyboard';
import { useKeyboardStore, useIsKeyPressed } from '@/store/useKeyboardStore';
import { useZoneColors } from '@/store/useKeyboardStore';

interface KeyCapProps {
  keyConfig: KeyConfig;
  selectedZone?: string | null;
}

export function KeyCap({ keyConfig, selectedZone }: KeyCapProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isPressed = useIsKeyPressed(keyConfig.id);
  const zoneColors = useZoneColors();
  const pressKey = useKeyboardStore((state) => state.pressKey);
  const releaseKey = useKeyboardStore((state) => state.releaseKey);

  const color = zoneColors[keyConfig.zone];
  const isSelected = selectedZone === keyConfig.zone;

  const pressDepth = useMemo(() => (isPressed ? -0.15 : 0), [isPressed]);
  const targetScale = useMemo(() => (isPressed ? 0.98 : 1), [isPressed]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        pressDepth,
        delta * 15
      );
      meshRef.current.scale.y = THREE.MathUtils.lerp(
        meshRef.current.scale.y,
        targetScale,
        delta * 12
      );
      meshRef.current.scale.x = THREE.MathUtils.lerp(
        meshRef.current.scale.x,
        targetScale,
        delta * 12
      );
      meshRef.current.scale.z = THREE.MathUtils.lerp(
        meshRef.current.scale.z,
        targetScale,
        delta * 12
      );
    }
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pressKey(keyConfig.id);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    releaseKey(keyConfig.id);
  };

  const handlePointerOut = () => {
    setHovered(false);
    if (isPressed) {
      releaseKey(keyConfig.id);
    }
  };

  const emissiveIntensity = hovered || isSelected ? 0.3 : isPressed ? 0.5 : 0.1;
  const emissiveColor = isPressed ? '#ffffff' : hovered ? '#6366f1' : isSelected ? '#8b5cf6' : '#000000';

  const fontSize = keyConfig.width > 1.5 ? 0.28 : keyConfig.width > 1 ? 0.32 : 0.38;

  return (
    <group position={[keyConfig.x + keyConfig.width / 2, 0, keyConfig.y + keyConfig.height / 2]}>
      <RoundedBox
        ref={meshRef}
        args={[keyConfig.width * 0.92, 0.4, keyConfig.height * 0.92]}
        radius={0.08}
        smoothness={4}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerOver={() => setHovered(true)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </RoundedBox>
      
      <Text
        position={[0, 0.21, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontSize}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight={600}
      >
        {keyConfig.label}
      </Text>
    </group>
  );
}
