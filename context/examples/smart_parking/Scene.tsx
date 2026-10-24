// Scene.tsx — 스마트 주차장 (예제 꾸러미)
// · custom.slot_1~3 → 칸마다 차량 표시 · custom.free_count → 빈자리 전광판
// · SG90 각도 → 차단기 막대 회전 · RGB LED → 입구 표시등 · 차단기 클릭 → sendCommand('gate', true)
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useCustomValue, useServo, useRgb, sendCommand } from '@/core/sdk';

const SLOT_X = [-1.8, 0, 1.8];
const CAR_COLORS = ['#3B82F6', '#10B981', '#F43F5E'];

function Car({ x, parked, color }: { x: number; parked: boolean; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      // 주차하면 칸 안(z=-1.4)으로, 나가면 도로(z=2.6)로 부드럽게 이동
      ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, parked ? -1.4 : 2.6, 3, delta);
      ref.current.visible = parked || ref.current.position.z < 2.5;
    }
  });
  return (
    <group ref={ref} position={[x, 0, 2.6]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.35, 1.6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, -0.1]} castShadow>
        <boxGeometry args={[0.75, 0.3, 0.9]} />
        <meshStandardMaterial color="#E0F2FE" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const barRef = useRef<THREE.Group>(null);
  const slots = [useCustomValue('slot_1'), useCustomValue('slot_2'), useCustomValue('slot_3')].map((v) => v > 0.5);
  const free = useCustomValue('free_count', 3);
  const { angle } = useServo();
  const { color, on } = useRgb();

  useFrame((_, delta) => {
    if (barRef.current) {
      // 0° 닫힘(수평) ~ 90° 열림(수직)
      barRef.current.rotation.z = THREE.MathUtils.damp(barRef.current.rotation.z, (Math.min(90, angle) / 90) * (Math.PI / 2), 5, delta);
    }
  });

  return (
    <group>
      {/* 아스팔트 + 주차선 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#334155" roughness={0.95} />
      </mesh>
      {[-2.7, -0.9, 0.9, 2.7].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -1.4]}>
          <planeGeometry args={[0.08, 2.2]} />
          <meshStandardMaterial color="#F8FAFC" />
        </mesh>
      ))}

      {/* 칸 번호 바닥 표시 (빈칸 초록 / 주차 빨강) */}
      {SLOT_X.map((x, i) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, -2.3]}>
          <planeGeometry args={[0.5, 0.3]} />
          <meshStandardMaterial color={slots[i] ? '#EF4444' : '#22C55E'} emissive={slots[i] ? '#EF4444' : '#22C55E'} emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* 차량 */}
      {SLOT_X.map((x, i) => (
        <Car key={x} x={x} parked={slots[i]} color={CAR_COLORS[i]} />
      ))}

      {/* 차단기 (SG90) — 클릭하면 열기/닫기 명령 */}
      <group position={[-3, 0, 1.6]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.3, 1, 0.3]} />
          <meshStandardMaterial color="#FACC15" />
        </mesh>
        <group ref={barRef} position={[0, 0.9, 0]}>
          <mesh
            position={[1.4, 0, 0]}
            castShadow
            onClick={(e) => {
              e.stopPropagation();
              sendCommand('gate', angle < 45);
            }}
          >
            <boxGeometry args={[2.8, 0.1, 0.1]} />
            <meshStandardMaterial color="#F8FAFC" />
          </mesh>
        </group>
        {/* 입구 표시등 (RGB LED) */}
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color={on ? color : '#475569'} emissive={on ? color : '#000000'} emissiveIntensity={on ? 2 : 0} />
        </mesh>
      </group>

      {/* 빈자리 전광판 */}
      {!isModalOpen && (
        <Html position={[0, 2.2, -2.6]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="px-4 py-2 rounded-xl bg-black/90 border border-slate-600 text-center pointer-events-none whitespace-nowrap">
            <div className="text-[10px] text-slate-400">SMART PARKING</div>
            <div className={`text-lg font-black font-mono ${free > 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {free > 0 ? `빈자리 ${Math.round(free)}칸` : '만차'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
