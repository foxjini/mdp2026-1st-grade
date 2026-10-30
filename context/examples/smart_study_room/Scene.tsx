// Scene.tsx — 스마트 독서실 (집중 학습 도우미) · 기본 예제
// · 바닥: 밝은 오크 마루 6m × 5m, 벽은 뒤쪽(-z) · 왼쪽(-x)에만
// · 가운데: 칸막이 1인용 독서실 책상 4개 (2×2) + 의자 · 스탠드 · 책
// · 뒤쪽 벽: 환기창 (SG90 각도만큼 위쪽 경첩 기준으로 안쪽으로 열림, 클릭 → sendCommand('window'))
//            + 창 위 벽 브래킷 집중 상태등 (RGB LED 색을 그대로 표시)
// · 왼쪽 벽: 소음 미터 패널 (소음 dB 막대) + 휴식 버튼 (클릭 → sendCommand('break', true))
//   (아이디어에는 '오른쪽 벽'이었지만, 카메라 시점 때문에 오른쪽 벽은 만들지 않으므로 왼쪽 벽으로 옮겼습니다)
// · 마스코트: 교복 입은 학생이 책상 묶음 둘레를 천천히 걸어 다님 (누르면 멈춰서 손 인사)
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Instances, Instance } from '@react-three/drei';
import { StudentChibi } from '@/components/3d/characters';
import {
  useSensor,
  useCustomSensor,
  useCustomValue,
  useServo,
  useRgb,
  sendCommand,
  MAT,
  PALETTE,
  DataPin,
  HoverLift,
  useSmoothValue,
} from '@/core/sdk';

// ── 책상 배치 (2 × 2). side = 가운데 칸막이 쪽 방향 (+1 이면 오른쪽, -1 이면 왼쪽) ──
const DESKS = [
  { x: -0.47, z: -1.1, side: 1, books: 3 },
  { x: 0.47, z: -1.1, side: -1, books: 2 },
  { x: -0.47, z: 0.5, side: 1, books: 2 },
  { x: 0.47, z: 0.5, side: -1, books: 3 },
];

const BOOK_COLORS = [PALETTE.clay, PALETTE.sage, PALETTE.sand, PALETTE.walnut, PALETTE.linen];

// v3 수정: ① 큰 화분을 앞쪽에서 뒤-왼쪽 구석으로 옮겨 주인공(책상)이 가리지 않게
//          ② 배지를 책상 한가운데에서 바깥쪽으로 옮겨 겹침 줄임
//          ③ 소음 미터 · 휴식 버튼을 키우고 밝은 재질로, 창 구멍 뒤에 바깥 풍경 패널 추가 (하얀 구멍 방지)

// 소음 미터 막대 (30 ~ 90 dB → 0 ~ 1.1 m)
const METER_H = 1.1;
const METER_BOTTOM = -0.55;
const dbToY = (db: number) => METER_BOTTOM + ((db - 30) / 60) * METER_H;

// 학생 마스코트 산책 길 (책상 묶음 x ±0.95 · z -1.4 ~ 1.2, 수납장 · 화분을 피함)
const STUDENT_PATH: [number, number][] = [
  [-1.5, 1.7],
  [1.5, 1.7],
  [1.6, -1.65],
  [-1.5, -1.7],
];

// 한 사람용 독서실 책상 + 의자 (mesh 6개)
function StudyDesk({ x, z, side }: { x: number; z: number; side: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* 상판 (윗면 높이 0.75) */}
      <RoundedBox args={[0.9, 0.03, 0.6]} radius={0.01} position={[0, 0.735, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.walnut} />
      </RoundedBox>
      {/* 바깥쪽 다리 판 */}
      <RoundedBox args={[0.03, 0.72, 0.6]} radius={0.01} position={[-side * 0.435, 0.36, 0]} castShadow>
        <meshStandardMaterial {...MAT.walnut} />
      </RoundedBox>
      {/* 가운데 칸막이 (흡음 패브릭, 책상 위로 0.45 m) */}
      <RoundedBox args={[0.03, 1.2, 0.6]} radius={0.01} position={[side * 0.435, 0.6, 0]} castShadow>
        <meshStandardMaterial {...MAT.linen} color={PALETTE.sage} />
      </RoundedBox>
      {/* 앞쪽 칸막이 */}
      <RoundedBox args={[0.9, 1.2, 0.03]} radius={0.01} position={[0, 0.6, -0.285]} castShadow>
        <meshStandardMaterial {...MAT.linen} color={PALETTE.sage} />
      </RoundedBox>
      {/* 의자 좌판 (높이 0.45) */}
      <RoundedBox args={[0.44, 0.05, 0.42]} radius={0.02} position={[0, 0.425, 0.45]} castShadow>
        <meshStandardMaterial {...MAT.linen} color={PALETTE.clay} />
      </RoundedBox>
      {/* 의자 등받이 */}
      <RoundedBox args={[0.42, 0.4, 0.04]} radius={0.015} position={[0, 0.69, 0.65]} castShadow>
        <meshStandardMaterial {...MAT.linen} color={PALETTE.clay} />
      </RoundedBox>
    </group>
  );
}

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const sashRef = useRef<THREE.Group>(null);
  const barRef = useRef<THREE.Mesh>(null);

  // ── 센서 · 장치 ──
  const tempSensor = useSensor('dht11_temp');
  const humiSensor = useSensor('dht11_humi');
  const lightSensor = useSensor('cds_light');
  const noiseSensor = useCustomSensor('noise');
  const noise = useCustomValue('noise', 40);
  const breakOn = useCustomValue('break_on', 0) > 0.5;
  const { angle } = useServo();
  const { color: rgbColor, on: rgbOn } = useRgb();

  const temp = tempSensor.value;
  const humi = humiSensor.value;
  const light = lightSensor.value;

  // 소음 단계 (규칙 1) — 화면에는 지금 단계의 색 하나만
  const noiseStatus: 'ok' | 'warn' | 'alert' = noise >= 60 ? 'alert' : noise >= 50 ? 'warn' : 'ok';
  const noiseColor = PALETTE[noiseStatus];
  const noiseLabel = breakOn
    ? '휴식 시간 (10초)'
    : noise >= 60
      ? '조용히 해 주세요'
      : noise >= 50
        ? '소음 주의'
        : '소음 · 집중하기 좋음';

  // 환기창: SG90 0° = 닫힘, 90° = 활짝 열림 → 창 회전 0 ~ 약 52°
  const windowOpen = angle >= 45;
  const sashTarget = (Math.min(90, Math.max(0, angle)) / 90) * 0.9;

  // 센서 값이 끊겨도 마지막 값 유지
  const noiseSmooth = useSmoothValue(noiseSensor?.value, { lambda: 3, initial: 40 });

  useFrame((_, delta) => {
    // 환기창: 위쪽 경첩을 축으로 아래쪽이 방 안쪽(+z)으로 열림
    if (sashRef.current) {
      sashRef.current.rotation.x = THREE.MathUtils.damp(sashRef.current.rotation.x, -sashTarget, 4, delta);
    }
    // 소음 미터 막대: 부드럽게 오르내림
    if (barRef.current) {
      const db = THREE.MathUtils.clamp(noiseSmooth.current, 30, 90);
      const h = Math.max(0.02, ((db - 30) / 60) * METER_H);
      barRef.current.scale.y = h;
      barRef.current.position.y = METER_BOTTOM + h / 2;
    }
  });

  return (
    <group>
      {/* ── 바닥: 밝은 오크 마루 6m × 5m ── */}
      <RoundedBox args={[6, 0.04, 5]} radius={0.015} position={[0, -0.02, 0]} receiveShadow>
        <meshStandardMaterial {...MAT.oak} />
      </RoundedBox>
      {/* 책상 아래 러그 */}
      <RoundedBox args={[2.6, 0.01, 3.3]} radius={0.004} position={[0, 0.005, -0.25]} receiveShadow>
        <meshStandardMaterial {...MAT.linen} color={PALETTE.sand} />
      </RoundedBox>

      {/* ── 뒤쪽 벽 (창 구멍을 남기고 4조각) : 창 구멍 x -0.7~0.7, y 1.3~2.3 ── */}
      <mesh position={[-1.85, 1.4, -2.55]} receiveShadow>
        <boxGeometry args={[2.3, 2.8, 0.1]} />
        <meshStandardMaterial {...MAT.plaster} color={PALETTE.wall} />
      </mesh>
      <mesh position={[1.85, 1.4, -2.55]} receiveShadow>
        <boxGeometry args={[2.3, 2.8, 0.1]} />
        <meshStandardMaterial {...MAT.plaster} color={PALETTE.wall} />
      </mesh>
      <mesh position={[0, 0.65, -2.55]} receiveShadow>
        <boxGeometry args={[1.4, 1.3, 0.1]} />
        <meshStandardMaterial {...MAT.plaster} color={PALETTE.wall} />
      </mesh>
      <mesh position={[0, 2.55, -2.55]} receiveShadow>
        <boxGeometry args={[1.4, 0.5, 0.1]} />
        <meshStandardMaterial {...MAT.plaster} color={PALETTE.wall} />
      </mesh>
      {/* 창 바깥 풍경 (창 구멍이 하얗게 비어 보이지 않도록, 은은한 초록 정원색) */}
      <mesh position={[0, 1.8, -2.62]}>
        <planeGeometry args={[1.5, 1.1]} />
        <meshStandardMaterial {...MAT.screen(PALETTE.sage)} />
      </mesh>
      {/* ── 왼쪽 벽 ── */}
      <mesh position={[-3.05, 1.4, -0.05]} receiveShadow>
        <boxGeometry args={[0.1, 2.8, 5.1]} />
        <meshStandardMaterial {...MAT.plaster} color={PALETTE.wall} />
      </mesh>

      {/* ── 환기창 (SG90) : 클릭하면 열기/닫기 ── */}
      <RoundedBox args={[2.0, 0.04, 0.16]} radius={0.015} position={[0, 1.28, -2.44]} castShadow>
        <meshStandardMaterial {...MAT.oak} />
      </RoundedBox>
      <HoverLift position={[0, 2.3, -2.47]} onClick={() => sendCommand('window', !windowOpen)}>
        <group ref={sashRef}>
          <mesh position={[0, -0.48, 0]}>
            <boxGeometry args={[1.28, 0.88, 0.01]} />
            <meshPhysicalMaterial {...MAT.glass} />
          </mesh>
          <RoundedBox args={[1.36, 0.05, 0.04]} radius={0.01} position={[0, -0.025, 0]}>
            <meshStandardMaterial {...MAT.walnut} />
          </RoundedBox>
          <RoundedBox args={[1.36, 0.05, 0.04]} radius={0.01} position={[0, -0.935, 0]}>
            <meshStandardMaterial {...MAT.walnut} />
          </RoundedBox>
          <RoundedBox args={[0.05, 0.96, 0.04]} radius={0.01} position={[-0.655, -0.48, 0]}>
            <meshStandardMaterial {...MAT.walnut} />
          </RoundedBox>
          <RoundedBox args={[0.05, 0.96, 0.04]} radius={0.01} position={[0.655, -0.48, 0]}>
            <meshStandardMaterial {...MAT.walnut} />
          </RoundedBox>
        </group>
      </HoverLift>

      {/* ── 집중 상태등 (RGB LED) : 창 위 벽 브래킷 조명 ── */}
      <RoundedBox args={[1.0, 0.08, 0.06]} radius={0.02} position={[0, 2.55, -2.47]}>
        <meshStandardMaterial {...MAT.brushedMetal} />
      </RoundedBox>
      <mesh position={[0, 2.55, -2.43]}>
        <boxGeometry args={[0.9, 0.035, 0.03]} />
        <meshStandardMaterial {...MAT.glow(rgbColor, rgbOn)} />
      </mesh>
      <pointLight position={[0, 2.35, -2.1]} color={rgbColor} intensity={rgbOn ? 1.2 : 0} distance={4.5} decay={2} />

      {/* ── 소음 미터 패널 (왼쪽 벽) ── */}
      <group position={[-2.98, 1.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* 밝은 오크 테두리 + 숯색 화면 → 두 그래픽 모드 모두 대비가 뚜렷하게 */}
        <RoundedBox args={[0.7, 1.4, 0.05]} radius={0.02} castShadow>
          <meshStandardMaterial {...MAT.oak} />
        </RoundedBox>
        <mesh position={[0, 0, 0.026]}>
          <planeGeometry args={[0.52, 1.22]} />
          <meshStandardMaterial {...MAT.screen(PALETTE.charcoal)} />
        </mesh>
        {/* 50 dB · 60 dB 눈금 (60 dB 가 경고선이라 더 굵게) */}
        <mesh position={[0, dbToY(50), 0.03]}>
          <boxGeometry args={[0.44, 0.008, 0.004]} />
          <meshStandardMaterial {...MAT.ceramic} color={PALETTE.sand} />
        </mesh>
        <mesh position={[0, dbToY(60), 0.03]}>
          <boxGeometry args={[0.44, 0.016, 0.004]} />
          <meshStandardMaterial {...MAT.ceramic} color={PALETTE.linen} />
        </mesh>
        {/* 소음 막대 (높이는 useFrame 에서 조절) */}
        <mesh ref={barRef} position={[0, METER_BOTTOM + 0.1, 0.035]}>
          <boxGeometry args={[0.26, 1, 0.012]} />
          <meshStandardMaterial {...MAT.glow(noiseColor, true)} />
        </mesh>
      </group>

      {/* ── 휴식 버튼 (왼쪽 벽) : 클릭 → 10초 휴식 ── */}
      <HoverLift position={[-2.98, 1.2, 1.05]} rotation={[0, Math.PI / 2, 0]} onClick={() => sendCommand('break', true)}>
        <RoundedBox args={[0.38, 0.38, 0.04]} radius={0.015}>
          <meshStandardMaterial {...MAT.oak} />
        </RoundedBox>
        <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.05, 32]} />
          {breakOn ? (
            <meshStandardMaterial {...MAT.glow(PALETTE.info, true)} />
          ) : (
            <meshStandardMaterial {...MAT.ceramic} color={PALETTE.sage} />
          )}
        </mesh>
      </HoverLift>

      {/* ── 주인공: 독서실 책상 4개 (2×2) ── */}
      {DESKS.map((d, i) => (
        <StudyDesk key={i} x={d.x} z={d.z} side={d.side} />
      ))}

      {/* 의자 기둥 · 받침 (Instances 로 묶음) */}
      <Instances limit={4}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 12]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.22, d.z + 0.45]} />
        ))}
      </Instances>
      <Instances limit={4}>
        <cylinderGeometry args={[0.22, 0.22, 0.03, 24]} />
        <meshStandardMaterial {...MAT.rubber} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x, 0.025, d.z + 0.45]} />
        ))}
      </Instances>

      {/* 스탠드 (받침 · 기둥 · 갓) */}
      <Instances limit={4}>
        <cylinderGeometry args={[0.07, 0.08, 0.02, 20]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x - d.side * 0.3, 0.76, d.z - 0.18]} />
        ))}
      </Instances>
      <Instances limit={4}>
        <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x - d.side * 0.3, 0.97, d.z - 0.18]} />
        ))}
      </Instances>
      <Instances limit={4}>
        <cylinderGeometry args={[0.035, 0.09, 0.1, 20]} />
        <meshStandardMaterial {...MAT.ceramic} />
        {DESKS.map((d, i) => (
          <Instance key={i} position={[d.x - d.side * 0.3, 1.2, d.z - 0.18]} />
        ))}
      </Instances>

      {/* 책 (책상마다 2~3권, 칸막이 쪽에 세워 둠) — 책마다 색은 Instance color */}
      <Instances limit={12}>
        <boxGeometry args={[1, 1, 1]} />
        {/* Instance color 와 곱해지므로 재질 색은 흰색으로 둡니다 */}
        <meshStandardMaterial {...MAT.linen} color="#FFFFFF" />
        {DESKS.flatMap((d, i) =>
          Array.from({ length: d.books }, (_, j) => (
            <Instance
              key={`${i}-${j}`}
              position={[d.x + d.side * (0.37 - j * 0.045), 0.86, d.z - 0.15]}
              scale={[0.035, 0.22 - j * 0.02, 0.16]}
              color={BOOK_COLORS[(i + j) % BOOK_COLORS.length]}
            />
          )),
        )}
      </Instances>

      {/* ── 소품: 오른쪽 뒤 수납장 ── */}
      <RoundedBox args={[0.9, 0.85, 0.4]} radius={0.03} position={[2.2, 0.425, -2.28]} castShadow receiveShadow>
        <meshStandardMaterial {...MAT.oak} />
      </RoundedBox>

      {/* ── 소품: 뒤-왼쪽 구석 화분 (앞쪽에 있으면 책상을 가려서 구석으로 옮김) ── */}
      <group position={[-2.5, 0, -2.05]}>
        <mesh position={[0, 0.19, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.14, 0.38, 24]} />
          <meshStandardMaterial {...MAT.ceramic} color={PALETTE.clay} />
        </mesh>
        <mesh position={[0, 0.62, 0]} castShadow>
          <sphereGeometry args={[0.27, 20, 20]} />
          <meshStandardMaterial {...MAT.plant} />
        </mesh>
        <mesh position={[0.1, 0.86, 0.04]} castShadow>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial {...MAT.plant} />
        </mesh>
      </group>

      {/* ── 데이터 배지 (5개) ── */}
      {/* 1. 소음 (규칙 1, 휴식 중에는 휴식 표시) */}
      <DataPin
        position={[-2.95, 2.15, 0]}
        label={noiseLabel}
        sensor={noiseSensor}
        status={breakOn ? 'info' : noiseStatus}
        isModalOpen={isModalOpen}
      />
      {/* 2. 온도 (규칙 2: 27℃ 이상이면 환기) */}
      <DataPin
        position={[1.95, 0.85, -2.2]}
        label={temp >= 27 ? '온도 · 환기 필요' : '실내 온도'}
        sensor={tempSensor}
        status={temp >= 27 ? 'warn' : 'ok'}
        isModalOpen={isModalOpen}
      />
      {/* 3. 습도 */}
      <DataPin
        position={[-2.45, 1.04, -2.0]}
        label={humi < 30 || humi > 70 ? '습도 · 쾌적하지 않음' : '실내 습도'}
        sensor={humiSensor}
        status={humi < 30 || humi > 70 ? 'warn' : 'ok'}
        isModalOpen={isModalOpen}
      />
      {/* 4. 책상 밝기 (규칙 3) */}
      <DataPin
        position={[0.86, 0.75, 0.74]}
        label={light < 20000 ? '스탠드를 켜세요' : '책상 밝기'}
        sensor={lightSensor}
        status={light < 20000 ? 'warn' : 'ok'}
        isModalOpen={isModalOpen}
      />
      {/* 5. 환기창 */}
      <DataPin
        position={[0.92, 1.3, -2.42]}
        label={windowOpen ? '환기창 열림' : '환기창 닫힘'}
        value={Math.round(angle)}
        unit="°"
        status={windowOpen ? 'ok' : 'off'}
        isModalOpen={isModalOpen}
      />

      {/* ── 마스코트: 교복 입은 여학생 (플랫폼 캐릭터 부품), 누르면 독서실 상태 안내 ── */}
      <StudentChibi
        waypoints={STUDENT_PATH}
        name="독서실 학생"
        say={() =>
          breakOn
            ? '지금은 쉬는 시간이에요. 스트레칭 하고 와요!'
            : `쉿, 공부 중이에요. 지금 소음은 ${Math.round(noise)}데시벨, 온도는 ${tempSensor.value.toFixed(0)}도예요.`
        }
        isModalOpen={isModalOpen}
      />
    </group>
  );
}
