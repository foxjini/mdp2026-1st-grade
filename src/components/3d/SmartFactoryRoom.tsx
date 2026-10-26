'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useIoTStore } from '@/core/store/useIoTStore';
import { LightObject } from '@/components/3d/LightObject';
import { CdsSensorNode } from '@/components/3d/CdsSensorNode';
import { Html } from '@react-three/drei';
import { PALETTE, badgeStyle } from '@/core/sdk/design';

interface SmartFactoryRoomProps {
  isModalOpen?: boolean;
}

// 분류 게이트 (SG90): 0° = 닫힘(블레이드가 뒤쪽 레일과 나란히 → 통과), 90° 이상 = 분류(벨트를 45° 로 가로질러 앞쪽 수거함으로)
const GATE_PIVOT = { x: 0.2, z: -0.52 }; // 컨베이어 기준 좌표
const BLADE_LEN = 1.25;
const GATE_OPEN_DEG = 30; // 이 각도 이상이면 분류
const gateYaw = (deg: number) => Math.PI / 2 - THREE.MathUtils.clamp(deg / 90, 0, 1) * (Math.PI / 4);

const BELT_START = -2.6;
const BELT_END = 2.6;
const BELT_Y = 0.28;
const SPEED = 1.2;
const BIN = { x: 1.05, z: 1.15, y: -0.02 }; // 수거함 바닥 (컨베이어 기준 좌표)

type BoxPhase = 'belt' | 'divert' | 'fall' | 'binned';
interface BoxState {
  phase: BoxPhase;
  vy: number;
  timer: number;
}

export function SmartFactoryRoom({ isModalOpen = false }: SmartFactoryRoomProps) {
  const pusherArmRef = useRef<THREE.Group>(null);
  const box1Ref = useRef<THREE.Mesh>(null);
  const box2Ref = useRef<THREE.Mesh>(null);
  const box3Ref = useRef<THREE.Mesh>(null);
  const boxRefs = [box1Ref, box2Ref, box3Ref];
  const boxStates = useRef<BoxState[]>([0, 1, 2].map(() => ({ phase: 'belt', vy: 0, timer: 0 })));
  const [sortedCount, setSortedCount] = useState(0);
  const armReady = useRef(false);

  const reportedAngle = useIoTStore((s) => s.actuators.sg90_door.reportedAngle);
  const rgbColor = useIoTStore((s) => s.actuators.rgb_light.reportedColor) || '#10B981';
  const rgbState = useIoTStore((s) => s.actuators.rgb_light.reportedState);
  const isLightOn = rgbState === 'ON';

  const temp = useIoTStore((s) => s.sensors.dht11_temp.value);
  const lightVal = useIoTStore((s) => s.sensors.cds_light.value);

  const gateOpen = reportedAngle >= GATE_OPEN_DEG;
  const targetYaw = gateYaw(reportedAngle);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    // 1. 분류 게이트 블레이드: 서보 각도로 부드럽게 회전
    const arm = pusherArmRef.current;
    if (arm && !armReady.current) {
      arm.rotation.y = targetYaw; // 처음에는 현재 각도에서 시작 (벨트를 쓸고 지나가지 않게)
      armReady.current = true;
    }
    if (arm) arm.rotation.y = THREE.MathUtils.damp(arm.rotation.y, targetYaw, 8, dt);
    const yaw = arm ? arm.rotation.y : Math.PI / 2;
    // 블레이드가 실제로 벨트를 가로질렀을 때만 분류 (돌아가는 중에 박스가 관통하지 않게)
    const diverting = gateOpen && yaw < Math.PI / 2 - 0.5;
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);

    // 2. 박스: 벨트 이동 → (게이트 열림) 블레이드를 따라 밀려남 → 수거함으로 떨어짐 → 잠시 뒤 벨트 처음에서 다시
    boxRefs.forEach((ref, i) => {
      const box = ref.current;
      const st = boxStates.current[i];
      if (!box) return;
      const p = box.position;
      if (st.phase === 'belt') {
        p.x += SPEED * dt;
        if (diverting && dirZ > 0.05) {
          // 박스 뒤쪽 면(z = -0.21)에서 블레이드가 지나는 x 에 박스 앞면이 닿으면 분류 시작
          const t = (-0.21 - GATE_PIVOT.z) / dirZ;
          const contactX = GATE_PIVOT.x + t * dirX;
          if (t > 0 && t < BLADE_LEN && p.x + 0.21 >= contactX && p.x < contactX + 0.4) st.phase = 'divert';
        }
        if (p.x > BELT_END) p.x = BELT_START; // 정상품: 끝까지 가서 다시 처음으로
      } else if (st.phase === 'divert') {
        // 블레이드 면을 따라 대각선으로 미끄러짐
        p.x += 0.707 * SPEED * dt;
        p.z += 0.707 * SPEED * dt * 1.2;
        box.rotation.y = THREE.MathUtils.damp(box.rotation.y, -Math.PI / 4, 6, dt);
        if (p.z > 0.55) {
          st.phase = 'fall';
          st.vy = 0;
        }
      } else if (st.phase === 'fall') {
        // 수거함 쪽으로 이동하며 중력처럼 떨어짐
        p.x = THREE.MathUtils.damp(p.x, BIN.x + (i - 1) * 0.22, 6, dt);
        p.z = THREE.MathUtils.damp(p.z, BIN.z, 6, dt);
        st.vy -= 9.8 * dt;
        p.y += st.vy * dt;
        if (p.y <= BIN.y) {
          p.y = BIN.y;
          st.phase = 'binned';
          st.timer = 1.2;
          setSortedCount((n) => n + 1); // 수거함에 들어갈 때 한 번만
        }
      } else if (st.phase === 'binned') {
        st.timer -= dt;
        // 벨트 처음이 비어 있을 때 다시 출발 (다른 박스와 1.2 이상 간격)
        const clear = boxRefs.every((r, j) => {
          if (j === i || !r.current || boxStates.current[j].phase !== 'belt') return true;
          return r.current.position.x - BELT_START > 1.2;
        });
        if (st.timer <= 0 && clear) {
          p.set(BELT_START, BELT_Y, 0);
          box.rotation.y = 0;
          st.phase = 'belt';
        }
      }
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 산업용 에폭시 콘크리트 바닥 (Industrial Epoxy Floor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[7.5, 7.5]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* 노란색/검은색 안전 경계 구역 (Safety Hazard Lines) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[2.8, 3.0, 32]} />
        <meshBasicMaterial color="#EAB308" />
      </mesh>

      {/* 2. 공장 철골 H-Beam 기둥 (기본 시점의 시선 위에 놓이는 뒤-왼쪽 · 앞-오른쪽 기둥은 화면 한가운데를 가려서 뺌) */}
      {[
        [3.2, 1.8, -3.2],
        [-3.2, 1.8, 3.2],
      ].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 3.6, 0.2]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[0.35, 0.1, 0.35]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* 3. 자동화 컨베이어 벨트 라인 (Automated Conveyor Belt Line) */}
      <group position={[0, 0.6, 0]}>
        {/* 컨베이어 본체 프레임 (금속 레일) */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.6, 0.22, 0.9]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* 컨베이어 고무 벨트 트랙 */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <boxGeometry args={[5.4, 0.04, 0.75]} />
          <meshStandardMaterial color="#0F172A" roughness={0.9} />
        </mesh>

        {/* 컨베이어 양쪽 알루미늄 가이드 레일 */}
        <mesh position={[0, 0.22, 0.42]}>
          <boxGeometry args={[5.5, 0.16, 0.05]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.22, -0.42]}>
          <boxGeometry args={[5.5, 0.16, 0.05]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* 컨베이어 지지 다리 4개 */}
        {[-2.2, -0.8, 0.8, 2.2].map((x, idx) => (
          <group key={idx} position={[x, -0.35, 0]}>
            <mesh position={[0, 0, 0.35]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.55]} />
              <meshStandardMaterial color="#64748B" metalness={0.6} />
            </mesh>
            <mesh position={[0, 0, -0.35]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.55]} />
              <meshStandardMaterial color="#64748B" metalness={0.6} />
            </mesh>
          </group>
        ))}

        {/* 컨베이어 구동 모터 유닛 (DHT11 발열 감지 대상) */}
        <group position={[2.9, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.45, 0.6]} />
            <meshStandardMaterial color="#1E293B" metalness={0.6} />
          </mesh>
          {/* 모터 팬 환기구 */}
          <mesh position={[0.23, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.05]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>

        {/* 이동하는 작업물/박스 3개 */}
        <mesh ref={box1Ref} position={[-2.2, 0.28, 0]} castShadow>
          <boxGeometry args={[0.42, 0.3, 0.42]} />
          <meshStandardMaterial color="#D97706" roughness={0.7} />
        </mesh>
        <mesh ref={box2Ref} position={[-0.6, 0.28, 0]} castShadow>
          <boxGeometry args={[0.45, 0.32, 0.42]} />
          <meshStandardMaterial color="#2563EB" roughness={0.5} />
        </mesh>
        <mesh ref={box3Ref} position={[1.0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.4, 0.28, 0.4]} />
          <meshStandardMaterial color="#059669" roughness={0.6} />
        </mesh>
      </group>

      {/* 4. SG90 서보모터: 품질 분류 게이트 (0° 닫힘 = 통과 / 90° 열림 = 앞쪽 수거함으로 분류) */}
      <group position={[0.2, 0.82, -0.52]}>
        {/* 서보모터 마운트 기둥 */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.35]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} />
        </mesh>

        {/* 회전하는 푸셔 암 (서보 연동) */}
        <group ref={pusherArmRef} position={[0, 0.05, 0]}>
          {/* 푸셔 회전축 */}
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.12]} />
            <meshStandardMaterial color="#EF4444" roughness={0.4} />
          </mesh>
          {/* 분류 가이드 블레이드 */}
          <mesh position={[0, 0, BLADE_LEN / 2]} castShadow>
            <boxGeometry args={[0.06, 0.14, BLADE_LEN]} />
            <meshStandardMaterial color="#F97316" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* 끝단 고무 범퍼 */}
          <mesh position={[0, 0, BLADE_LEN]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        </group>
      </group>

      {/* 5. 불량품 분류 수거함 (Side Defect Bin & Pallet) */}
      <group position={[BIN.x, 0.3, BIN.z]}>
        {/* 나무 파렛트 */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[1.1, 0.1, 0.9]} />
          <meshStandardMaterial color="#B45309" roughness={0.8} />
        </mesh>
        {/* 수거 바구니 (위가 열려 있어 분류된 박스가 보임) */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <boxGeometry args={[0.9, 0.04, 0.75]} />
          <meshStandardMaterial color="#DC2626" roughness={0.5} />
        </mesh>
        {[
          [0, 0.27, 0.355, 0.9, 0.3, 0.04],
          [0, 0.27, -0.355, 0.9, 0.3, 0.04],
          [0.43, 0.27, 0, 0.04, 0.3, 0.75],
          [-0.43, 0.27, 0, 0.04, 0.3, 0.75],
        ].map(([x, y, z, w, h, d], idx) => (
          <mesh key={idx} position={[x, y, z]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#DC2626" roughness={0.5} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>

      {/* 6. RGB LED: 3색 산업용 타워 램프 (Industrial Signal Tower Light / Stack Light) */}
      <group position={[-2.4, 0.6, -0.8]}>
        {/* 타워 램프 폴대 */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.4]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} />
        </mesh>
        {/* 램프 베이스 */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>

        {/* 3단 램프 섹션 (적 / 황 / 녹) */}
        {/* 상단: 적색 (경고/불량) */}
        <mesh position={[0, 1.72, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.14]} />
          <meshStandardMaterial
            color="#EF4444"
            emissive={isLightOn && rgbColor.toLowerCase().includes('ef') ? '#EF4444' : '#500'}
            emissiveIntensity={isLightOn && rgbColor.toLowerCase().includes('ef') ? 1.5 : 0.2}
            roughness={0.2}
          />
        </mesh>
        {/* 중단: 황색 (대기/검사) */}
        <mesh position={[0, 1.56, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.14]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive={isLightOn && rgbColor.toLowerCase().includes('f5') ? '#F59E0B' : '#530'}
            emissiveIntensity={isLightOn && rgbColor.toLowerCase().includes('f5') ? 1.5 : 0.2}
            roughness={0.2}
          />
        </mesh>
        {/* 하단: 녹색/동적 색상 (가동/정상) */}
        <mesh position={[0, 1.42, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.14]} />
          <meshStandardMaterial
            color={isLightOn ? rgbColor : '#10B981'}
            emissive={isLightOn ? rgbColor : '#000'}
            emissiveIntensity={isLightOn ? 1.8 : 0.1}
            roughness={0.2}
          />
        </mesh>
        {isLightOn && (
          <pointLight position={[0, 1.5, 0]} color={rgbColor} intensity={1.5} distance={4} />
        )}
      </group>

      {/* 7. 광전 물품 센서 (Cds 센서 매핑 & 빔 효과) */}
      <group position={[-1.0, 0.85, 0]}>
        {/* 센서 투광기 */}
        <mesh position={[0, 0, -0.42]}>
          <boxGeometry args={[0.08, 0.08, 0.1]} />
          <meshStandardMaterial color="#0284C7" />
        </mesh>
        {/* 센서 수광기 */}
        <mesh position={[0, 0, 0.42]}>
          <boxGeometry args={[0.08, 0.08, 0.1]} />
          <meshStandardMaterial color="#0284C7" />
        </mesh>
        {/* 적외선 광선 빔 라인 */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.8]} />
          <meshBasicMaterial color="#EF4444" transparent opacity={0.65} />
        </mesh>
      </group>

      {/* 8. 3D 플로팅 스마트 팩토리 실시간 관제 배지 */}
      {!isModalOpen && (
        <Html position={[2.2, 2.3, -1.2]} center distanceFactor={8} zIndexRange={[10, 0]}>
          {/* 공통 배지 카드 (badgeStyle): 밝은 카드 · 자리 맞춘 숫자 · 줄바꿈 없음 */}
          <div style={{ ...badgeStyle(), pointerEvents: 'none', gap: 4 }} className="select-none">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft }}>스마트 팩토리 공정 #1</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: isLightOn ? PALETTE.ok : PALETTE.off, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: isLightOn ? PALETTE.ok : PALETTE.off, display: 'inline-block' }} />
                {isLightOn ? '가동 중' : '대기'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 14, rowGap: 2, fontVariantNumeric: 'tabular-nums' }}>
              {[
                ['모터 온도', `${temp}℃`],
                ['분류 게이트', gateOpen ? `열림 ${reportedAngle}°` : '닫힘 (통과)'],
                ['분류됨', `${sortedCount}개`],
                ['광전 센서', `${Number(lightVal).toLocaleString('ko-KR')} ADC`],
                ['시그널 타워', isLightOn ? '켜짐' : '꺼짐'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: PALETTE.inkSoft }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: PALETTE.ink }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Html>
      )}

      {/* 기존 조명 및 Cds 센서 노드 결합 */}
      <LightObject isModalOpen={isModalOpen} />
      <CdsSensorNode isModalOpen={isModalOpen} />
    </group>
  );
}
