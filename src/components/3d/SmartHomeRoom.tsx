'use client';

// 스마트 거실 허브 — 디자인 모범 사례 (부록 B)
// 색: 웜 오프화이트 · 오크 · 세이지 리넨 · 브러시드 메탈, 강조색은 장치 상태 · 데이터에만 (PALETTE)
// 형태: RoundedBox 가구, 반복 물체(마루 · 책 · 잎)는 <Instances> 로 드로우 콜 최소화
// 모션: 감쇠(damp) · HoverLift, 데이터: useSmoothValue 로 끊김 · 튐 완화, 마스코트: 고양이 집사가 거실을 산책 (음성 안내 입모양 · 자막)
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Html, Instance, Instances, RoundedBox } from '@react-three/drei';
import { DoorObject } from './DoorObject';
import { LightObject } from './LightObject';
import { DhtSensorBadge } from './DhtSensorBadge';
import { CdsSensorNode } from './CdsSensorNode';
import { NeedsYouCallout3D } from './NeedsYouCallout3D';
import { CatButler } from './characters';
import { useIoTStore } from '@/core/store/useIoTStore';
import { HoverLift, MAT, PALETTE, badgeStyle, useSmoothValue } from '@/core/sdk/design';

interface SmartHomeRoomProps {
  approvalStatus?: 'pending' | 'approved';
  onApprove?: () => void;
  onReview?: () => void;
  isModalOpen?: boolean;
}

// 마루 이음매 · 책 · 잎 배치 (컴포넌트 밖 상수 → 매 렌더 새로 만들지 않음)
const FLOOR_SEAMS = Array.from({ length: 13 }, (_, i) => -2.6 + i * 0.4333);
const BOOK_COLORS = [PALETTE.sage, PALETTE.clay, PALETTE.sand, PALETTE.linen, '#6E8A99', PALETTE.walnut];
const BOOKS = Array.from({ length: 16 }, (_, i) => {
  const shelf = i < 9 ? 0 : 1;
  const idx = shelf === 0 ? i : i - 9;
  const h = 0.2 + ((i * 37) % 7) * 0.012;
  return {
    position: [-0.42 + idx * 0.075 + (shelf ? 0.12 : 0), (shelf ? 2.18 : 1.73) + h / 2, 0] as [number, number, number],
    scale: [0.055, h, 0.17] as [number, number, number],
    color: BOOK_COLORS[(i * 5) % BOOK_COLORS.length],
    tilt: i === 8 ? -0.25 : 0,
  };
});
const LEAVES = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
  const r = 0.16 + (i % 3) * 0.06;
  return {
    position: [Math.cos(a) * r, 0.72 + (i % 3) * 0.17, Math.sin(a) * r] as [number, number, number],
    // 바깥쪽으로 비스듬히 펼쳐진 잎 (Y 축으로 방향, X 축으로 아래로 처짐)
    rotation: [0, -a, -0.35 - (i % 3) * 0.12] as [number, number, number],
  };
});

// 벽면 스마트 디스플레이: 온도 · 습도 · 조도를 막대로 (useSmoothValue 로 부드럽게, 수신 대기면 마지막 값 유지)
function LiveDisplay({ isModalOpen }: { isModalOpen: boolean }) {
  const temp = useIoTStore((s) => s.sensors.dht11_temp);
  const humi = useIoTStore((s) => s.sensors.dht11_humi);
  const light = useIoTStore((s) => s.sensors.cds_light);
  const t = useSmoothValue(temp.isStale ? null : (temp.value - 15) / 20);
  const h = useSmoothValue(humi.isStale ? null : humi.value / 100);
  const l = useSmoothValue(light.isStale ? null : light.value / 65535);
  const bars = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    [t, h, l].forEach((v, i) => {
      const bar = bars.current[i];
      if (!bar) return;
      const k = THREE.MathUtils.clamp(v.current, 0.04, 1);
      bar.scale.y = k;
      bar.position.y = -0.22 + (0.32 * k) / 2;
    });
  });

  const colors = [PALETTE.clay, PALETTE.info, PALETTE.warn];
  return (
    <group position={[0.68, 1.62, -2.66]} scale={0.85}>
      <RoundedBox args={[1.0, 0.62, 0.04]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial {...MAT.rubber} />
      </RoundedBox>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[0.92, 0.54]} />
        <meshStandardMaterial color="#12171C" roughness={0.3} emissive="#1B2733" emissiveIntensity={0.6} />
      </mesh>
      {colors.map((c, i) => (
        <mesh key={c} ref={(m) => {
            bars.current[i] = m;
          }} position={[-0.22 + i * 0.22, 0, 0.03]}>
          <boxGeometry args={[0.1, 0.32, 0.01]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.15} roughness={0.4} />
        </mesh>
      ))}
      {!isModalOpen && (
        <Html position={[0, 0.19, 0.03]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div style={{ pointerEvents: 'none', display: 'flex', gap: 8, fontSize: 8, fontWeight: 700, color: '#C9D3DD', whiteSpace: 'nowrap' }}>
            {['온도', '습도', '조도'].map((name, i) => (
              <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: colors[i], display: 'inline-block' }} />
                {name}
              </span>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
}

// 미팅 테이블 위 Pico 2 W 허브: 연결 상태를 표시등 색 + 글자로
function PicoHub({ isModalOpen }: { isModalOpen: boolean }) {
  const mode = useIoTStore((s) => s.mode);
  const conn = useIoTStore((s) => s.connectionState);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  const [color, text] =
    mode === 'simulation'
      ? [PALETTE.info, '시뮬레이션']
      : conn === 'connected'
        ? [PALETTE.ok, '연결됨']
        : conn === 'connecting'
          ? [PALETTE.warn, '연결 중']
          : [PALETTE.alert, '응답 없음'];

  useFrame(({ clock }) => {
    // 연결 문제일 때만 천천히 숨쉬듯 (평소에는 고정 → 시선 분산 방지)
    if (ring.current) ring.current.emissiveIntensity = conn === 'error' && mode === 'hardware' ? 1.4 + Math.sin(clock.elapsedTime * 3) * 0.8 : 1.6;
  });

  return (
    <HoverLift position={[0, 0.77, 0]} onClick={() => useIoTStore.getState().setSelectedDevice(null)} lift={0.03}>
      <RoundedBox args={[0.26, 0.07, 0.18]} radius={0.03} smoothness={4} position={[0, 0.035, 0]} castShadow>
        <meshStandardMaterial {...MAT.rubber} />
      </RoundedBox>
      <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.035, 0.05, 32]} />
        <meshStandardMaterial ref={ring} color={color} emissive={color} emissiveIntensity={1.6} />
      </mesh>
      {!isModalOpen && (
        <Html position={[0, 0.24, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div style={{ ...badgeStyle(), pointerEvents: 'none', flexDirection: 'row', alignItems: 'center', gap: 6, padding: '4px 9px' }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 800 }}>Pico 2 W</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: PALETTE.inkSoft }}>{text}</span>
          </div>
        </Html>
      )}
    </HoverLift>
  );
}

// 고양이 집사 산책 길 (테이블 r 0.65 · 소파 · 데스크 · 화분을 피한 통로, 순서대로 돌며 왔던 길로 되돌아감)
// (첫 점에서 시작: 처음 화면의 승인 말풍선에 가리지 않는 소파 앞쪽)
const HOME_PATH: [number, number][] = [
  [-1.4, 2.2],
  [1.3, 2.25],
  [1.5, 0.4],
  [1.3, 2.25],
  [-1.4, 2.2],
  [-1.65, 0.4],
  [-1.7, -1.3],
  [-0.6, -1.35],
  [-1.7, -1.3],
  [-1.65, 0.4],
];

export function SmartHomeRoom({
  approvalStatus = 'pending',
  onApprove = () => {},
  onReview = () => {},
  isModalOpen = false,
}: SmartHomeRoomProps) {
  const sensors = useIoTStore((s) => s.sensors);
  const sunBeam = useMemo(() => new THREE.Color('#FFF1D6'), []);

  // 고양이 집사를 누르면 지금 상태를 음성 · 자막으로 안내 (MascotBase 가 say 를 읽음)
  const greet = () => {
    const t = sensors.dht11_temp;
    const h = sensors.dht11_humi;
    return t.isStale
      ? '안녕하세요, 스마트 거실 허브입니다. 지금은 센서 값을 기다리는 중입니다.'
      : `안녕하세요, 스마트 거실 허브입니다. 지금 온도는 ${t.value.toFixed(1)}도, 습도는 ${h.value.toFixed(0)}퍼센트입니다.`;
  };

  return (
    <group position={[0, 0, 0]}>
      {/* 0. 플로팅 페데스탈 베이스 */}
      <RoundedBox args={[5.9, 0.28, 5.9]} radius={0.06} smoothness={3} position={[0, -0.15, 0]} receiveShadow castShadow>
        <meshStandardMaterial {...MAT.matteWhite} />
      </RoundedBox>

      {/* 1. 오크 마루 + 이음매 (Instances: 13개를 드로우 콜 1번) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[5.6, 5.6]} />
        <meshStandardMaterial {...MAT.oak} />
      </mesh>
      <Instances limit={FLOOR_SEAMS.length} position={[0, 0.012, 0]}>
        <boxGeometry args={[0.006, 0.002, 5.6]} />
        <meshStandardMaterial color="#A8845E" roughness={0.8} />
        {FLOOR_SEAMS.map((x) => (
          <Instance key={x} position={[x, 0, 0]} />
        ))}
      </Instances>

      {/* 러그 (리넨 + 샌드 테두리) */}
      <RoundedBox args={[3.3, 0.014, 2.5]} radius={0.007} smoothness={2} position={[0.15, 0.018, 0.55]} receiveShadow>
        <meshStandardMaterial color={PALETTE.sand} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[3.1, 0.016, 2.3]} radius={0.008} smoothness={2} position={[0.15, 0.02, 0.55]} receiveShadow>
        <meshStandardMaterial {...MAT.linen} />
      </RoundedBox>

      {/* 2. 뒷벽 · 좌측 벽 (플라스터) + 걸레받이 */}
      <mesh position={[0, 1.5, -2.75]} receiveShadow>
        <boxGeometry args={[5.6, 3.0, 0.1]} />
        <meshStandardMaterial {...MAT.plaster} />
      </mesh>
      <mesh position={[0, 0.07, -2.69]} receiveShadow>
        <boxGeometry args={[5.6, 0.12, 0.03]} />
        <meshStandardMaterial color={PALETTE.trim} roughness={0.7} />
      </mesh>
      {/* 좌측 벽 (도어 개구부 z: 0.58 ~ 1.82 비움) */}
      <mesh position={[-2.75, 1.5, -1.08]} receiveShadow>
        <boxGeometry args={[0.1, 3.0, 3.33]} />
        <meshStandardMaterial color={PALETTE.wallShade} roughness={0.92} />
      </mesh>
      <mesh position={[-2.75, 2.75, 1.2]} receiveShadow>
        <boxGeometry args={[0.1, 0.5, 1.24]} />
        <meshStandardMaterial color={PALETTE.wallShade} roughness={0.92} />
      </mesh>
      <mesh position={[-2.75, 1.5, 2.31]} receiveShadow>
        <boxGeometry args={[0.1, 3.0, 0.98]} />
        <meshStandardMaterial color={PALETTE.wallShade} roughness={0.92} />
      </mesh>

      {/* 3. 통유리창: 하늘빛 + 유리 + 얇은 프레임, 창가에서 들어오는 빛 줄기 */}
      <group position={[-0.8, 1.75, -2.7]}>
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[1.6, 1.15]} />
          <meshStandardMaterial color="#DCEBF5" emissive="#DCEBF5" emissiveIntensity={0.55} roughness={1} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.6, 1.15]} />
          <meshPhysicalMaterial {...MAT.glass} />
        </mesh>
        {[
          [0, 0.6, 1.7, 0.05],
          [0, -0.6, 1.7, 0.05],
          [-0.82, 0, 0.05, 1.25],
          [0.82, 0, 0.05, 1.25],
          [0, 0, 0.03, 1.15],
        ].map(([x, y, w, hgt], i) => (
          <mesh key={i} position={[x, y, 0.03]}>
            <boxGeometry args={[w, hgt, 0.04]} />
            <meshStandardMaterial {...MAT.matteWhite} />
          </mesh>
        ))}
      </group>
      <mesh position={[-0.8, 1.0, -1.6]} rotation={[-0.75, 0, 0]}>
        <planeGeometry args={[1.5, 2.2]} />
        <meshBasicMaterial color={sunBeam} transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* 4. 창가 선반 (Cds 조도 센서 위치) */}
      <RoundedBox args={[1.3, 0.05, 0.45]} radius={0.015} smoothness={3} position={[-0.8, 0.98, -2.1]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.oak} />
      </RoundedBox>
      {[-1.3, -0.3].map((x) => (
        <mesh key={x} position={[x, 0.75, -2.2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.45]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
      ))}

      {/* 5. 벽걸이 선반 + 책 (Instances) */}
      <group position={[1.7, 0, -2.58]}>
        {[1.72, 2.17].map((y) => (
          <RoundedBox key={y} args={[1.0, 0.035, 0.22]} radius={0.01} smoothness={2} position={[0, y, 0]} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.walnut} />
          </RoundedBox>
        ))}
        <Instances limit={BOOKS.length}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.85} />
          {BOOKS.map((b, i) => (
            <Instance key={i} position={b.position} scale={b.scale} color={b.color} rotation={[0, 0, b.tilt]} />
          ))}
        </Instances>
      </group>

      {/* 6. 벽면 스마트 디스플레이 (실시간 데이터 막대) */}
      <LiveDisplay isModalOpen={isModalOpen} />

      {/* 7. 오크 데스크 (DHT11 위치) + 노트북 + 작은 화분 */}
      <group position={[1.65, 0, -1.2]}>
        <RoundedBox args={[1.4, 0.05, 0.8]} radius={0.02} smoothness={3} position={[0, 0.85, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.oak} />
        </RoundedBox>
        {[[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].map(([dx, dz], idx) => (
          <mesh key={idx} position={[dx, 0.42, dz]} castShadow>
            <cylinderGeometry args={[0.016, 0.016, 0.84, 12]} />
            <meshStandardMaterial {...MAT.brushedMetal} />
          </mesh>
        ))}
        <group position={[-0.25, 0.875, 0.05]} rotation={[0, 0.25, 0]}>
          <RoundedBox args={[0.42, 0.015, 0.3]} radius={0.006} smoothness={2} castShadow>
            <meshStandardMaterial {...MAT.brushedMetal} />
          </RoundedBox>
          <group position={[0, 0.01, -0.15]} rotation={[-0.35, 0, 0]}>
            <RoundedBox args={[0.42, 0.28, 0.012]} radius={0.006} smoothness={2} position={[0, 0.14, 0]} castShadow>
              <meshStandardMaterial {...MAT.brushedMetal} />
            </RoundedBox>
            <mesh position={[0, 0.14, 0.007]}>
              <planeGeometry args={[0.38, 0.24]} />
              <meshStandardMaterial {...MAT.screen('#7FA7D9')} />
            </mesh>
          </group>
        </group>
        <group position={[0.5, 0.875, -0.22]}>
          <mesh castShadow position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.07, 0.055, 0.12, 24]} />
            <meshStandardMaterial {...MAT.ceramic} />
          </mesh>
          {[0, 1.3, 2.6, 3.9, 5.2].map((a) => (
            <mesh key={a} position={[Math.cos(a) * 0.04, 0.18, Math.sin(a) * 0.04]} rotation={[0.5 * Math.cos(a), a, 0.5 * Math.sin(a)]} scale={[1, 0.35, 0.6]} castShadow>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial {...MAT.plant} />
            </mesh>
          ))}
        </group>
      </group>

      {/* 8. 라운드 미팅 테이블 + Pico 2 W 허브 */}
      <group position={[0.2, 0, -0.2]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.65, 0.65, 0.035, 48]} />
          <meshStandardMaterial {...MAT.ceramic} />
        </mesh>
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 0.74, 24]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.32, 0.34, 0.025, 32]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
        <PicoHub isModalOpen={isModalOpen} />
      </group>

      {/* 9. 세이지 리넨 소파 (RoundedBox) + 쿠션 + 월넛 다리 */}
      <group position={[0, 0, 1.4]}>
        <RoundedBox args={[1.9, 0.26, 0.85]} radius={0.08} smoothness={4} position={[0, 0.33, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.sage} />
        </RoundedBox>
        <RoundedBox args={[1.9, 0.46, 0.22]} radius={0.09} smoothness={4} position={[0, 0.66, 0.32]} castShadow receiveShadow>
          <meshStandardMaterial {...MAT.sage} />
        </RoundedBox>
        {[-0.97, 0.97].map((x) => (
          <RoundedBox key={x} args={[0.18, 0.42, 0.85]} radius={0.08} smoothness={4} position={[x, 0.48, 0.02]} castShadow receiveShadow>
            <meshStandardMaterial {...MAT.sage} />
          </RoundedBox>
        ))}
        {[-0.45, 0.45].map((x) => (
          <RoundedBox key={x} args={[0.78, 0.1, 0.62]} radius={0.05} smoothness={4} position={[x, 0.5, -0.04]} castShadow receiveShadow>
            <meshStandardMaterial color="#9DB4A7" roughness={0.95} />
          </RoundedBox>
        ))}
        <RoundedBox args={[0.42, 0.38, 0.12]} radius={0.05} smoothness={4} position={[-0.55, 0.72, 0.15]} rotation={[-0.25, 0.15, 0.08]} castShadow>
          <meshStandardMaterial color={PALETTE.clay} roughness={0.95} />
        </RoundedBox>
        <RoundedBox args={[0.38, 0.34, 0.12]} radius={0.05} smoothness={4} position={[0.6, 0.7, 0.16]} rotation={[-0.25, -0.2, -0.06]} castShadow>
          <meshStandardMaterial color={PALETTE.sand} roughness={0.95} />
        </RoundedBox>
        {[[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]].map(([sx, sz], i) => (
          <mesh key={i} position={[sx, 0.1, sz]} castShadow>
            <cylinderGeometry args={[0.022, 0.016, 0.2, 12]} />
            <meshStandardMaterial {...MAT.walnut} />
          </mesh>
        ))}
      </group>

      {/* 10. 몬스테라 화분 (잎 9장 Instances) */}
      <group position={[2.1, 0, 1.8]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.17, 0.5, 32]} />
          <meshStandardMaterial {...MAT.ceramic} />
        </mesh>
        <mesh position={[0, 0.505, 0]}>
          <cylinderGeometry args={[0.19, 0.19, 0.01, 24]} />
          <meshStandardMaterial color="#5B4636" roughness={1} />
        </mesh>
        <Instances limit={LEAVES.length}>
          <sphereGeometry args={[0.17, 16, 12]} />
          <meshStandardMaterial {...MAT.plant} side={THREE.DoubleSide} />
          {LEAVES.map((leaf, i) => (
            <Instance key={i} position={leaf.position} rotation={leaf.rotation} scale={[0.62, 0.06, 1.05]} />
          ))}
        </Instances>
      </group>

      {/* 11. 하드웨어 연동 장치 4종 */}
      <DoorObject isModalOpen={isModalOpen} />
      <LightObject isModalOpen={isModalOpen} />
      <DhtSensorBadge isModalOpen={isModalOpen} />
      <CdsSensorNode isModalOpen={isModalOpen} />

      {/* 12. 마스코트 고양이 집사: 거실을 천천히 산책, 누르면 멈춰서 손 인사 + 지금 상태 안내 */}
      <CatButler waypoints={HOME_PATH} name="고양이 집사" say={greet} isModalOpen={isModalOpen} />

      {/* 13. 3D 승인 말풍선 */}
      <NeedsYouCallout3D approvalStatus={approvalStatus} onApprove={onApprove} onReview={onReview} isModalOpen={isModalOpen} />

      {/* 바닥 접촉 그림자 (한 번만 굽기 → 가벼움): 물체가 바닥에 붙어 보이게 */}
      <ContactShadows position={[0, 0.013, 0]} scale={6} resolution={512} blur={2.6} opacity={0.32} far={2.5} frames={1} color="#3B2F25" />
    </group>
  );
}
