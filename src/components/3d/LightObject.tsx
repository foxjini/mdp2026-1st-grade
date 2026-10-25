'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { Html } from '@react-three/drei';
import { MAT, PALETTE, badgeStyle } from '@/core/sdk/design';

interface LightObjectProps {
  isModalOpen?: boolean;
}

export function LightObject({ isModalOpen = false }: LightObjectProps) {
  const reportedColor = useIoTStore((s) => s.actuators.rgb_light.reportedColor);
  const reportedState = useIoTStore((s) => s.actuators.rgb_light.reportedState);
  const isPending = useIoTStore((s) => s.actuators.rgb_light.pending);
  const selectedDeviceId = useIoTStore((s) => s.selectedDeviceId);
  const setSelectedDevice = useIoTStore((s) => s.setSelectedDevice);

  const isSelected = selectedDeviceId === 'rgb_light';
  const isOn = reportedState === 'ON';
  const lightColor = reportedColor || '#3B82F6';

  return (
    <group
      position={[0, 2.65, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedDevice('rgb_light');
      }}
    >
      {/* 1. 천장 마운트 & 전선 */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.45, 8]} />
        <meshStandardMaterial {...MAT.rubber} />
      </mesh>

      {/* 2. 모던 펜던트 조명 갓 (Pendant Shade - 색상에 따라 환하게 발광) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.48, 0.36, 24, 1, true]} />
        <meshStandardMaterial
          color={isOn ? lightColor : MAT.matteWhite.color}
          emissive={isOn ? lightColor : '#000000'}
          emissiveIntensity={isOn ? 1.1 : 0}
          roughness={0.55}
          metalness={0.05}
          side={2}
        />
      </mesh>

      {/* 3. 내부 고휘도 전구 (High-Intensity Bulb) */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive={isOn ? lightColor : '#475569'}
          emissiveIntensity={isOn ? 4.0 : 0}
          roughness={0.1}
        />
      </mesh>

      {/* 4. 부드러운 빛 구름 (Glow Halo Sphere) */}
      {isOn && (
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial
            color={lightColor}
            transparent
            opacity={0.16}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 5. 방 전체를 물들이는 감성 조명 (PointLight & SpotLight) */}
      {isOn && (
        <>
          <pointLight
            position={[0, -0.15, 0]}
            color={lightColor}
            intensity={4.5}
            distance={7}
            decay={1.8}
            castShadow
            shadow-bias={-0.001}
          />
          <spotLight
            position={[0, 0, 0]}
            color={lightColor}
            intensity={3.5}
            angle={0.9}
            penumbra={0.6}
            distance={6}
          />
        </>
      )}

      {/* 선택 시 상단 3D 배지 */}
      {isSelected && !isModalOpen && (
        <Html position={[0, 0.7, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div style={{ ...badgeStyle(true), pointerEvents: 'none' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft }}>무드등 · RGB LED</span>
            <span style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: isOn ? lightColor : PALETTE.off, display: 'inline-block' }} />
              {isPending ? '변경 중' : isOn ? '켜짐' : '꺼짐'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
