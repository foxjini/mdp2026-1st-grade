'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { Html } from '@react-three/drei';
import { MAT, PALETTE, badgeStyle } from '@/core/sdk/design';

interface CdsSensorNodeProps {
  isModalOpen?: boolean;
}

export function CdsSensorNode({ isModalOpen = false }: CdsSensorNodeProps) {
  const light = useIoTStore((s) => s.sensors.cds_light);
  const selectedDeviceId = useIoTStore((s) => s.selectedDeviceId);
  const setSelectedDevice = useIoTStore((s) => s.setSelectedDevice);

  const isSelected = selectedDeviceId === 'cds_light';
  // 0 ~ 65535를 0 ~ 100% 밝기 비율로 환산
  const lightPercent = Math.round((light.value / 65535) * 100);

  return (
    <group
      position={[-0.8, 1.05, -2.1]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedDevice('cds_light');
      }}
    >
      {/* 1. 받침대 (브러시드 메탈) */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.08, 24]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
      </mesh>

      {/* 2. 수광부: 밝을수록 은은하게 빛남 (값에 의미가 있는 발광) */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.02, 24]} />
        <meshStandardMaterial
          color={PALETTE.sand}
          emissive={isSelected ? PALETTE.info : '#E9B44C'}
          emissiveIntensity={light.isStale ? 0 : 0.2 + (lightPercent / 100) * 0.9}
          roughness={0.3}
        />
      </mesh>

      {/* 3. 실시간 수치 배지 (디자인 킷 배지 카드) */}
      {!isModalOpen && (
        <Html position={[0, 0.38, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
          <div
            style={{ ...badgeStyle(isSelected), cursor: 'pointer', minWidth: 110 }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDevice('cds_light');
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft }}>조도 · Cds</span>
            {light.isStale ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: PALETTE.off }}>수신 대기</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {lightPercent}
                <small style={{ fontSize: 10, color: PALETTE.inkSoft, marginLeft: 1 }}>%</small>
                <small style={{ fontSize: 9, color: PALETTE.inkSoft, marginLeft: 6 }}>{light.value} ADC</small>
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
