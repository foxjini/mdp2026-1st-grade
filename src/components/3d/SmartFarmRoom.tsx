'use client';

// 기본 예제: 스마트 팜 온실 — 디자인 킷(PALETTE · MAT)으로 정리한 모범 사례
// - 흰색 분체도장 프레임 + 유리벽은 뒤 · 왼쪽에만 (기본 시점 앞-오른쪽은 열어 두어 가리지 않음)
// - 반복 물체(상추 잎 · 자갈 디딤돌)는 <Instances> 로 한 번에 그림
// - SG90 각도 → 지붕 환기창이 뒤쪽 경첩을 축으로 감쇠하며 열림 / 습도 → 흙 색이 젖은 색으로 부드럽게
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useIoTStore } from '@/core/store/useIoTStore';
import { LightObject } from '@/components/3d/LightObject';
import { CdsSensorNode } from '@/components/3d/CdsSensorNode';
import { Html, Instance, Instances, RoundedBox } from '@react-three/drei';
import { MAT, PALETTE, badgeStyle, useSmoothValue } from '@/core/sdk/design';
import { CowFarmer } from './characters';

interface SmartFarmRoomProps {
  isModalOpen?: boolean;
}

const SOIL_DRY = new THREE.Color('#8A6A4F');
const SOIL_WET = new THREE.Color('#4A3627');

// 상추 한 포기 = 잎 5장 (모든 포기를 Instances 한 번으로)
const LETTUCE_ROWS = [-0.95, -0.32, 0.32, 0.95];
const LEAVES: { p: [number, number, number]; r: [number, number, number]; s: number }[] = [];
LETTUCE_ROWS.forEach((x, i) => {
  [-0.32, 0.32].forEach((z, j) => {
    const size = 0.85 + ((i + j) % 3) * 0.12;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      LEAVES.push({
        p: [x + Math.cos(a) * 0.07, 0.1, z + Math.sin(a) * 0.07],
        r: [0.9, a, 0],
        s: size,
      });
    }
  });
});

// 젖소 농부 산책 길: 디딤돌 → 베드 오른쪽 → 베드 뒤 → 되돌아옴 (베드 왼쪽은 선반과 좁아서 지나가지 않음)
const FARM_PATH: [number, number][] = [
  [-0.7, 1.3],
  [0.6, 1.5],
  [1.95, 0.4],
  [1.95, -1.4],
  [0.3, -1.6],
  [1.95, -1.4],
  [1.95, 0.4],
  [0.6, 1.5],
];

export function SmartFarmRoom({ isModalOpen = false }: SmartFarmRoomProps) {
  const domeRef = useRef<THREE.Group>(null);
  const soilMat = useRef<THREE.MeshStandardMaterial>(null);
  const reportedAngle = useIoTStore((s) => s.actuators.sg90_door.reportedAngle);

  // 온습도 센서 및 가상 토양 수분 수치
  const temp = useIoTStore((s) => s.sensors.dht11_temp.value);
  const humi = useIoTStore((s) => s.sensors.dht11_humi.value);
  const soilMoisture = Math.round((humi * 0.9 + 18) * 10) / 10; // 온실 습도 연동 토양 수분
  const moisture = useSmoothValue(soilMoisture, { initial: 60 });

  // SG90 서보모터 각도(0~180도)에 따라 온실 환기창 개폐 각도(0 ~ 55도) 부드럽게 보간
  const domeOpenRad = (Math.min(180, Math.max(0, reportedAngle)) / 180) * 0.95;
  const soilColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (domeRef.current) {
      domeRef.current.rotation.x = THREE.MathUtils.damp(domeRef.current.rotation.x, -domeOpenRad, 5, dt);
    }
    // 토양 수분 40~90% → 마른 흙 ~ 젖은 흙 색
    if (soilMat.current) {
      const k = THREE.MathUtils.clamp((moisture.current - 40) / 50, 0, 1);
      soilColor.copy(SOIL_DRY).lerp(SOIL_WET, k);
      soilMat.current.color.copy(soilColor);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 바닥: 둥근 받침 + 자갈색 바닥 */}
      <RoundedBox args={[6.6, 0.16, 6.6]} radius={0.06} smoothness={4} position={[0, -0.08, 0]} receiveShadow>
        <meshStandardMaterial {...MAT.concrete} color={PALETTE.sand} />
      </RoundedBox>

      {/* 디딤돌 (앞쪽 통로) */}
      <Instances limit={6} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 24]} />
        <meshStandardMaterial {...MAT.concrete} />
        {[[1.2, 2.3], [0.55, 2.05], [-0.1, 1.85], [-0.75, 1.7]].map(([x, z], i) => (
          <Instance key={i} position={[x, 0.015, z]} />
        ))}
      </Instances>

      {/* 2. 온실 유리벽 (뒤 · 왼쪽) + 알루미늄 프레임 */}
      <mesh position={[0, 1.4, -2.4]}>
        <boxGeometry args={[4.8, 2.8, 0.03]} />
        <meshPhysicalMaterial {...MAT.glass} />
      </mesh>
      <mesh position={[-2.4, 1.4, 0]}>
        <boxGeometry args={[0.03, 2.8, 4.8]} />
        <meshPhysicalMaterial {...MAT.glass} />
      </mesh>
      {[
        [-2.4, 1.4, -2.4],
        [2.4, 1.4, -2.4],
        [-2.4, 1.4, 2.4],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.07, 2.8, 0.07]} />
          <meshStandardMaterial {...MAT.matteWhite} />
        </mesh>
      ))}
      {/* 위쪽 가로 프레임 (뒤 · 왼쪽) */}
      <mesh position={[0, 2.8, -2.4]}>
        <boxGeometry args={[4.86, 0.07, 0.07]} />
        <meshStandardMaterial {...MAT.matteWhite} />
      </mesh>
      <mesh position={[-2.4, 2.8, 0]}>
        <boxGeometry args={[0.07, 0.07, 4.86]} />
        <meshStandardMaterial {...MAT.matteWhite} />
      </mesh>

      {/* 3. 지붕 환기창 (SG90 연동 · 뒤쪽 모서리 경첩) */}
      <group ref={domeRef} position={[0, 2.84, -2.4]}>
        <mesh position={[0, 0, 1.2]}>
          <boxGeometry args={[4.7, 0.03, 2.4]} />
          <meshPhysicalMaterial {...MAT.glass} />
        </mesh>
        <mesh position={[0, 0.02, 2.4]}>
          <boxGeometry args={[4.74, 0.05, 0.06]} />
          <meshStandardMaterial {...MAT.matteWhite} />
        </mesh>
      </group>

      {/* 4. 스마트 재배 베드 (주인공) */}
      <group position={[0, 0, -0.2]}>
        <RoundedBox args={[2.8, 0.6, 1.5]} radius={0.05} smoothness={4} position={[0, 0.3, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.oak} />
        </RoundedBox>
        {/* 배양토: 토양 수분에 따라 젖은 색 */}
        <mesh position={[0, 0.61, 0]} receiveShadow>
          <boxGeometry args={[2.62, 0.03, 1.32]} />
          <meshStandardMaterial ref={soilMat} color="#6A4F3A" roughness={1} />
        </mesh>
        {/* 상추 8포기 (잎 40장 = Instances 1번) */}
        <group position={[0, 0.62, 0]}>
          <Instances limit={LEAVES.length} castShadow>
            <sphereGeometry args={[0.13, 12, 8]} />
            <meshStandardMaterial {...MAT.plant} color="#6E9F6B" />
            {LEAVES.map((l, i) => (
              <Instance key={i} position={l.p} rotation={l.r} scale={[l.s, l.s * 0.35, l.s * 0.8]} />
            ))}
          </Instances>
        </group>
        {/* 토양 수분 센서 막대 (확장 센서 위치 표시) */}
        <mesh position={[1.15, 0.78, 0.5]} castShadow>
          <boxGeometry args={[0.04, 0.34, 0.02]} />
          <meshStandardMaterial {...MAT.rubber} />
        </mesh>

        {/* 토양 수분 & 온실 센서 3D 배지 */}
        {!isModalOpen && (
          <Html position={[0, 1.55, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
            {/* 공통 배지 카드 (badgeStyle): 밝은 카드 · 자리 맞춘 숫자 · 줄바꿈 없음 */}
            <div style={{ ...badgeStyle(), pointerEvents: 'none', gap: 4 }} className="select-none">
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: PALETTE.ok, display: 'inline-block' }} />
                스마트팜 온실 센서
              </span>
              <div style={{ display: 'flex', gap: 12, fontVariantNumeric: 'tabular-nums' }}>
                {[
                  ['토양 수분', `${soilMoisture}%`],
                  ['내부 온도', `${temp}℃`],
                  ['환기창', `${reportedAngle}°`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: PALETTE.inkSoft }}>{k}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: PALETTE.ink }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Html>
        )}
      </group>

      {/* 5. 소품: 왼쪽 벽 선반 + 테라코타 화분 3개 · 물뿌리개 */}
      <group position={[-1.95, 0, -1.3]}>
        <RoundedBox args={[0.5, 0.05, 1.4]} radius={0.015} smoothness={3} position={[0, 0.7, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.walnut} />
        </RoundedBox>
        {[-0.45, 0, 0.45].map((z, i) => (
          <group key={i} position={[0, 0.725, z]}>
            <mesh position={[0, 0.09, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.075, 0.18, 20]} />
              <meshStandardMaterial {...MAT.ceramic} color={PALETTE.clay} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.22, 0]} castShadow>
              <sphereGeometry args={[0.1 + i * 0.015, 14, 10]} />
              <meshStandardMaterial {...MAT.plant} />
            </mesh>
          </group>
        ))}
        {[-0.55, 0.55].map((z, i) => (
          <mesh key={i} position={[0, 0.35, z]} castShadow>
            <boxGeometry args={[0.04, 0.7, 0.04]} />
            <meshStandardMaterial {...MAT.walnut} />
          </mesh>
        ))}
      </group>
      <group position={[1.65, 0, 1.0]} rotation={[0, -0.6, 0]}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, 0.28, 24]} />
          <meshStandardMaterial {...MAT.sage} roughness={0.5} />
        </mesh>
        <mesh position={[0.2, 0.22, 0]} rotation={[0, 0, -0.9]} castShadow>
          <cylinderGeometry args={[0.018, 0.025, 0.32, 10]} />
          <meshStandardMaterial {...MAT.sage} roughness={0.5} />
        </mesh>
      </group>

      {/* 6. 마스코트 젖소 농부: 재배 베드 둘레를 천천히 돌며 돌봄, 누르면 손 인사 + 온실 상태 안내 */}
      <CowFarmer
        waypoints={FARM_PATH}
        name="젖소 농부"
        isModalOpen={isModalOpen}
        say={() => `음메! 스마트 팜 온실이에요. 흙의 수분은 ${Math.round(soilMoisture)}퍼센트, 온도는 ${temp.toFixed(1)}도예요.`}
      />

      {/* 7. 스마트팜 조명(식물 생장등) 및 Cds 조도센서 노드 */}
      <LightObject isModalOpen={isModalOpen} />
      <CdsSensorNode isModalOpen={isModalOpen} />
    </group>
  );
}
