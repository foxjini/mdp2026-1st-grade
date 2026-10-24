// Scene.tsx — 스마트 팜 온실 (예제 꾸러미)
// · SG90 각도 → 환기 돔 개폐 · RGB LED → 식물 생장등 · custom.soil_moisture → 토양 색/배지
// · 펌프를 클릭하면 sendCommand('water', true) → mock.js onCommand / Pico 팀 모듈 handle()
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { LightObject } from '@/components/3d/LightObject';
import { CdsSensorNode } from '@/components/3d/CdsSensorNode';
import { useSensor, useCustomValue, useServo, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const domeRef = useRef<THREE.Group>(null);
  const waterRef = useRef<THREE.Mesh>(null);

  const temp = useSensor('dht11_temp').value;
  const soil = useCustomValue('soil_moisture', 50);
  const pumpOn = useCustomValue('pump_on', 0) > 0.5;
  const { angle } = useServo();

  // SG90 각도(0~180°) → 환기 돔 회전(0 ~ 약 55°)
  const domeOpenRad = (Math.min(180, Math.max(0, angle)) / 180) * 0.95;

  useFrame((state, delta) => {
    if (domeRef.current) {
      domeRef.current.rotation.x = THREE.MathUtils.damp(domeRef.current.rotation.x, -domeOpenRad, 5, delta);
    }
    if (waterRef.current) {
      waterRef.current.visible = pumpOn;
      waterRef.current.position.y = 1.2 - ((state.clock.elapsedTime * 1.5) % 0.6);
    }
  });

  // 토양 수분이 낮을수록 밝은 갈색(건조)
  const soilColor = new THREE.Color('#C8A27A').lerp(new THREE.Color('#1C1917'), Math.min(1, soil / 100));

  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#166534" roughness={0.95} />
      </mesh>

      {/* 온실 유리 */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[4.8, 2.8, 4.8]} />
        <meshStandardMaterial color="#38BDF8" transparent opacity={0.15} roughness={0.1} />
      </mesh>

      {/* 환기 돔 (SG90) */}
      <group ref={domeRef} position={[0, 2.8, -2.2]}>
        <mesh position={[0, 0.4, 2.2]}>
          <boxGeometry args={[4.6, 0.1, 4.2]} />
          <meshStandardMaterial color="#67E8F9" transparent opacity={0.35} />
        </mesh>
      </group>

      {/* 화분 + 토양 + 식물 */}
      <group position={[0, 0.35, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.7, 1.6]} />
          <meshStandardMaterial color="#78350F" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[2.6, 0.05, 1.4]} />
          <meshStandardMaterial color={soilColor} roughness={1} />
        </mesh>
        {[-0.9, -0.45, 0, 0.45, 0.9].map((x, i) => (
          <group key={i} position={[x, 0.4, i % 2 === 0 ? 0.25 : -0.25]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.03, 0.04, 0.5]} />
              <meshStandardMaterial color="#15803D" />
            </mesh>
            <mesh position={[0, 0.55, 0]} scale={0.6 + soil / 200}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial color={soil < 35 ? '#A3A33A' : '#22C55E'} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 관수 펌프 (클릭 → 확장 명령) */}
      <group position={[1.9, 0, 1.6]}>
        <mesh
          position={[0, 0.35, 0]}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            sendCommand('water', !pumpOn);
          }}
        >
          <cylinderGeometry args={[0.25, 0.25, 0.7, 20]} />
          <meshStandardMaterial color={pumpOn ? '#0EA5E9' : '#64748B'} emissive={pumpOn ? '#0EA5E9' : '#000000'} emissiveIntensity={0.4} />
        </mesh>
        <mesh ref={waterRef} position={[-0.9, 1.2, -0.8]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* 센서 배지 */}
      {!isModalOpen && (
        <Html position={[0, 1.9, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="flex gap-3 px-3 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/60 text-white text-xs whitespace-nowrap pointer-events-none">
            <span>
              토양 수분 <b className={soil < 35 ? 'text-rose-400' : 'text-emerald-400'}>{soil.toFixed(1)}%</b>
            </span>
            <span>
              온도 <b className="text-blue-400">{temp.toFixed(1)}℃</b>
            </span>
            <span>
              환기 돔 <b className="text-amber-400">{angle}°</b>
            </span>
            <span>
              펌프 <b className={pumpOn ? 'text-sky-400' : 'text-slate-400'}>{pumpOn ? 'ON' : 'OFF'}</b>
            </span>
          </div>
        </Html>
      )}

      {/* 플랫폼 기본 부품: RGB 생장등 · Cds 노드 */}
      <LightObject isModalOpen={isModalOpen} />
      <CdsSensorNode isModalOpen={isModalOpen} />
    </group>
  );
}
