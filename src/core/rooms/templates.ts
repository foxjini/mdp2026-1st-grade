// 새 공간용 빈 템플릿 4종 + AI 바이브 코딩 프롬프트 생성
import { BASE_DEVICE_INFO, RoomMeta } from '../types/iot';

export function roomJsonTemplate(meta: RoomMeta): string {
  // mode 는 화면의 'Pico 연결 설정'에서만 바꾸므로 템플릿에서 제외
  // (서버가 기록하는 업로드 시각 · 예제 표시도 제외)
  const { createdAt, updatedAt, hasNotification, mode, roomJsonUploadedAt, example, exampleHash, ...rest } = meta;
  void [createdAt, updatedAt, hasNotification, mode, roomJsonUploadedAt, example, exampleHash];
  return JSON.stringify(
    {
      ...rest,
      // SG90 을 쓰면 이 공간에서 부르는 이름 (인스펙터 · 음성 안내에 표시)
      ...(meta.baseDevices.includes('sg90') ? { servoName: meta.servoName || '서보모터' } : {}),
      customSensors: meta.customSensors.length
        ? meta.customSensors
        : [{ key: 'my_sensor', name: '우리 팀 센서', unit: '%', min: 0, max: 100 }],
    },
    null,
    2
  );
}

export function sceneTemplate(meta: RoomMeta): string {
  const def = meta.customSensors[0];
  const key = def?.key || 'my_sensor';
  const label = def?.name || '확장 센서';
  return `// Scene.tsx — "${meta.name}" 3D 공간 (팀: ${meta.team || '미정'})
// 규칙: 허용 모듈만 import / export default 컴포넌트 1개 / <Canvas>·조명·카메라·환경광은 플랫폼이 제공
// 디자인 킷: PALETTE(차분한 색) · MAT(PBR 재질) · HoverLift(부드러운 호버) · DataPin(데이터 배지) · useSmoothValue
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useSensor, useCustomSensor, useServo, useRgb, sendCommand, MAT, PALETTE, HoverLift, DataPin } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const temp = useSensor('dht11_temp');
  const mySensor = useCustomSensor('${key}');
  const { angle } = useServo();
  const { color, on } = useRgb();
  const armRef = useRef<THREE.Group>(null);

  // SG90 각도(0~180°)에 맞춰 감쇠(damp)로 부드럽게 회전 (튕김 없음)
  useFrame((_, delta) => {
    if (armRef.current) {
      armRef.current.rotation.y = THREE.MathUtils.damp(armRef.current.rotation.y, (angle / 180) * Math.PI, 5, delta);
    }
  });

  return (
    <group>
      {/* 바닥: 오크 마루 + 러그 (넓은 면은 차분한 색) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial {...MAT.oak} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial {...MAT.linen} />
      </mesh>

      {/* 서보 연동 오브젝트: 마우스를 올리면 살짝 떠오르고, 클릭하면 확장 명령 */}
      <HoverLift position={[0, 0, 0]} onClick={() => sendCommand('toggle', true)}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.42, 0.6, 32]} />
          <meshStandardMaterial {...MAT.ceramic} />
        </mesh>
        <group ref={armRef} position={[0, 0.66, 0]}>
          <RoundedBox args={[1.4, 0.12, 0.22]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial {...MAT.brushedMetal} />
          </RoundedBox>
        </group>
      </HoverLift>

      {/* RGB LED: 켜지면 발광(고급 그래픽에서 은은한 빛 번짐) */}
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial {...MAT.glow(color, on)} />
      </mesh>
      {on && <pointLight position={[0, 2.2, 0]} color={color} intensity={1.2} distance={6} />}

      {/* 데이터 핀: 값 · 상태(색 + 글자) · 수신 대기를 자동으로 (모달이 열리면 숨김) */}
      <DataPin position={[-1.2, 0, 0.6]} label="온도" sensor={temp} isModalOpen={isModalOpen} />
      <DataPin position={[1.2, 0, 0.6]} label="${label}" sensor={mySensor} isModalOpen={isModalOpen} />

      {/* 벽 · 가구는 PALETTE 의 차분한 색, 강조색(PALETTE.ok/warn/alert)은 상태 표시에만 */}
      <mesh position={[0, 1.5, -3.4]} receiveShadow>
        <boxGeometry args={[7, 3, 0.12]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.92} />
      </mesh>
    </group>
  );
}
`;
}

export function mockTemplate(meta: RoomMeta): string {
  const key = meta.customSensors[0]?.key || 'my_sensor';
  return `// mock.js — "${meta.name}" 시뮬레이션용 가짜 센서 (브라우저 + mock_pico_server.js 공용)
// state = { t: 경과초, base: { temperature, humidity, light, servoAngle, rgbColor, rgbState }, custom: { 현재 확장 센서 값 } }
// tick()과 onCommand()는 { 확장센서key: 숫자 } 객체를 반환합니다. (key = room.json customSensors.key)
let value = 50;

module.exports = {
  // 2초(브라우저) / 1.5초(mock 서버)마다 호출
  tick(state) {
    value = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 3));
    return { ${key}: Math.round(value * 10) / 10 };
  },

  // 3D 화면에서 sendCommand(action, value) 호출 시 실행
  onCommand(action, cmdValue, state) {
    if (action === 'toggle') {
      value = Math.min(100, value + 20);
      return { ${key}: Math.round(value * 10) / 10 };
    }
  },
};
`;
}

export function codePyTemplate(meta: RoomMeta): string {
  const key = meta.customSensors[0]?.key || 'my_sensor';
  const pin = meta.pins[0] || 'GP27';
  const reserved = meta.baseDevices.flatMap((d) => BASE_DEVICE_INFO[d].pins);
  return `# code.py (팀 모듈) — "${meta.name}" / 팀: ${meta.team || '미정'}
# 우리 팀 전용 Pico 2 W 의 펌웨어가 이 파일을 teams/${meta.id}.py 로 불러옵니다.
# 이 Pico 에 연결한 기본 장치: ${meta.baseDevices.join(', ') || '없음'} → 펌웨어가 관리하므로 base 객체로만 사용하세요.
#   base.temperature(), base.humidity(), base.light()       # 센서 읽기 (연결 안 된 장치는 None)
#   base.set_servo(angle), base.set_rgb("#RRGGBB", "ON")    # 액추에이터 제어 (연결 안 된 장치는 무시)
#   base.has("sg90")                                        # 기본 장치 연결 여부
# 규칙: 확장 핀은 room.json "pins"에 선언한 핀만 사용${reserved.length ? ` (${reserved.join('/')} 사용 금지)` : ''}
import board
import analogio

ROOM_ID = "${meta.id}"

sensor = None


def setup(base):
    """부팅 시 1회 실행: 확장 센서/액추에이터 초기화"""
    global sensor
    sensor = analogio.AnalogIn(board.${pin})


def read(base):
    """/api/status 요청마다 실행: { 확장센서key: 숫자 } 반환"""
    return {"${key}": round(sensor.value / 65535 * 100, 1)}


def handle(base, action, value):
    """3D 화면의 sendCommand(action, value) → POST /api/command 처리"""
    if action == "toggle":
        if base.has("sg90"):
            base.set_servo(90 if base.servo_angle() < 90 else 0)
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
`;
}

export function buildVibePrompt(meta: RoomMeta, platformContext: string, idea: string): string {
  const sensors = meta.customSensors.length
    ? meta.customSensors.map((s) => `  - ${s.key}: ${s.name} (${s.unit}, ${s.min ?? 0}~${s.max ?? 100})`).join('\n')
    : '  - (아직 없음: 필요하면 room.json customSensors에 추가)';
  return `${platformContext.trim()}

==================================================
[우리 팀 공간 정보]
- 공간 ID: ${meta.id}
- 공간 이름: ${meta.name}
- 팀: ${meta.team || '미정'}
- 설명: ${meta.sensorsDesc}
- 우리 팀 Pico 2 W: ${meta.picoIp || 'IP 미지정'} (공간마다 Pico 1대)
- 연결한 기본 장치(baseDevices): ${
    meta.baseDevices.length
      ? meta.baseDevices.map((d) => `${d}(${BASE_DEVICE_INFO[d].name} ${BASE_DEVICE_INFO[d].pins.join('/')})`).join(', ')
      : '없음'
  }
  → 목록에 없는 기본 장치는 Scene.tsx / code.py 에서 사용하지 말고, 그 핀은 확장 부품에 써도 됩니다.${
    meta.baseDevices.includes('sg90') ? `\n- SG90 서보모터 이름(servoName): ${meta.servoName || '(아이디어에 맞게 정해 room.json servoName 에 적기)'}` : ''
  }
- 확장 센서(customSensors):
${sensors}
- 확장 핀(pins): ${meta.pins.length ? meta.pins.join(', ') : '없음'}

[우리 팀 아이디어]
${idea.trim() || '(여기에 프로젝트 주제와 3D 공간에서 보여주고 싶은 장면, 센서/액추에이터 역할을 적으세요)'}

[요청]
위 [플랫폼 컨텍스트]의 "공간 꾸러미 규격"을 지켜서 아래 4개 파일을 각각 완성된 코드 블록으로 작성해 주세요.
1. room.json  (id는 "${meta.id}" 그대로, baseDevices 는 실제로 연결할 기본 장치만)
2. Scene.tsx  (허용 모듈만 import, export default 컴포넌트)
3. mock.js    (module.exports = { tick, onCommand })
4. code.py    (팀 모듈: setup(base) / read(base) / handle(base, action, value))
플랫폼 원본 파일(src/, firmware/)은 수정하지 마세요.`;
}
