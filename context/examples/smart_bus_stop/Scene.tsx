// Scene.tsx — 스마트 버스정류장 쉼터 (v3: '와!' 순간 + 마스코트)
// · DHT11 기온 22℃ 미만 → 정류장 앞으로 눈이 내리고 기온 배지가 '추움'
// · RGB LED → 가로등 구가 그 색으로 빛남 (bus_eta 1 이하이면 1초 간격 깜빡임)
// · person(PIR) → 앞 기둥의 감지 표시등이 켜짐
// · heater → 벤치 열선 방석이 빛나고 그 위로 열기 구슬이 피어오름 / 벤치 클릭 → sendCommand('heater', true)
// · 버스는 도로 왼쪽 끝에서 대기 → bus_eta 가 0 이 되면 정류장 앞에 5초 정차 → 오른쪽으로 떠난 뒤 다음 버스가 다시 대기
// · [와! ①] heater 가 0 → 1 이 되는 순간: 벤치 아래 바닥에 따뜻한 빛 고리가 한 번 퍼짐 (1.0초)
// · [와! ②] bus_eta 가 1 이하로 바뀌는 순간: 정류장 표지판이 초록으로 한 번 은은하게 빛나고 발밑에 고리가 퍼짐 (0.8초)
// · 교복 학생 마스코트가 정류장 앞 인도를 천천히 걸어 다님
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox, Instances, Instance } from '@react-three/drei';
import {
  useSensor,
  useCustomSensor,
  useCustomValue,
  useRgb,
  sendCommand,
  MAT,
  PALETTE,
  DataPin,
  HoverLift,
  usePrefersReducedMotion,
} from '@/core/sdk';
import { StudentChibi } from '@/components/3d/characters';

const COLD_C = 22;

// 배치 (1 = 1 m, 바닥 약 7 × 7)
const ROAD_Z = 2.3; //   도로: z 1.3 ~ 3.3
const CURB_Z = 1.3;
const SIDEWALK_Z = -1.0; // 인도: z -3.3 ~ 1.3
const SHELTER_Z = -1.6;
const BENCH_X = 0.45;
const BENCH_Z = -1.95;
const SIGN_X = -2.6;
const SIGN_Z = 0.9;

// 버스: 도로 왼쪽 끝 대기 → 정류장 앞 정차 → 오른쪽으로 출발
const BUS_WAIT_X = -2.1;
const BUS_STOP_X = 0.4;
const BUS_GONE_X = 6;
const BUS_RETURN_X = -7;
const ARRIVE_SEC = 2.5;
const STOP_SEC = 5;
const LEAVE_SEC = 3;

// '와!' 연출 길이 (초)
const HEAT_PULSE_SEC = 1.0;
const BUS_PULSE_SEC = 0.8;

// 마스코트 산책로: 정류장 앞 인도 (기둥 · 표지판 · 가로등에서 0.6 m 이상 떨어짐)
const WALK_PATH: [number, number][] = [
  [-1.8, 0.2],
  [1.9, 0.2],
];

// 열기 구슬 10개: 열선 방석 바로 위에서 좁게 피어오름
const HEAT_BEADS = Array.from({ length: 10 }, (_, i) => ({
  x: BENCH_X - 0.72 + (i % 5) * 0.36,
  z: BENCH_Z + (i < 5 ? -0.05 : 0.07),
  offset: i / 10,
}));

// 눈송이 20개: 지붕 앞 열린 공간(인도 앞쪽 · 도로)에만
const SNOW = Array.from({ length: 20 }, (_, i) => ({
  x: -3.1 + (((i * 37) % 20) / 19) * 6.2,
  z: -0.5 + (((i * 53) % 20) / 19) * 3.6,
  speed: 0.25 + (i % 5) * 0.04,
  offset: ((i * 7) % 20) / 20,
}));

// 감속하며 끝나는 보간 (튕김 없음)
function easeOut(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const busRef = useRef<THREE.Group>(null);
  const busStartRef = useRef(-1);
  const prevEtaRef = useRef(10);
  const padMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lampMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lampLightRef = useRef<THREE.PointLight>(null);
  const signMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const heatRingRef = useRef<THREE.Mesh>(null);
  const heatRingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const busRingRef = useRef<THREE.Mesh>(null);
  const busRingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const heatRefs = useRef<(THREE.Object3D | null)[]>([]);
  const snowRefs = useRef<(THREE.Object3D | null)[]>([]);
  const heatVis = useRef(0);
  const snowVis = useRef(0);

  // '와!' 연출 상태: 직전 값(null = 아직 첫 프레임 전) · 시작 시각(-1 = 쉬는 중)
  const prevHeaterRef = useRef<boolean | null>(null);
  const prevSoonRef = useRef<boolean | null>(null);
  const heatPulseStart = useRef(-1);
  const busPulseStart = useRef(-1);

  const reduced = usePrefersReducedMotion();
  const tempSensor = useSensor('dht11_temp');
  const etaSensor = useCustomSensor('bus_eta');
  const eta = useCustomValue('bus_eta', 10);
  const person = useCustomValue('person', 0) > 0.5;
  const heaterOn = useCustomValue('heater', 0) > 0.5;
  const { color: rgbColor, on: rgbOn } = useRgb();

  const cold = tempSensor.value < COLD_C;
  const soon = eta <= 1;

  // 가로등 구 = 팀이 정한 RGB LED 색 그대로
  const lampGlow = MAT.glow(rgbColor, rgbOn);
  const glowIntensity = (lampGlow as { emissiveIntensity?: number }).emissiveIntensity;
  const lampIntensity = typeof glowIntensity === 'number' ? glowIntensity : 1;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // ① 버스
    if (eta <= 0 && prevEtaRef.current > 0 && busStartRef.current < 0) busStartRef.current = t;
    prevEtaRef.current = eta;
    const bus = busRef.current;
    if (bus) {
      if (busStartRef.current >= 0) {
        const bt = t - busStartRef.current;
        if (bt < ARRIVE_SEC + STOP_SEC) {
          // 미끄러지듯 다가와 감속하며 정차
          bus.position.x = THREE.MathUtils.damp(bus.position.x, BUS_STOP_X, 2.2, delta);
        } else if (bt < ARRIVE_SEC + STOP_SEC + LEAVE_SEC) {
          // 천천히 출발해 점점 빠르게 떠남
          const p = (bt - ARRIVE_SEC - STOP_SEC) / LEAVE_SEC;
          bus.position.x = BUS_STOP_X + (BUS_GONE_X - BUS_STOP_X) * p * p;
        } else {
          // 다음 버스가 왼쪽에서 들어와 대기 위치로
          bus.position.x = BUS_RETURN_X;
          busStartRef.current = -1;
        }
      } else {
        bus.position.x = THREE.MathUtils.damp(bus.position.x, BUS_WAIT_X, 1.2, delta);
      }
      // 바닥 밖으로 나간 동안은 숨김
      bus.visible = bus.position.x > -4.6 && bus.position.x < 4.6;
    }

    // ② 히터 열기 구슬 (방석 위 0.5 ~ 1.1 m)
    heatVis.current = THREE.MathUtils.damp(heatVis.current, heaterOn ? 1 : 0, 3, delta);
    for (let i = 0; i < HEAT_BEADS.length; i++) {
      const obj = heatRefs.current[i];
      if (!obj) continue;
      const b = HEAT_BEADS[i];
      const phase = reduced ? b.offset : (t * 0.25 + b.offset) % 1;
      obj.position.set(b.x + (reduced ? 0 : Math.sin(t * 0.7 + i) * 0.02), 0.5 + phase * 0.6, b.z);
      obj.scale.setScalar(Math.max(0.001, heatVis.current * (1 - phase)));
    }

    // ③ 눈 (기온 22℃ 미만): 위에서 바닥까지 내려와 닿으면서 사라짐
    snowVis.current = THREE.MathUtils.damp(snowVis.current, cold ? 1 : 0, 2, delta);
    for (let i = 0; i < SNOW.length; i++) {
      const obj = snowRefs.current[i];
      if (!obj) continue;
      const s = SNOW[i];
      const y = reduced ? 0.2 + s.offset * 2.4 : 2.8 - ((t * s.speed + s.offset * 2.8) % 2.8);
      obj.position.set(s.x, y, s.z);
      obj.scale.setScalar(Math.max(0.001, snowVis.current * Math.min(1, y / 0.4)));
    }

    // ④ 가로등: 버스 1분 전이면 1초 간격 깜빡임
    const blinkOff = soon && Math.floor(t) % 2 === 1;
    if (lampMatRef.current) {
      lampMatRef.current.emissiveIntensity = blinkOff ? lampIntensity * 0.1 : lampIntensity;
    }
    if (lampLightRef.current) {
      lampLightRef.current.intensity = rgbOn && !blinkOff ? 2 : 0;
    }

    // ⑤ 열선 방석 발광 (히터)
    if (padMatRef.current) {
      padMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        padMatRef.current.emissiveIntensity,
        heaterOn ? 0.7 : 0,
        4,
        delta,
      );
    }

    // ⑥ [와! ①] heater 0 → 1 순간: 벤치 아래 따뜻한 빛 고리 (1.0초, 한 번)
    if (prevHeaterRef.current === false && heaterOn) heatPulseStart.current = t;
    prevHeaterRef.current = heaterOn;
    if (heatRingRef.current && heatRingMatRef.current) {
      const p = heatPulseStart.current < 0 ? 1 : (t - heatPulseStart.current) / HEAT_PULSE_SEC;
      if (p >= 1) {
        heatRingRef.current.visible = false;
        heatPulseStart.current = -1;
      } else {
        heatRingRef.current.visible = true;
        heatRingRef.current.scale.setScalar(0.3 + 1.1 * easeOut(p));
        heatRingMatRef.current.opacity = 0.55 * (1 - p);
      }
    }

    // ⑦ [와! ②] bus_eta 가 1 이하로 바뀌는 순간: 표지판 초록 빛 + 발밑 고리 (0.8초, 한 번)
    if (prevSoonRef.current === false && soon) busPulseStart.current = t;
    prevSoonRef.current = soon;
    const bp = busPulseStart.current < 0 ? 1 : (t - busPulseStart.current) / BUS_PULSE_SEC;
    if (signMatRef.current) {
      // 0 → 최고 → 0 으로 부드럽게 (사인 반주기)
      signMatRef.current.emissiveIntensity = bp >= 1 ? 0 : 0.8 * Math.sin(Math.PI * bp);
    }
    if (busRingRef.current && busRingMatRef.current) {
      if (bp >= 1) {
        busRingRef.current.visible = false;
        busPulseStart.current = -1;
      } else {
        busRingRef.current.visible = true;
        busRingRef.current.scale.setScalar(0.2 + 0.7 * easeOut(bp));
        busRingMatRef.current.opacity = 0.5 * (1 - bp);
      }
    }
  });

  return (
    <group>
      {/* 바닥: 앞쪽 도로 · 뒤쪽 인도 · 연석 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, ROAD_Z]} receiveShadow>
        <planeGeometry args={[7.4, 2]} />
        <meshStandardMaterial {...MAT.concrete} color={PALETTE.charcoal} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, SIDEWALK_Z]} receiveShadow>
        <planeGeometry args={[7.4, 4.6]} />
        <meshStandardMaterial {...MAT.concrete} />
      </mesh>
      <RoundedBox args={[7.4, 0.12, 0.16]} radius={0.02} position={[0, 0.06, CURB_Z]} receiveShadow>
        <meshStandardMaterial {...MAT.concrete} color={PALETTE.sand} />
      </RoundedBox>

      {/* 정류장: 금속 기둥 4개 + 유리 지붕 + 뒤 유리벽 + 노선도 */}
      <group position={[0, 0, SHELTER_Z]}>
        {[
          [-1.7, -0.7],
          [1.7, -0.7],
          [-1.7, 0.7],
          [1.7, 0.7],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 1.2, z]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 16]} />
            <meshStandardMaterial {...MAT.brushedMetal} />
          </mesh>
        ))}
        <RoundedBox args={[3.8, 0.06, 1.8]} radius={0.02} position={[0, 2.43, 0]}>
          <meshPhysicalMaterial {...MAT.glass} />
        </RoundedBox>
        <RoundedBox args={[3.3, 1.8, 0.03]} radius={0.01} position={[0, 1.2, -0.7]}>
          <meshPhysicalMaterial {...MAT.glass} />
        </RoundedBox>
        <RoundedBox args={[0.9, 1.2, 0.03]} radius={0.01} position={[-1.0, 1.25, -0.67]}>
          <meshStandardMaterial {...MAT.screen(PALETTE.linen)} />
        </RoundedBox>
      </group>

      {/* 벤치: 나무 살 + 금속 다리 + 열선 방석 (클릭 → 히터 30초) */}
      <HoverLift position={[BENCH_X, 0, BENCH_Z]} onClick={() => sendCommand('heater', true)}>
        {[-0.13, 0, 0.13].map((z) => (
          <RoundedBox key={z} args={[2.0, 0.035, 0.12]} radius={0.01} position={[0, 0.43, z]} castShadow>
            <meshStandardMaterial {...MAT.oak} />
          </RoundedBox>
        ))}
        <RoundedBox args={[1.8, 0.03, 0.36]} radius={0.01} position={[0, 0.462, 0]}>
          <meshStandardMaterial
            ref={padMatRef}
            {...MAT.linen}
            color={heaterOn ? PALETTE.alert : PALETTE.off}
            emissive={PALETTE.alert}
            emissiveIntensity={0}
          />
        </RoundedBox>
        <RoundedBox args={[2.0, 0.18, 0.03]} radius={0.01} position={[0, 0.7, -0.19]} castShadow>
          <meshStandardMaterial {...MAT.oak} />
        </RoundedBox>
        {[-0.85, 0.85].map((x) => (
          <group key={x}>
            <RoundedBox args={[0.05, 0.41, 0.38]} radius={0.015} position={[x, 0.205, 0]} castShadow>
              <meshStandardMaterial {...MAT.brushedMetal} />
            </RoundedBox>
            <RoundedBox args={[0.04, 0.4, 0.03]} radius={0.01} position={[x, 0.65, -0.19]}>
              <meshStandardMaterial {...MAT.brushedMetal} />
            </RoundedBox>
          </group>
        ))}
      </HoverLift>

      {/* [와! ①] 히터가 켜지는 순간 벤치 아래로 퍼지는 따뜻한 빛 고리 */}
      <mesh
        ref={heatRingRef}
        position={[BENCH_X, 0.012, BENCH_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.92, 1, 64]} />
        <meshStandardMaterial
          ref={heatRingMatRef}
          {...MAT.glow(PALETTE.alert, true)}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* 히터 열기 구슬 10개 */}
      <Instances limit={HEAT_BEADS.length} frustumCulled={false}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshStandardMaterial {...MAT.glow(PALETTE.alert, true)} />
        {HEAT_BEADS.map((b, i) => (
          <Instance
            key={i}
            ref={(el) => {
              heatRefs.current[i] = el as THREE.Object3D | null;
            }}
            position={[b.x, 0.5, b.z]}
            scale={0.001}
          />
        ))}
      </Instances>

      {/* 눈송이 20개 */}
      <Instances limit={SNOW.length} frustumCulled={false}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial {...MAT.matteWhite} />
        {SNOW.map((s, i) => (
          <Instance
            key={i}
            ref={(el) => {
              snowRefs.current[i] = el as THREE.Object3D | null;
            }}
            position={[s.x, 2, s.z]}
            scale={0.001}
          />
        ))}
      </Instances>

      {/* PIR 감지 표시등 (왼쪽 앞 기둥 위쪽) */}
      <group position={[-1.7, 2.15, -0.83]}>
        <RoundedBox args={[0.1, 0.1, 0.08]} radius={0.02}>
          <meshStandardMaterial {...MAT.matteWhite} />
        </RoundedBox>
        <mesh position={[0, 0, 0.05]}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial {...MAT.glow(PALETTE.warn, person)} />
        </mesh>
      </group>

      {/* 가로등 (오른쪽 연석 옆) — 기둥은 밝은 금속 */}
      <group position={[2.8, 0, 0.8]}>
        <RoundedBox args={[0.26, 0.1, 0.26]} radius={0.03} position={[0, 0.05, 0]}>
          <meshStandardMaterial {...MAT.concrete} />
        </RoundedBox>
        <mesh position={[0, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 2.7, 16]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
        <mesh position={[0, 2.84, 0]}>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshStandardMaterial ref={lampMatRef} {...lampGlow} />
        </mesh>
        <pointLight ref={lampLightRef} position={[0, 2.6, 0]} color={rgbColor} intensity={0} distance={5} decay={2} />
      </group>

      {/* 소품: 버스 정류장 표지판 (왼쪽 연석 옆) */}
      <group position={[SIGN_X, 0, SIGN_Z]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.2, 12]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
        <RoundedBox args={[0.5, 0.5, 0.04]} radius={0.015} position={[0, 2.0, 0.04]} castShadow>
          <meshStandardMaterial
            ref={signMatRef}
            {...MAT.ceramic}
            color={PALETTE.sage}
            emissive={PALETTE.ok}
            emissiveIntensity={0}
          />
        </RoundedBox>
        {/* [와! ②] '곧 도착' 순간 표지판 발밑에 퍼지는 초록 고리 */}
        <mesh ref={busRingRef} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshStandardMaterial
            ref={busRingMatRef}
            {...MAT.glow(PALETTE.ok, true)}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 소품: 휴지통 · 화분 */}
      <mesh position={[2.3, 0.35, -1.9]} castShadow>
        <cylinderGeometry args={[0.2, 0.18, 0.7, 20]} />
        <meshStandardMaterial {...MAT.brushedMetal} color={PALETTE.sage} />
      </mesh>
      <group position={[-2.7, 0, -2.6]}>
        <RoundedBox args={[0.6, 0.45, 0.6]} radius={0.05} position={[0, 0.225, 0]} castShadow>
          <meshStandardMaterial {...MAT.ceramic} color={PALETTE.clay} />
        </RoundedBox>
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial {...MAT.plant} />
        </mesh>
      </group>

      {/* 마스코트: 교복 학생이 정류장 앞 인도를 천천히 걸어 다님 */}
      <StudentChibi waypoints={WALK_PATH} name="버스 기다리는 학생" speed={0.3} pause={[2, 4]} isModalOpen={isModalOpen} />

      {/* 버스 (소형 셔틀 크기: 길이 3.2 · 높이 1.4) */}
      <group ref={busRef} position={[BUS_WAIT_X, 0, ROAD_Z]}>
        <RoundedBox args={[3.2, 1.4, 1.3]} radius={0.08} position={[0, 0.95, 0]} castShadow>
          <meshStandardMaterial {...MAT.matteWhite} color={PALETTE.sand} />
        </RoundedBox>
        <RoundedBox args={[2.7, 0.4, 1.32]} radius={0.02} position={[-0.1, 1.3, 0]}>
          <meshPhysicalMaterial {...MAT.glass} color={PALETTE.ink} />
        </RoundedBox>
        {[
          [-1.05, 0.62],
          [1.05, 0.62],
          [-1.05, -0.62],
          [1.05, -0.62],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.25, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.18, 20]} />
            <meshStandardMaterial {...MAT.rubber} color={PALETTE.ink} />
          </mesh>
        ))}
      </group>

      {/* 배지 ①② 지붕 위: 기온 · 버스 도착 */}
      <DataPin
        position={[-0.9, 2.46, SHELTER_Z]}
        label={cold ? '🌡 기온 · 추움' : '🌡 기온'}
        sensor={tempSensor}
        status={cold ? 'warn' : 'ok'}
        decimals={1}
        isModalOpen={isModalOpen}
      />
      <DataPin
        position={[0.9, 2.46, SHELTER_Z]}
        label="🚌 버스 도착까지"
        sensor={etaSensor}
        status={soon ? 'ok' : 'info'}
        decimals={0}
        isModalOpen={isModalOpen}
      />

      {/* 배지 ③ 벤치 히터 ON/OFF */}
      {!isModalOpen && (
        <Html position={[BENCH_X, 1.1, BENCH_Z]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div
            className={`px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap pointer-events-none ${
              heaterOn ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white/90 text-slate-600 border-slate-300'
            }`}
          >
            벤치 히터 {heaterOn ? 'ON' : 'OFF'}
          </div>
        </Html>
      )}

      {/* 배지 ④ 버스 1분 전 '곧 도착!' (정류장 표지판 위) */}
      {!isModalOpen && soon && (
        <Html position={[SIGN_X, 2.45, SIGN_Z]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div className="px-4 py-2 rounded-2xl border border-emerald-400 bg-emerald-50 text-emerald-700 text-sm font-bold whitespace-nowrap pointer-events-none">
            🚌 곧 도착!
          </div>
        </Html>
      )}
    </group>
  );
}
