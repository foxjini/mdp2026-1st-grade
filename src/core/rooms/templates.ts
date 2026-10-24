// 새 공간용 빈 템플릿 4종 + AI 바이브 코딩 프롬프트 생성
import { RoomMeta } from '../types/iot';

export function roomJsonTemplate(meta: RoomMeta): string {
  const { createdAt, updatedAt, hasNotification, ...rest } = meta;
  void createdAt;
  void updatedAt;
  void hasNotification;
  return JSON.stringify(
    {
      ...rest,
      customSensors: meta.customSensors.length
        ? meta.customSensors
        : [{ key: 'my_sensor', name: '우리 팀 센서', unit: '%', min: 0, max: 100 }],
    },
    null,
    2
  );
}

export function sceneTemplate(meta: RoomMeta): string {
  const key = meta.customSensors[0]?.key || 'my_sensor';
  return `// Scene.tsx — "${meta.name}" 3D 공간 (팀: ${meta.team || '미정'})
// 규칙: 허용 모듈만 import / export default 컴포넌트 1개 / <Canvas>·조명·카메라는 플랫폼이 제공
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSensor, useCustomValue, useServo, useRgb, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  const temp = useSensor('dht11_temp').value;
  const myValue = useCustomValue('${key}');
  const { angle } = useServo();
  const { color, on } = useRgb();
  const armRef = useRef<THREE.Mesh>(null);

  // SG90 각도(0~180°)에 맞춰 부드럽게 회전
  useFrame((_, delta) => {
    if (armRef.current) {
      armRef.current.rotation.y = THREE.MathUtils.damp(armRef.current.rotation.y, (angle / 180) * Math.PI, 5, delta);
    }
  });

  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color="#E2E8F0" />
      </mesh>

      {/* 서보 연동 오브젝트 (클릭하면 확장 명령 전송) */}
      <mesh ref={armRef} position={[0, 0.5, 0]} castShadow onClick={(e) => { e.stopPropagation(); sendCommand('toggle', true); }}>
        <boxGeometry args={[1.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>

      {/* RGB LED 연동 조명 */}
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color={on ? color : '#94A3B8'} emissive={on ? color : '#000000'} emissiveIntensity={on ? 1.5 : 0} />
      </mesh>
      {on && <pointLight position={[0, 2.2, 0]} color={color} intensity={1.2} distance={6} />}

      {/* 센서 값 배지 (모달이 열리면 숨김) */}
      {!isModalOpen && (
        <Html position={[0, 1.4, 0]} center zIndexRange={[10, 0]}>
          <div className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 shadow text-xs font-bold text-slate-800 whitespace-nowrap">
            온도 {temp.toFixed(1)}℃ · ${key} {myValue.toFixed(1)}
          </div>
        </Html>
      )}
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
  return `# code.py (팀 모듈) — "${meta.name}" / 팀: ${meta.team || '미정'}
# 전시용 통합 펌웨어가 이 파일을 teams/${meta.id}.py 로 불러옵니다.
# 기본 4종(DHT11·Cds·SG90·RGB LED)은 통합 펌웨어가 관리하므로 base 객체로만 사용하세요.
#   base.temperature(), base.humidity(), base.light()       # 센서 읽기
#   base.set_servo(angle), base.set_rgb("#RRGGBB", "ON")    # 액추에이터 제어
# 규칙: 확장 핀은 room.json "pins"에 선언한 핀만 사용 (GP15/16/18/19/20/26 사용 금지)
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
- 확장 센서(customSensors):
${sensors}
- 확장 핀(pins): ${meta.pins.length ? meta.pins.join(', ') : '없음'}

[우리 팀 아이디어]
${idea.trim() || '(여기에 프로젝트 주제와 3D 공간에서 보여주고 싶은 장면, 센서/액추에이터 역할을 적으세요)'}

[요청]
위 [플랫폼 컨텍스트]의 "공간 꾸러미 규격"을 지켜서 아래 4개 파일을 각각 완성된 코드 블록으로 작성해 주세요.
1. room.json  (id는 "${meta.id}" 그대로 유지)
2. Scene.tsx  (허용 모듈만 import, export default 컴포넌트)
3. mock.js    (module.exports = { tick, onCommand })
4. code.py    (팀 모듈: setup(base) / read(base) / handle(base, action, value))
플랫폼 원본 파일(src/, firmware/)은 수정하지 마세요.`;
}
