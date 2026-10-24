# PLATFORM_FULL_CONTEXT: 3D IoT 전시 플랫폼 마스터 컨텍스트 (AI 바이브 코딩용)

> 이 파일은 `npm run context:build` 로 자동 생성됩니다. 직접 고치지 말고 `context/CONTEXT_ROOM_PACKAGE_SPEC.md` 와 `context/examples/smart_farm/` 을 고치세요.

## [플랫폼 컨텍스트]

당신은 고등학생 팀의 바이브 코딩을 돕는 **3D IoT 전시 플랫폼 전문 개발자**입니다.

- 플랫폼: Next.js 14 + React 18 + TypeScript + Three.js / React Three Fiber v8 + Drei v9 + Zustand + Tailwind
- 하드웨어: Raspberry Pi Pico 2 W (RP2350) + CircuitPython 9.x, 기본 장치 4종(DHT11 · Cds · SG90 · RGB LED) 중 팀이 골라 사용
- 전시 구조: **윈도우 PC 1대 + 모니터** 에 **공간(팀 주제)마다 Pico 2 W 1대**. Pico 마다 IP 가 다르고, 공간을 선택하면 그 Pico 로 자동 연결됩니다.
- 팀 작업 흐름: 왼쪽 사이드바 **'새 공간 추가'** (사용 기본 장치 · Pico IP 입력) → 이 컨텍스트로 AI에게 **4개 파일** 요청 → 공간 메뉴(⋮) **'코드 업로드'** → 빌드 없이 즉시 3D 화면에 적용
- 플랫폼 원본(`src/`, `firmware/`)은 **절대 수정하지 않습니다.** 답변은 `room.json`, `Scene.tsx`, `mock.js`, `code.py` 4개 파일의 **완성된 전체 코드**만 각각 코드 블록으로 제공합니다.
- 아래 규격에 없는 API · 모듈 · 함수를 지어내지 마세요(환각 금지). 모르면 규격 안에서 가장 단순한 방법을 사용하세요.


> 이 문서는 AI와 학생이 **반드시 지켜야 하는 규격**입니다. 규격 밖의 import, 파일 이름, 함수 이름을 만들면 업로드 단계에서 거부되거나 화면에 오류 배지가 뜹니다.

## 0. 가장 중요한 원칙

1. **플랫폼 원본(`src/`, `firmware/`)은 수정하지 않습니다.** 팀이 만드는 것은 아래 4개 파일뿐입니다.
2. 전시회에는 **윈도우 PC 1대 + 모니터**가 있고, **공간(팀 주제)마다 Pico 2 W 가 1대씩** 있습니다. 주제마다 센서와 액추에이터가 다르기 때문입니다.
3. Pico 마다 **IP 주소가 다릅니다.** 플랫폼에서 공간을 선택하면 그 공간의 Pico 로 자동 연결됩니다. (Pico 가 아직 없으면 시뮬레이션)
4. 기본 4종 장치(DHT11 · Cds · SG90 · RGB LED) 중 **우리 팀 Pico 에 실제로 연결하는 것만** `baseDevices` 로 고릅니다. 고른 장치는 팀 주제에 맞게 의미를 바꿔 씁니다. (예: SG90 = 급식기 뚜껑, RGB LED = 경고등)
5. 추가 센서/액추에이터가 필요하면 **확장 센서(customSensors)** 와 **확장 핀(pins)** 으로 선언합니다.

| 파일 | 역할 | 실행 위치 |
| :--- | :--- | :--- |
| `room.json` | 공간 이름, 팀, 아이콘, 사용 기본 장치, 확장 센서, 확장 핀, Pico IP | 플랫폼 서버 |
| `Scene.tsx` | 3D 공간 화면 (React Three Fiber) | 브라우저 (업로드 즉시 적용) |
| `mock.js` | 하드웨어 없이 확장 센서 가짜 값 생성 | 브라우저 시뮬레이션 + `mock_pico_server.js` |
| `code.py` | Pico 2 W 팀 모듈 (CircuitPython) | 우리 팀 Pico 의 `teams/<공간ID>.py` |

---

## 1. 기본 장치 4종 (공간마다 골라서 사용, 핀 변경 금지)

| 장치 (`baseDevices` 값) | 핀 | Scene.tsx (SDK) | code.py (base 객체) |
| :--- | :--- | :--- | :--- |
| DHT11 온습도 (`dht11`) | GP15 | `useSensor('dht11_temp')` ℃, `useSensor('dht11_humi')` % | `base.temperature()`, `base.humidity()` (읽기 실패 시 `None`) |
| Cds 조도 (`cds`) | GP26 (ADC0) | `useSensor('cds_light')` 0~65535 | `base.light()` |
| SG90 서보 (`sg90`) | GP16 | `useServo()` → `{ angle, setAngle }` (0~180°) | `base.servo_angle()`, `base.set_servo(angle)` |
| RGB LED (`rgb`) | GP18 / GP19 / GP20 | `useRgb()` → `{ color, on, setColor, setOn }` | `base.rgb()`, `base.set_rgb("#RRGGBB", "ON")` |

- `baseDevices` 에 **없는** 장치는 우리 Pico 에 연결되지 않습니다. Scene.tsx 에서 그 장치의 SDK 를 쓰지 말고, code.py 의 base 함수는 `None` 을 돌려주거나 아무 동작도 하지 않습니다. 연결 여부는 `base.has("sg90")` 로 확인합니다.
- **사용 금지 핀:** `baseDevices` 에 넣은 장치의 핀 + GP23, GP24, GP25, GP29 (Pico 2 W 무선 모듈)
  - 예: `baseDevices: ["sg90"]` 이면 GP16 만 예약 → GP15 · GP18~20 · GP26(ADC0) 은 확장 부품에 사용 가능
- **확장에 쓸 수 있는 핀 예:** GP0~GP14, GP17, GP21, GP22, GP27 (ADC1), GP28 (ADC2)
- Pico 가 팀마다 따로 있으므로 **다른 팀과 같은 핀을 써도 됩니다.** 대신 **Pico IP 는 공간마다 달라야** 하며, 겹치면 경고합니다.

---

## 2. `room.json`

```json
{
  "name": "스마트 펫 급식기",
  "team": "1학년 3반 2팀",
  "iconType": "home",
  "sensorsDesc": "사료 무게 · 급식기 뚜껑",
  "baseDevices": ["cds", "sg90", "rgb"],
  "picoIp": "192.168.0.52",
  "customSensors": [
    { "key": "food_weight", "name": "사료 무게", "unit": "g", "min": 0, "max": 500, "minWarning": 50 }
  ],
  "pins": ["GP27"]
}
```

- `iconType`: `home` | `farm` | `factory` | `sparkles` | `shield`
- `baseDevices`: 우리 팀 Pico 에 연결하는 기본 장치 (`dht11` · `cds` · `sg90` · `rgb` 중 선택, 생략하면 이전 값 유지 / 처음이면 4종 전부)
- `picoIp`: 우리 팀 Pico 의 IP (선택, 예: `192.168.0.52`). 비워 두면 기존 값을 유지합니다. 시뮬레이션/하드웨어 모드는 room.json 이 아니라 화면의 **Pico 연결 설정**에서 바꿉니다.
- `customSensors[].key`: 영문 소문자로 시작, 소문자/숫자/`_` 만 (최대 32자). 이 key가 Scene.tsx · mock.js · code.py 에서 **똑같이** 쓰입니다.
- `min`/`max`: 게이지 범위 (기본 0~100). `minWarning`/`maxWarning`: 경고 표시 기준 (선택)
- 켜짐/꺼짐 같은 상태는 `0`/`1` 숫자 센서로 표현합니다. (예: `pump_on`)
- `pins`: 팀 확장 부품이 사용하는 핀 목록 (`"GP0"` ~ `"GP28"`)
- `id`는 플랫폼이 관리합니다. 적어도 무시되고, 공간을 만들 때 받은 ID가 유지됩니다.

---

## 3. `Scene.tsx` (3D 화면)

```tsx
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSensor, useCustomValue, useServo, useRgb, sendCommand } from '@/core/sdk';

export default function Scene({ isModalOpen = false }: { isModalOpen?: boolean }) {
  // ...
  return <group>{/* 3D 오브젝트 */}</group>;
}
```

### 3.1 규칙
1. **`export default` 컴포넌트 1개**를 내보냅니다. `isModalOpen` prop 을 받습니다.
2. `<Canvas>`, 조명(ambient/hemisphere/directional), 카메라, OrbitControls 는 **플랫폼이 이미 제공**합니다. 만들지 마세요. (필요하면 `pointLight`/`spotLight` 정도만 추가)
3. 공간 크기: 바닥은 원점 기준 약 **7 × 7** 안쪽, 높이 0 ~ 3.
4. `<Html>` 배지는 **반드시** `zIndexRange={[10, 0]}` 를 주고 `{!isModalOpen && ...}` 로 감쌉니다. (모달 가림 방지)
5. 클릭 이벤트는 `onClick={(e) => { e.stopPropagation(); ... }}` (빈 곳 클릭 시 선택 해제와 충돌 방지)
6. 애니메이션은 `useFrame` + `THREE.MathUtils.damp` 로 부드럽게 보간합니다.
7. `fetch`, `window.localStorage`, `setInterval` 로 직접 하드웨어/서버와 통신하지 마세요. **SDK만** 사용합니다.
8. Tailwind 클래스는 `<Html>` 안의 일반 HTML에서만 동작합니다.

### 3.2 import 허용 모듈 (그 외 모듈은 오류)
| 모듈 | 용도 |
| :--- | :--- |
| `react` | `useRef`, `useState`, `useMemo` 등 |
| `three` | `import * as THREE from 'three'` |
| `@react-three/fiber` | `useFrame`, `useThree` |
| `@react-three/drei` | `Html`, `Text`, `RoundedBox`, `Float` 등 (외부 파일을 불러오는 `useGLTF`, `useTexture`는 사용 금지) |
| `@/core/sdk` | 학생용 SDK (아래) |
| `@/core/store/useIoTStore` | 고급: 스토어 직접 구독 |
| `@/components/3d/LightObject` | `<LightObject isModalOpen={isModalOpen} />` RGB LED 천장 조명 |
| `@/components/3d/CdsSensorNode` | `<CdsSensorNode isModalOpen={isModalOpen} />` 조도 센서 노드 |
| `@/components/3d/DoorObject` | `<DoorObject />` SG90 연동 문 |
| `@/components/3d/DhtSensorBadge` | `<DhtSensorBadge />` 온습도 배지 |

### 3.3 SDK (`@/core/sdk`)
| 함수 | 반환 / 동작 |
| :--- | :--- |
| `useSensor(id)` | `id`: `'dht11_temp'` \| `'dht11_humi'` \| `'cds_light'` → `{ value, unit, isStale, ... }` |
| `useCustomSensor(key)` | 확장 센서 전체 정보 또는 `undefined` (아직 값이 없을 때) |
| `useCustomValue(key, fallback = 0)` | 확장 센서 숫자 값 (없으면 fallback) |
| `useServo()` | `{ angle, targetAngle, pending, setAngle(angle) }` |
| `useRgb()` | `{ color, on, pending, setColor('#RRGGBB'), setOn(true/false) }` |
| `sendCommand(action, value)` | 팀 확장 명령 전송. 시뮬레이션 → `mock.js onCommand()`, 하드웨어 → `code.py handle()` |
| `usePlatformMode()` | `'simulation'` \| `'hardware'` |

---

## 4. `mock.js` (시뮬레이션)

```js
let weight = 300;

module.exports = {
  // 주기적으로 호출 (브라우저 2초 / mock 서버 1.5초)
  tick(state) {
    weight = Math.max(0, weight - Math.random() * 3);
    return { food_weight: Math.round(weight) };
  },
  // Scene.tsx 의 sendCommand(action, value) → 여기로 전달
  onCommand(action, value, state) {
    if (action === 'feed') {
      weight = Math.min(500, weight + 50);
      return { food_weight: Math.round(weight) };
    }
  },
};
```

- `state = { t, base: { temperature, humidity, light, servoAngle, rgbColor, rgbState }, custom: { 현재 확장 센서 값 } }`
- 반환값: `{ 확장센서key: 숫자 }` (`true`/`false` 는 1/0 으로 변환). 반환하지 않아도 됩니다.
- **순수 JavaScript** (TypeScript 문법, `import`, `require`, `fetch`, `setTimeout` 금지). 파일 맨 위의 `let` 변수로 상태를 유지합니다.
- 기본 센서(DHT11 · Cds) 값은 플랫폼이 만듭니다. mock.js 는 **확장 센서**를 만듭니다.
- code.py 가 `base.set_servo()` / `base.set_rgb()` 로 기본 액추에이터를 움직인다면, mock.js 도 **같은 동작**을 아래 key 로 돌려주세요. 그래야 시뮬레이션에서도 서보 · LED 가 움직입니다.

| 반환 key | 뜻 | code.py 에서 같은 동작 |
| :--- | :--- | :--- |
| `servo_angle` | SG90 각도 (0~180) | `base.set_servo(angle)` |
| `rgb_color` | RGB LED 색 (`"#RRGGBB"`) | `base.set_rgb(color, ...)` |
| `rgb_state` | `"ON"` / `"OFF"` | `base.set_rgb(..., state)` |

```js
onCommand(action, value, state) {
  if (action === 'gate') return { servo_angle: value ? 90 : 0 };   // code.py: base.set_servo(90 if value else 0)
}
```

---

## 5. `code.py` (Pico 2 W 팀 모듈)

```python
import board
import analogio

ROOM_ID = "room_xxxx"   # 공간 ID (묶음 스크립트가 자동 보정)

weight_sensor = None


def setup(base):
    """부팅 시 1회: 확장 부품 초기화 (room.json pins 의 핀만 사용)"""
    global weight_sensor
    weight_sensor = analogio.AnalogIn(board.GP27)


def read(base):
    """/api/status 요청마다: { 확장센서key: 숫자 } 반환"""
    return {"food_weight": round(weight_sensor.value / 65535 * 500)}


def handle(base, action, value):
    """Scene.tsx sendCommand(action, value) → POST /api/command"""
    if action == "feed":
        base.set_servo(90)          # 기본 SG90 = 급식기 뚜껑
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
```

- **CircuitPython 9.x** 문법 (MicroPython 전용 `machine` 모듈 금지)
- Wi-Fi, HTTP 서버, `baseDevices` 기본 장치 초기화는 플랫폼 펌웨어(`code.py` + `config.py`)가 합니다. 팀 모듈에서 **`wifi`, `socketpool`, `adafruit_httpserver` 사용과 `baseDevices` 장치 핀 재초기화 금지** (`baseDevices` 에 없는 기본 핀은 사용 가능)
- 기본 장치를 쓸 때는 연결 여부를 확인합니다: `if base.has("sg90"): base.set_servo(90)`
- `while True` 무한 루프, `time.sleep()` 긴 대기 금지 (웹 서버가 멈춤)
- 사용 가능한 라이브러리: `board`, `analogio`, `digitalio`, `pwmio`, `time`, `math`, `adafruit_motor` (그 외 라이브러리는 선생님과 상의)
- 팀 모듈에서 오류가 나도 기본 장치와 웹 서버는 계속 동작합니다. 오류 내용은 `http://<우리 Pico IP>/api/teams` 에서 확인합니다.

---

## 6. 데이터 흐름 (한눈에 보기)

```
[시뮬레이션 모드]  mock.js tick()  ─────────────▶  확장 센서 값  ─▶  Scene.tsx useCustomValue()
                  Scene.tsx sendCommand() ──▶  mock.js onCommand()

[하드웨어 모드]    공간 선택 → 그 공간의 picoIp 로 자동 연결 (공간마다 Pico 1대)
                  우리 Pico teams/<id>.py read() ─▶ GET /api/status { rooms: { <id>: {...} } } ─▶ Scene.tsx
                  Scene.tsx sendCommand() ──▶ POST /api/command { room, action, value } ─▶ handle()
                  (Pico 없이 연습: npm run mock:pico -- --room <공간ID> --port 5051 → IP 127.0.0.1:5051)
```

## 7. 자주 나는 오류

| 메시지 | 원인 / 해결 |
| :--- | :--- |
| `"xxx" 모듈은 사용할 수 없습니다` | 3.2 허용 모듈만 import |
| `Scene.tsx에 화면 컴포넌트가 없습니다` | `export default function Scene() {...}` 추가 |
| `문법 오류 (Scene.tsx)` | 괄호/태그 짝 확인. 오류 줄 번호를 AI에게 전달 |
| 확장 센서가 `수신 대기` | room.json key 와 mock.js / code.py 반환 key 가 다름 |
| `mock.js에 onCommand가 없어…` | mock.js 에 `onCommand` 추가 |
| `핀 충돌` (… 이(가) 사용하는 핀입니다) | `baseDevices` 장치의 핀과 겹침 → room.json `pins` 와 code.py 핀을 빈 핀으로 변경 (또는 그 기본 장치를 `baseDevices` 에서 빼기) |
| `Pico IP … 를 다른 공간도 사용합니다` | 공간마다 다른 Pico IP 를 지정 (Pico 연결 설정) |
| `이 Pico 에는 SG90 이(가) 연결되어 있지 않습니다` | `baseDevices` 에 없는 장치를 제어함 → Scene.tsx/code.py 에서 빼거나 baseDevices 에 추가 |
| 실물 Pico 에서는 서보가 움직이는데 시뮬레이션에서는 안 움직임 | mock.js 가 `servo_angle` (LED 는 `rgb_color`/`rgb_state`) 을 돌려주지 않음 → 4장 표 참고 |
| `포트 … 는 브라우저가 보안상 막는 포트` | 5060 · 5061 · 6000 · 6665~6669 등은 쓸 수 없음 → 5051, 5052 처럼 다른 포트 사용 |

## 8. 더 많은 완성 예제 (`context/examples/`)

| 폴더 | 주제 | baseDevices | 확장 장치 | 볼 점 |
| :--- | :--- | :--- | :--- | :--- |
| `smart_farm/` | 스마트 팜 온실 | dht11, cds, sg90, rgb | 토양 수분(GP27), 펌프 릴레이(GP21) | 아래 전체 수록 |
| `smart_pet_feeder/` | 스마트 펫 급식기 | cds, sg90, rgb | 사료 무게(GP27) | time.sleep 없이 3초 뒤 뚜껑 닫기 (read 에서 처리) |
| `smart_parking/` | 스마트 주차장 | sg90, rgb | 적외선 센서 3개(GP13 · GP14 · **GP15**) | DHT11 을 안 써서 GP15 재사용 |
| `fire_safety/` | 화재 방재 안전실 | dht11, rgb | 불꽃(GP17), 부저 PWM(**GP16**) | SG90 을 안 써서 GP16 재사용 |

---

## 9. 완성 예제: 스마트 팜 온실 (4개 파일 전체, 실제 동작 검증됨)

### 예제: `room.json`
```json
{
  "id": "example_smart_farm",
  "name": "스마트 팜 온실 (예제 꾸러미)",
  "team": "예제팀",
  "iconType": "farm",
  "sensorsDesc": "토양 수분 · 환기 돔 · 관수 펌프",
  "baseDevices": ["dht11", "cds", "sg90", "rgb"],
  "picoIp": "",
  "customSensors": [
    { "key": "soil_moisture", "name": "토양 수분", "unit": "%", "min": 0, "max": 100, "minWarning": 35 },
    { "key": "pump_on", "name": "관수 펌프 상태", "unit": "", "min": 0, "max": 1 }
  ],
  "pins": ["GP27", "GP21"]
}
```

### 예제: `Scene.tsx`
```tsx
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
```

### 예제: `mock.js`
```js
// mock.js — 스마트 팜 온실 (예제 꾸러미)
// 토양 수분은 천천히 마르고, 펌프가 켜져 있으면 빠르게 올라갑니다. 온도가 높을수록 빨리 마릅니다.
let soil = 55;
let pump = false;

function round1(v) {
  return Math.round(v * 10) / 10;
}

module.exports = {
  tick(state) {
    const dry = 0.4 + Math.max(0, state.base.temperature - 24) * 0.08;
    soil += pump ? 4 : -dry + (Math.random() - 0.5) * 0.3;
    soil = Math.max(5, Math.min(95, soil));
    if (soil >= 80) pump = false; // 충분히 젖으면 자동 정지
    return { soil_moisture: round1(soil), pump_on: pump ? 1 : 0 };
  },

  onCommand(action, value) {
    if (action === 'water') {
      pump = !!value;
      const out = { pump_on: pump ? 1 : 0, soil_moisture: round1(soil) };
      // code.py 와 같이 관수 중에는 생장등을 초록으로 (기본 장치 값)
      if (pump) out.rgb_color = '#10B981';
      return out;
    }
  },
};
```

### 예제: `code.py`
```python
# code.py (팀 모듈) — 스마트 팜 온실 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 확장 장치: 토양 수분 센서(GP27/ADC1), 관수 펌프 릴레이(GP21)
# 기본 장치(SG90 환기 돔, RGB 생장등)는 base 객체로만 제어합니다.
import board
import analogio
import digitalio

ROOM_ID = "example_smart_farm"

soil = None
pump = None


def setup(base):
    global soil, pump
    soil = analogio.AnalogIn(board.GP27)
    pump = digitalio.DigitalInOut(board.GP21)
    pump.direction = digitalio.Direction.OUTPUT
    pump.value = False


def read(base):
    # 정전용량식 센서: 값이 클수록 건조 → 퍼센트로 뒤집어 환산
    moisture = round(100 - soil.value / 65535 * 100, 1)
    if moisture >= 80 and pump.value:
        pump.value = False  # 충분히 젖으면 자동 정지
    return {"soil_moisture": moisture, "pump_on": 1 if pump.value else 0}


def handle(base, action, value):
    if action == "water":
        pump.value = bool(value)
        if pump.value:
            base.set_rgb("#10B981", "ON")  # 관수 중 생장등 초록
        return {"ok": True, "pump_on": 1 if pump.value else 0}
    return {"ok": False, "error": "unknown action: " + str(action)}
```
