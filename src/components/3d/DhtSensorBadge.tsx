'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { Html } from '@react-three/drei';
import { MAT, PALETTE, badgeStyle } from '@/core/sdk/design';

interface DhtSensorBadgeProps {
  isModalOpen?: boolean;
}

export function DhtSensorBadge({ isModalOpen = false }: DhtSensorBadgeProps) {
  const temp = useIoTStore((s) => s.sensors.dht11_temp);
  const humi = useIoTStore((s) => s.sensors.dht11_humi);
  const selectedDeviceId = useIoTStore((s) => s.selectedDeviceId);
  const setSelectedDevice = useIoTStore((s) => s.setSelectedDevice);

  const isSelected = selectedDeviceId === 'dht11_temp' || selectedDeviceId === 'dht11_humi';

  return (
    <group
      position={[1.8, 1.05, -1.2]}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedDevice('dht11_temp');
      }}
    >
      {/* DHT11 센서 모듈 본체: 무광 화이트 케이스 + 세이지 그릴 */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.22, 0.3, 0.1]} />
        <meshStandardMaterial {...MAT.matteWhite} />
      </mesh>
      <mesh position={[0, 0.03, 0.052]}>
        <boxGeometry args={[0.16, 0.16, 0.006]} />
        <meshStandardMaterial {...MAT.sage} emissive={isSelected ? PALETTE.info : '#000000'} emissiveIntensity={isSelected ? 0.6 : 0} />
      </mesh>
      {/* 상태 표시등 (수신 중 초록 · 수신 대기 회색) */}
      <mesh position={[0, -0.1, 0.052]}>
        <circleGeometry args={[0.012, 16]} />
        <meshStandardMaterial {...MAT.glow(PALETTE.ok, !temp.isStale)} />
      </mesh>

      {/* PCB 베이스 */}
      <mesh position={[0, -0.05, -0.06]}>
        <boxGeometry args={[0.25, 0.42, 0.02]} />
        <meshStandardMaterial color="#2F4A3F" roughness={0.7} />
      </mesh>

      {/* 실시간 수치 배지 (디자인 킷 배지 카드) */}
      {!isModalOpen && (
        <Html position={[0, 0.45, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
          <div
            style={{ ...badgeStyle(isSelected), cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDevice('dht11_temp');
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft }}>온습도 · DHT11</span>
            {temp.isStale ? (
              <span style={{ fontSize: 12, fontWeight: 800, color: PALETTE.off }}>수신 대기</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', display: 'flex', gap: 8 }}>
                <span>
                  {temp.value.toFixed(1)}
                  <small style={{ fontSize: 10, color: PALETTE.inkSoft, marginLeft: 1 }}>℃</small>
                </span>
                <span>
                  {humi.value.toFixed(0)}
                  <small style={{ fontSize: 10, color: PALETTE.inkSoft, marginLeft: 1 }}>%</small>
                </span>
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
