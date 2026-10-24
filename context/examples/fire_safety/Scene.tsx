// Scene.tsx — 화재 방재 안전실 (예제 꾸러미)
// · DHT11 온도 → 온도계 막대 · custom.flame → 불꽃 파티클 · custom.alarm_on → 경광등 회전
// · RGB LED → 천장 경보등 색 · 해제 버튼 클릭 → sendCommand('reset', true)
// (SG90 · Cds 는 이 공간 Pico 에 연결하지 않으므로 사용하지 않음)
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSensor, useCustomValue, useRgb, sendCommand } from '@/core/sdk';

const FLAME_COUNT = 24;

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const flamesRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Group>(null);

  const temp = useSensor('dht11_temp').value;
  const flame = useCustomValue('flame') > 0.5;
  const alarm = useCustomValue('alarm_on') > 0.5;
  const { color, on } = useRgb();

  // 불꽃 파티클 시작 위치 (한 번만 계산)
  const seeds = useMemo(
    () => Array.from({ length: FLAME_COUNT }, (_, i) => ({ x: Math.sin(i * 2.3) * 0.35, z: Math.cos(i * 1.7) * 0.35, speed: 0.6 + (i % 5) * 0.15 })),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (flamesRef.current) {
      flamesRef.current.visible = flame;
      flamesRef.current.children.forEach((child, i) => {
        const s = seeds[i];
        const y = ((t * s.speed + i * 0.13) % 1) * 1.2;
        child.position.set(s.x * (1 - y / 1.4), 0.1 + y, s.z * (1 - y / 1.4));
        child.scale.setScalar(Math.max(0.05, 0.25 - y * 0.18));
      });
    }
    if (beaconRef.current) {
      beaconRef.current.rotation.y += alarm ? delta * 8 : 0;
    }
  });

  const tempRatio = Math.min(1, Math.max(0, (temp - 10) / 40));

  return (
    <group>
      {/* 바닥 + 벽 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#CBD5E1" />
      </mesh>
      <mesh position={[0, 1.5, -3.5]}>
        <boxGeometry args={[7, 3, 0.1]} />
        <meshStandardMaterial color="#F1F5F9" />
      </mesh>

      {/* 비상구 표지 */}
      <mesh position={[-2.4, 2.5, -3.44]}>
        <planeGeometry args={[1, 0.4]} />
        <meshStandardMaterial color="#16A34A" emissive="#16A34A" emissiveIntensity={0.8} />
      </mesh>

      {/* 휴지통 + 불꽃 */}
      <group position={[1.2, 0, -1.2]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.3, 0.6, 20]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <group ref={flamesRef} position={[0, 0.6, 0]}>
          {seeds.map((_, i) => (
            <mesh key={i}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial color={i % 3 === 0 ? '#FDE047' : '#F97316'} emissive="#EA580C" emissiveIntensity={1.5} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
        {flame && <pointLight position={[0, 1.2, 0]} color="#F97316" intensity={2} distance={5} />}
      </group>

      {/* 온도계 (DHT11) */}
      <group position={[-2.6, 0, -2.8]}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[0.3, 2, 0.1]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.1 + tempRatio * 0.9, 0.06]}>
          <boxGeometry args={[0.12, 0.2 + tempRatio * 1.8, 0.02]} />
          <meshStandardMaterial color={temp >= 35 ? '#DC2626' : '#F97316'} />
        </mesh>
      </group>

      {/* 천장 경광등 (RGB LED + 경보 시 회전) */}
      <group position={[0, 2.8, 0]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.3, 0.3, 20]} />
          <meshStandardMaterial color={on ? color : '#94A3B8'} emissive={on ? color : '#000000'} emissiveIntensity={on ? 1.5 : 0} transparent opacity={0.9} />
        </mesh>
        {/* 경보 시 회전하는 반사판 */}
        <group ref={beaconRef}>
          <mesh position={[0.18, 0, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.3]} />
            <meshStandardMaterial color="#F8FAFC" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
        {alarm && <pointLight position={[0, -0.3, 0]} color={color} intensity={3} distance={8} />}
      </group>

      {/* 경보 해제 버튼 */}
      <group position={[2.6, 1.1, -3.4]}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            sendCommand('reset', true);
          }}
        >
          <cylinderGeometry args={[0.18, 0.18, 0.12, 20]} />
          <meshStandardMaterial color={alarm ? '#DC2626' : '#64748B'} emissive={alarm ? '#DC2626' : '#000000'} emissiveIntensity={0.6} />
        </mesh>
      </group>

      {!isModalOpen && (
        <Html position={[0, 2.2, -1.5]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div
            className={`px-3 py-2 rounded-2xl text-xs whitespace-nowrap pointer-events-none flex gap-3 ${
              alarm ? 'bg-red-600 text-white ring-4 ring-red-400/60' : 'bg-slate-900/90 text-white'
            }`}
          >
            <span>
              온도 <b>{temp.toFixed(1)}℃</b>
            </span>
            <span>불꽃 {flame ? '🔥 감지' : '없음'}</span>
            <span>{alarm ? '🚨 경보 작동 중 (빨간 버튼으로 해제)' : '✅ 안전'}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
