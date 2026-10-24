// Scene.tsx — 스마트 펫 급식기 (예제 꾸러미)
// · SG90 각도 → 사료통 뚜껑 회전 · RGB LED → 상태등 · Cds → 밤/낮 창문 색
// · custom.food_weight → 그릇 안 사료 높이 · 사료통 클릭 → sendCommand('feed', true)
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSensor, useCustomValue, useServo, useRgb, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const lidRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  const light = useSensor('cds_light').value;
  const weight = useCustomValue('food_weight', 300);
  const feedCount = useCustomValue('feed_count', 0);
  const { angle } = useServo();
  const { color, on } = useRgb();

  const isNight = light < 20000;
  const foodLevel = Math.min(1, Math.max(0, weight / 500));

  useFrame((state, delta) => {
    if (lidRef.current) {
      // 0° 닫힘 ~ 90° 이상 활짝 열림
      const target = -(Math.min(90, angle) / 90) * (Math.PI / 2);
      lidRef.current.rotation.x = THREE.MathUtils.damp(lidRef.current.rotation.x, target, 6, delta);
    }
    if (tailRef.current) {
      // 사료가 있으면 강아지 꼬리를 흔듦
      tailRef.current.rotation.z = weight > 50 ? Math.sin(state.clock.elapsedTime * 8) * 0.5 : 0;
    }
  });

  return (
    <group>
      {/* 원목 바닥 + 벽 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#D6B48A" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.5, -3.5]} receiveShadow>
        <boxGeometry args={[7, 3, 0.1]} />
        <meshStandardMaterial color="#FFF7ED" />
      </mesh>

      {/* 창문: Cds 조도에 따라 낮(하늘색) / 밤(남색) */}
      <mesh position={[1.8, 1.9, -3.44]}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color={isNight ? '#1E3A8A' : '#7DD3FC'} emissive={isNight ? '#1E3A8A' : '#000000'} emissiveIntensity={0.3} />
      </mesh>

      {/* 사료통 (클릭 → 급식 명령) */}
      <group position={[-1.2, 0, -1.6]}>
        <mesh
          position={[0, 0.7, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            sendCommand('feed', true);
          }}
        >
          <cylinderGeometry args={[0.45, 0.45, 1.4, 24]} />
          <meshStandardMaterial color="#F59E0B" transparent opacity={0.85} />
        </mesh>
        {/* 뚜껑 (SG90) — 뒤쪽 모서리를 축으로 회전 */}
        <group ref={lidRef} position={[0, 1.42, -0.45]}>
          <mesh position={[0, 0.04, 0.45]} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.08, 24]} />
            <meshStandardMaterial color="#B45309" />
          </mesh>
        </group>
        {/* 상태등 (RGB LED) */}
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={on ? color : '#64748B'} emissive={on ? color : '#000000'} emissiveIntensity={on ? 2 : 0} />
        </mesh>
        {on && <pointLight position={[0, 1.8, 0.3]} color={color} intensity={1} distance={4} />}
      </group>

      {/* 밥그릇 + 사료 (무게에 따라 높이) */}
      <group position={[0.2, 0, -0.6]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.4, 0.24, 24, 1, true]} />
          <meshStandardMaterial color="#EF4444" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02 + foodLevel * 0.18, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.04 + foodLevel * 0.02, 24]} />
          <meshStandardMaterial color="#92400E" roughness={1} />
        </mesh>
      </group>

      {/* 강아지 (기본 도형) */}
      <group position={[1.4, 0, 0.6]} rotation={[0, -0.8, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.9, 0.45, 0.45]} />
          <meshStandardMaterial color="#FBBF24" />
        </mesh>
        <mesh position={[0.55, 0.75, 0]} castShadow>
          <boxGeometry args={[0.4, 0.38, 0.38]} />
          <meshStandardMaterial color="#FBBF24" />
        </mesh>
        <mesh ref={tailRef} position={[-0.5, 0.65, 0]}>
          <boxGeometry args={[0.08, 0.35, 0.08]} />
          <meshStandardMaterial color="#D97706" />
        </mesh>
        {[-0.3, 0.3].map((x) =>
          [-0.15, 0.15].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.12, z]}>
              <boxGeometry args={[0.1, 0.24, 0.1]} />
              <meshStandardMaterial color="#D97706" />
            </mesh>
          ))
        )}
      </group>

      {/* 상태 배지 */}
      {!isModalOpen && (
        <Html position={[-0.4, 2.3, -1]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="px-3 py-2 rounded-2xl bg-slate-900/90 text-white text-xs whitespace-nowrap pointer-events-none flex gap-3">
            <span>
              사료 <b className={weight < 50 ? 'text-rose-400' : 'text-amber-300'}>{Math.round(weight)}g</b>
            </span>
            <span>
              급식 <b className="text-emerald-300">{Math.round(feedCount)}회</b>
            </span>
            <span>
              뚜껑 <b className="text-sky-300">{angle}°</b>
            </span>
            <span>{isNight ? '🌙 밤' : '☀️ 낮'}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
